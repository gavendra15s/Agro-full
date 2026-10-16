import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { computeBookingQuote, createBookingWithEscrow } from "../services/bookingService.js";
import { createRazorpayOrder, verifyRazorpaySignature, verifyRazorpayWebhookSignature } from "../services/paymentService.js";
import { supabase, safeInsert } from "../config/supabase.js";
import { ENV } from "../config/env.js";

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { farm_id, stay_start_date, stay_end_date, total_guests } = req.body;

  if (!farm_id || !stay_start_date || !stay_end_date) {
    res.status(400).json({ success: false, error: "farm_id, stay_start_date, and stay_end_date are required" });
    return;
  }

  const quote = await computeBookingQuote(farm_id, stay_start_date, stay_end_date, total_guests || 1);

  const order = await createRazorpayOrder({
    amountInRupees: quote.total_charged,
    receipt: `AGS-${Date.now()}`,
    notes: {
      farm_id: String(farm_id),
      guest_id: String(req.user?.id || ""),
      stay_start_date,
      stay_end_date,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: ENV.RAZORPAY_KEY_ID,
      quote,
    },
  });
};

export const verifyAndCreateBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const guest_id = req.user?.id;
  if (!guest_id) {
    res.status(401).json({ success: false, error: "Access token missing or invalid" });
    return;
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    farm_id,
    stay_start_date,
    stay_end_date,
    total_guests,
    cab_pickup_location,
    cab_pincode,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ success: false, error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" });
    return;
  }

  if (!farm_id || !stay_start_date || !stay_end_date) {
    res.status(400).json({ success: false, error: "farm_id, stay_start_date, and stay_end_date are required" });
    return;
  }

  const isValid = verifyRazorpaySignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    res.status(400).json({ success: false, error: "Payment verification failed. Signature mismatch." });
    return;
  }

  const result = await createBookingWithEscrow({
    guest_id,
    farm_id,
    stay_start_date,
    stay_end_date,
    total_guests: total_guests || 1,
    gateway_ref: razorpay_payment_id,
    razorpay_order_id,
    cab_pickup_location,
    cab_pincode,
  });

  res.status(201).json({ success: true, data: result });
};

/**
 * Razorpay Webhook Endpoint: Listens for asynchronous payment transitions.
 * Essential for UPI / Netbanking where the user pays on phone app or closes browser tab.
 */
export const handleRazorpayWebhook = async (req: any, res: Response): Promise<void> => {
  const signature = (req.headers["x-razorpay-signature"] as string) || "";
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const isValid = verifyRazorpayWebhookSignature({
    rawBody,
    signature,
    webhookSecret: ENV.RAZORPAY_WEBHOOK_SECRET,
  });

  if (!isValid && ENV.NODE_ENV === "production") {
    res.status(400).json({ success: false, error: "Invalid webhook signature" });
    return;
  }

  const event = req.body;
  const eventType = event.event;

  console.log(`[Razorpay Webhook] Received: ${eventType} (Event ID: ${event.id || "N/A"})`);

  if (eventType === "payment.captured") {
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (orderId || paymentId) {
      const { data: payment } = await supabase
        .from("payments")
        .select("*, bookings(*)")
        .or(`razorpay_order_id.eq.${orderId},gateway_ref.eq.${paymentId}`)
        .single();

      if (payment) {
        // Secure funds in Escrow Vault
        await supabase
          .from("payments")
          .update({
            escrow_status: "Held_In_Escrow",
            gateway_ref: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (payment.booking_id) {
          await supabase
            .from("bookings")
            .update({
              current_status: "Confirmed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.booking_id);

          await supabase
            .from("availability")
            .update({ status: "booked" })
            .eq("held_by_booking_id", payment.booking_id);
        }

        await safeInsert("payment_transaction_log", {
          payment_id: payment.id,
          transaction_type: "Charge",
          payment_gateway_ref: paymentId,
          amount: payment.total_charged || paymentEntity.amount / 100,
          note: `Webhook payment.captured: Funds locked in AgroSafe Escrow Vault.`,
        });
      }
    }
  } else if (eventType === "payment.failed") {
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (orderId) {
      const { data: payment } = await supabase
        .from("payments")
        .select("*, bookings(*)")
        .eq("razorpay_order_id", orderId)
        .single();

      if (payment && payment.booking_id) {
        await supabase
          .from("bookings")
          .update({ current_status: "Cancelled", updated_at: new Date().toISOString() })
          .eq("id", payment.booking_id)
          .eq("current_status", "Held");

        await supabase.from("availability").delete().eq("held_by_booking_id", payment.booking_id);
      }
    }
  } else if (eventType === "refund.processed") {
    const refundEntity = event.payload?.refund?.entity;
    const paymentId = refundEntity?.payment_id;

    if (paymentId) {
      const { data: payment } = await supabase.from("payments").select("*").eq("gateway_ref", paymentId).single();

      if (payment) {
        await supabase
          .from("payments")
          .update({
            escrow_status: "Refunded_To_Guest",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        await safeInsert("payment_transaction_log", {
          payment_id: payment.id,
          transaction_type: "Refund",
          payment_gateway_ref: refundEntity.id || paymentId,
          amount: refundEntity.amount ? refundEntity.amount / 100 : payment.total_charged,
          note: "Webhook refund.processed: Zero-fee weather refund released from Escrow Vault to traveler.",
        });
      }
    }
  }

  res.status(200).json({ success: true, received: true, event: eventType });
};

