import { supabase, safeInsert, isLiveSupabaseConfigured } from "../config/supabase.js";
import { createNotification } from "./notificationService.js";
import { sendHostBookingEmail, sendAdminPaymentEmail } from "./emailService.js";

const PLATFORM_FEE_RATE = 0.05;
const DEFAULT_NIGHTLY_RATE = 4500;
const DEFAULT_MAX_GUESTS = 10;

/**
 * Total guests already booked on this farm for any date range that overlaps
 * [stay_start_date, stay_end_date). Cancelled bookings don't hold a seat.
 */
export const getBookedGuestsForRange = async (
  farm_id: number,
  stay_start_date: string,
  stay_end_date: string
): Promise<number> => {
  if (!isLiveSupabaseConfigured()) {
    return 0;
  }
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("total_guests")
      .eq("farm_id", farm_id)
      .neq("current_status", "Cancelled")
      .lt("stay_start_date", stay_end_date)
      .gt("stay_end_date", stay_start_date);

    if (error) return 0;
    return (data || []).reduce((sum: number, b: any) => sum + (b.total_guests || 0), 0);
  } catch {
    return 0;
  }
};

/**
 * Server-computed quote — never trust a client-supplied amount for what gets charged.
 * Also the single seat-capacity gate: throws (409) if the requested headcount
 * doesn't fit what's left for these dates. Every booking path (direct create,
 * Razorpay order, Razorpay verify) routes through this, so they can't disagree.
 */
export const computeBookingQuote = async (
  farm_id: number,
  stay_start_date: string,
  stay_end_date: string,
  total_guests: number = 1
) => {
  const start = new Date(stay_start_date);
  const end = new Date(stay_end_date);
  const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const guests = Math.max(1, Math.floor(total_guests) || 1);

  let nightlyRate = DEFAULT_NIGHTLY_RATE;
  let maxGuests = DEFAULT_MAX_GUESTS;
  if (isLiveSupabaseConfigured()) {
    try {
      const { data: farm } = await supabase.from("farms").select("nightly_rate, max_guests").eq("id", farm_id).single();
      if (farm) {
        nightlyRate = farm.nightly_rate ?? DEFAULT_NIGHTLY_RATE;
        maxGuests = farm.max_guests ?? DEFAULT_MAX_GUESTS;
      }
    } catch {
      // fallback to defaults
    }
  }

  const bookedGuests = await getBookedGuestsForRange(farm_id, stay_start_date, stay_end_date);
  const availableSeats = Math.max(0, maxGuests - bookedGuests);

  if (guests > availableSeats) {
    const err: any = new Error(
      availableSeats > 0
        ? `Only ${availableSeats} seat${availableSeats === 1 ? "" : "s"} available for these dates.`
        : "No seats available for these dates."
    );
    err.status = 409;
    throw err;
  }

  // Priced per night, per person.
  const stay_amount = nightlyRate * nights * guests;
  const platform_fee = Math.round(stay_amount * PLATFORM_FEE_RATE);
  const total_charged = stay_amount + platform_fee;

  return { nights, guests, nightlyRate, maxGuests, availableSeats, stay_amount, platform_fee, total_charged };
};

// Notifies the host + admin that a booking/payment landed. Best-effort: must never fail the booking itself.
async function dispatchBookingSideEffects(params: {
  bookingId: number;
  hostId: number;
  hostEmail?: string;
  hostName: string;
  guestName: string;
  guestEmail?: string;
  farmTitle: string;
  bookingCode: string;
  paymentCode: string;
  stayStartDate: string;
  stayEndDate: string;
  totalGuests: number;
  totalCharged: number;
  gatewayRef: string;
  cab?: { pickupLocation: string; pincode: string };
}) {
  const guestNoun = params.totalGuests > 1 ? "guests" : "guest";

  await createNotification({
    user_id: params.hostId,
    related_booking_id: params.bookingId,
    notification_type: "Push",
    title: `New Booking: ${params.farmTitle}`,
    message_content: `${params.guestName} booked "${params.farmTitle}" for ${params.stayStartDate} to ${params.stayEndDate} (${params.totalGuests} ${guestNoun}). Ref ${params.bookingCode}. ₹${params.totalCharged.toLocaleString("en-IN")} is held in escrow until checkout.`,
    severity: "info",
  });

  if (params.hostEmail) {
    await sendHostBookingEmail(params.hostEmail, params.hostName, {
      guestName: params.guestName,
      farmTitle: params.farmTitle,
      bookingCode: params.bookingCode,
      stayStartDate: params.stayStartDate,
      stayEndDate: params.stayEndDate,
      totalGuests: params.totalGuests,
      stayAmount: params.totalCharged,
    });
  }

  await sendAdminPaymentEmail({
    bookingCode: params.bookingCode,
    paymentCode: params.paymentCode,
    guestName: params.guestName,
    guestEmail: params.guestEmail || "unknown",
    hostName: params.hostName,
    farmTitle: params.farmTitle,
    totalCharged: params.totalCharged,
    gatewayRef: params.gatewayRef,
    cab: params.cab,
  });
}

/**
 * Creates a 15-minute hold on a farm's availability for a guest (State machine: Draft -> Held).
 * Prevents double-booking by locking the dates in the availability table.
 */
export const createBookingHold = async (data: {
  guest_id: number;
  farm_id: number;
  stay_start_date: string;
  stay_end_date: string;
  total_guests: number;
}) => {
  const quote = await computeBookingQuote(
    data.farm_id,
    data.stay_start_date,
    data.stay_end_date,
    data.total_guests
  );

  const holdDurationMinutes = 15;
  const holdExpiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000).toISOString();
  const booking_code = `AGS-${Math.floor(Math.random() * 90000 + 10000)}`;

  // 1. Insert Booking in Held state
  const { data: booking, error: bErr } = await safeInsert<any>("bookings", {
    booking_code,
    guest_id: data.guest_id,
    farm_id: data.farm_id,
    stay_start_date: data.stay_start_date,
    stay_end_date: data.stay_end_date,
    total_guests: data.total_guests,
    current_status: "Held",
    hold_expires_at: holdExpiresAt,
  });

  if (bErr || !booking) throw new Error(bErr?.message || "Failed to create booking hold");

  // 2. Mark dates as held in availability table
  const start = new Date(data.stay_start_date);
  const end = new Date(data.stay_end_date);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split("T")[0];
    await safeInsert("availability", {
      farm_id: data.farm_id,
      date: dStr,
      status: "held",
      price: quote.nightlyRate,
      held_until: holdExpiresAt,
      held_by_booking_id: booking.id,
    });
  }

  // 3. Log status
  await safeInsert("booking_status_log", {
    booking_id: booking.id,
    previous_status: "Draft",
    new_status: "Held",
    reason: `15-minute hold initiated for checkout payment window`,
  });

  return { booking, hold_expires_at: holdExpiresAt, quote };
};

export const createBookingWithEscrow = async (data: {
  guest_id: number;
  farm_id: number;
  stay_start_date: string;
  stay_end_date: string;
  total_guests: number;
  gateway_ref?: string;
  razorpay_order_id?: string;
  cab_pickup_location?: string;
  cab_pincode?: string;
}) => {
  const booking_code = `AGS-${Math.floor(Math.random() * 90000 + 10000)}`;
  const payment_code = `PAY-${Math.floor(Math.random() * 90000 + 10000)}`;

  const cab =
    data.cab_pickup_location && data.cab_pincode
      ? { pickupLocation: data.cab_pickup_location, pincode: data.cab_pincode }
      : undefined;

  const { stay_amount, platform_fee, total_charged, nightlyRate } = await computeBookingQuote(
    data.farm_id,
    data.stay_start_date,
    data.stay_end_date,
    data.total_guests
  );

  const gateway_ref = data.gateway_ref || `rzp_live_${Math.floor(Math.random() * 900000000 + 100000000)}`;

  // 1. Insert Booking in Confirmed state
  const { data: booking, error: bErr } = await safeInsert<any>("bookings", {
    booking_code,
    guest_id: data.guest_id,
    farm_id: data.farm_id,
    stay_start_date: data.stay_start_date,
    stay_end_date: data.stay_end_date,
    total_guests: data.total_guests,
    current_status: "Confirmed",
  });

  if (bErr || !booking) throw new Error(bErr?.message || "Failed to create booking");

  // 2. Mark availability as booked
  const start = new Date(data.stay_start_date);
  const end = new Date(data.stay_end_date);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split("T")[0];
    await safeInsert("availability", {
      farm_id: data.farm_id,
      date: dStr,
      status: "booked",
      price: nightlyRate,
      held_by_booking_id: booking.id,
    });
  }

  // 3. Insert Payment & Lock in Escrow
  const { data: payment, error: pErr } = await safeInsert<any>("payments", {
    payment_code,
    booking_id: booking.id,
    stay_amount,
    platform_fee,
    total_charged,
    escrow_status: "Held_In_Escrow",
    gateway_ref,
    razorpay_order_id: data.razorpay_order_id || null,
  });

  if (pErr || !payment) throw new Error(pErr?.message || "Failed to record escrow payment");

  // 4. Log initial transaction
  await safeInsert("payment_transaction_log", {
    payment_id: payment.id,
    transaction_type: "Charge",
    payment_gateway_ref: gateway_ref,
    amount: total_charged,
    note: "Initial booking charge authorized & funds locked in AgroSafe Escrow Vault.",
  });

  // 5. Log booking status transition
  await safeInsert("booking_status_log", {
    booking_id: booking.id,
    previous_status: "Held",
    new_status: "Confirmed",
    reason: "Escrow payment captured & verified",
  });

  // 6. Notify host + admin (best-effort, must not fail the booking)
  try {
    const { data: full } = await supabase
      .from("bookings")
      .select("*, farms(title, host_id, users(first_name, last_name, email)), users(first_name, last_name, email)")
      .eq("id", booking.id)
      .single();

    if (full?.farms?.host_id) {
      const host = full.farms.users;
      const guest = full.users;
      await dispatchBookingSideEffects({
        bookingId: booking.id,
        hostId: full.farms.host_id,
        hostEmail: host?.email,
        hostName: host?.first_name || "Host",
        guestName: guest ? `${guest.first_name} ${guest.last_name}`.trim() : "A guest",
        guestEmail: guest?.email,
        farmTitle: full.farms.title,
        bookingCode: booking_code,
        paymentCode: payment_code,
        stayStartDate: data.stay_start_date,
        stayEndDate: data.stay_end_date,
        totalGuests: data.total_guests,
        totalCharged: total_charged,
        gatewayRef: gateway_ref,
        cab,
      });
    }
  } catch (err: any) {
    console.warn("[Booking] Failed to send booking notifications:", err.message);
  }

  return { booking, payment };
};

/**
 * Weather-Aware Rebooking: When risk level is Orange or Red 72 hours before trip,
 * the guest can change dates with zero cancellation fees.
 */
export const rescheduleBookingForWeather = async (
  bookingId: number | string,
  newStartDate: string,
  newEndDate: string,
  reason = "Weather-Aware Safety Reschedule (Orange/Red Hazard Window)"
) => {
  let booking: any = null;
  if (isLiveSupabaseConfigured()) {
    try {
      const { data, error: bErr } = await supabase
        .from("bookings")
        .select("*, farms(*)")
        .or(`id.eq.${bookingId},booking_code.eq.${bookingId}`)
        .single();
      if (!bErr && data) booking = data;
    } catch {}
  }

  if (!booking) {
    booking = {
      id: typeof bookingId === "number" ? bookingId : 101,
      booking_code: String(bookingId),
      farm_id: 1,
      total_guests: 2,
      stay_start_date: "2026-10-18",
      stay_end_date: "2026-10-20",
      farms: { title: "Pahadi Apple Orchard & Homestay" },
    };
  }

  // Verify availability on new dates
  const quote = await computeBookingQuote(booking.farm_id, newStartDate, newEndDate, booking.total_guests);

  const prevDates = `${booking.stay_start_date} to ${booking.stay_end_date}`;

  // Update booking dates
  let updated = { ...booking, stay_start_date: newStartDate, stay_end_date: newEndDate };
  if (isLiveSupabaseConfigured()) {
    try {
      const { data, error: uErr } = await supabase
        .from("bookings")
        .update({
          stay_start_date: newStartDate,
          stay_end_date: newEndDate,
          current_status: "Confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .select()
        .single();
      if (!uErr && data) updated = data;
    } catch {}
  }

  // Release old availability slots and mark new ones
  await supabase.from("availability").delete().eq("held_by_booking_id", booking.id);
  const start = new Date(newStartDate);
  const end = new Date(newEndDate);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().split("T")[0];
    await safeInsert("availability", {
      farm_id: booking.farm_id,
      date: dStr,
      status: "booked",
      price: quote.nightlyRate,
      held_by_booking_id: booking.id,
    });
  }

  // Log transition
  await safeInsert("booking_status_log", {
    booking_id: booking.id,
    previous_status: booking.current_status,
    new_status: "Confirmed",
    reason: `${reason}. Moved from [${prevDates}] to [${newStartDate} to ${newEndDate}]. Fees waived.`,
  });

  return { success: true, booking: updated };
};

export const listBookings = async (userId?: number, role?: string) => {
  let query = supabase
    .from("bookings")
    .select("*, farms(*, users(first_name, last_name, email)), payments(*), users(first_name, last_name, email, phone_number)");

  if (userId && role === "guest") {
    query = query.eq("guest_id", userId);
  } else if (userId && role === "host") {
    query = query.eq("farms.host_id", userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

