import type {
  Booking,
  Farm,
  FarmRiskOverview,
  HazardScore,
  IncidentReport,
  LandslideReport,
  MonthlySafetyRecord,
  NotificationLog,
  OfficialAlert,
  PaymentEscrow,
  SourceRun,
  Warning,
} from "@/lib/types";
import {
  BOOKINGS as FALLBACK_BOOKINGS,
  FARMS as FALLBACK_FARMS,
  LIVE_REPORTS as FALLBACK_REPORTS,
  MONTHLY_MATRIX as FALLBACK_MATRIX,
  NOTIFICATIONS as FALLBACK_NOTIFICATIONS,
  PAYMENT_ESCROWS as FALLBACK_ESCROWS,
  WARNINGS as FALLBACK_WARNINGS,
} from "@/lib/data/farms";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? "http://localhost:5000/api"
    : "http://127.0.0.1:5000/api");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("agrosafe_token");
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; count?: number; error?: string; message?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || `HTTP error ${res.status}` };
    }
    return json;
  } catch (err: any) {
    console.warn(`[API] Request failed for ${url}:`, err.message);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// Data Normalizers
// -------------------------------------------------------------

export function normalizeFarm(raw: any): Farm {
  if (!raw) return FALLBACK_FARMS[0];
  const title = raw.title || raw.name || "Farmstay";
  const slug = raw.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const district = raw.district || "";
  const state = raw.state || "";
  const subDistrict = raw.subdistrict || raw.subDistrict || "";
  const location = `${subDistrict ? `${subDistrict}, ` : ""}${district}, ${state}`.trim();

  let hostName = "Host";
  if (raw.users) {
    hostName = `${raw.users.first_name || ""} ${raw.users.last_name || ""}`.trim();
  } else if (raw.host) {
    hostName = raw.host;
  }

  return {
    id: raw.id,
    slug,
    name: title,
    location: location || "India",
    state,
    district,
    subDistrict,
    category: raw.category || "Organic Farm",
    pricePerNight: Number(raw.nightly_rate ?? raw.pricePerNight ?? 4500),
    maxGuests: Number(raw.max_guests ?? raw.maxGuests ?? 10),
    safety: (raw.safety || "safe") as any,
    host: hostName || "Rohit Bisht",
    hostId: raw.host_id ? String(raw.host_id) : raw.hostId,
    summary: raw.description || raw.summary || "",
    images: Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images
      : [`https://picsum.photos/seed/${slug}/900/600`],
    amenities: Array.isArray(raw.amenities) && raw.amenities.length > 0
      ? raw.amenities
      : ["Organic Farm", "Rural Connect Wi-Fi", "Safety Monitoring", "Escrow Protection"],
    cancellationPolicy:
      raw.cancellation_policy ||
      raw.cancellationPolicy ||
      "Full refund if cancelled 48 hours prior to check-in. Safety-related cancellations are always 100% refundable.",
    emergencyContact:
      raw.emergency_contact ||
      raw.emergencyContact ||
      "On-site caretaker available 24/7.",
    regionalGuidelines:
      raw.regional_guidelines ||
      raw.regionalGuidelines ||
      "Stick to marked orchard paths. Respect the farming schedule.",
    latitude: raw.latitude !== undefined ? Number(raw.latitude) : undefined,
    longitude: raw.longitude !== undefined ? Number(raw.longitude) : undefined,
    usesFallbackCoords: raw.uses_fallback_coords ?? raw.usesFallbackCoords ?? false,
  };
}

export function normalizeBooking(raw: any): Booking {
  const farmInfo = raw.farms || {};
  const paymentInfo = raw.payments || {};
  const userInfo = raw.users || {};

  return {
    id: raw.booking_code || `AGS-${raw.id || "0000"}`,
    farmSlug: farmInfo.slug || raw.farmSlug || "green-valley-retreat",
    farmName: farmInfo.title || farmInfo.name || raw.farmName || "Farmstay",
    location: farmInfo.district && farmInfo.state
      ? `${farmInfo.district}, ${farmInfo.state}`
      : raw.location || "Uttarakhand",
    image: Array.isArray(farmInfo.images) && farmInfo.images[0]
      ? farmInfo.images[0]
      : raw.image || "https://picsum.photos/seed/green-valley/400/300",
    checkIn: raw.stay_start_date ? raw.stay_start_date.slice(0, 10) : raw.checkIn || "2026-09-15",
    checkOut: raw.stay_end_date ? raw.stay_end_date.slice(0, 10) : raw.checkOut || "2026-09-18",
    guests: Number(raw.total_guests ?? raw.guests ?? 2),
    total: Number(paymentInfo.total_charged ?? raw.total ?? 13950),
    status: (raw.current_status?.toLowerCase() || raw.status || "upcoming") as any,
    escrowStatus: paymentInfo.escrow_status || raw.escrowStatus || "Held_In_Escrow",
    guestName: userInfo.first_name ? `${userInfo.first_name} ${userInfo.last_name || ""}`.trim() : raw.guestName,
    guestEmail: userInfo.email || raw.guestEmail,
    guestPhone: userInfo.phone_number || raw.guestPhone,
  };
}

export function normalizeEscrow(raw: any): PaymentEscrow {
  const booking = raw.bookings || {};
  const farm = booking.farms || {};
  const user = booking.users || {};
  const rawTx = raw.payment_transaction_log || raw.transactions || [];
  const rawStatus = raw.statusHistory || [];

  return {
    paymentId: raw.payment_code || raw.paymentId || `PAY-${raw.id || "0000"}`,
    bookingId: booking.booking_code || raw.bookingId || `AGS-${raw.booking_id || "0000"}`,
    farmName: farm.title || farm.name || raw.farmName || "Farmstay",
    farmSlug: farm.slug || raw.farmSlug || "green-valley-retreat",
    guestName: user.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : raw.guestName || "Verified Guest",
    stayAmount: Number(raw.stay_amount ?? raw.stayAmount ?? 13500),
    platformFee: Number(raw.platform_fee ?? raw.platformFee ?? 450),
    totalCharged: Number(raw.total_charged ?? raw.totalCharged ?? 13950),
    escrowStatus: raw.escrow_status || raw.escrowStatus || "Held_In_Escrow",
    gatewayRef: raw.gateway_ref || raw.gatewayRef || "rzp_live_000000",
    stayStartDate: booking.stay_start_date ? booking.stay_start_date.slice(0, 10) : raw.stayStartDate || "2026-09-15",
    stayEndDate: booking.stay_end_date ? booking.stay_end_date.slice(0, 10) : raw.stayEndDate || "2026-09-18",
    transactions: rawTx.map((tx: any, i: number) => ({
      id: tx.id ? (typeof tx.id === "number" ? `TXN-${tx.id}` : tx.id) : `TXN-00${i + 1}`,
      paymentId: raw.payment_code || raw.paymentId || `PAY-${raw.id}`,
      transactionType: tx.transaction_type || tx.transactionType || "Charge",
      amount: Number(tx.amount || 0),
      gatewayRef: tx.payment_gateway_ref || tx.gatewayRef || "rzp_live_0000",
      processedAt: tx.processed_at ? tx.processed_at.slice(0, 16).replace("T", " ") : "2026-08-02 14:22",
      note: tx.note || "Transaction logged in AgroSafe Escrow Vault.",
    })),
    statusHistory: rawStatus.map((s: any, i: number) => ({
      id: s.id ? (typeof s.id === "number" ? `LOG-${s.id}` : s.id) : `LOG-00${i + 1}`,
      previousStatus: s.previous_status || s.previousStatus || "Pending",
      newStatus: s.new_status || s.newStatus || "Confirmed",
      reason: s.reason || "Status transition captured",
      changedAt: s.changed_at ? s.changed_at.slice(0, 16).replace("T", " ") : "2026-08-02 14:22",
    })),
  };
}

export function normalizeWarning(raw: any): Warning {
  const farm = raw.farms || {};
  return {
    id: raw.warning_code || raw.id || `WRN-${Date.now()}`,
    warningSource: raw.warning_source || raw.warningSource || "Automated_CNN",
    reportId: raw.report_id ? String(raw.report_id) : raw.reportId,
    hostId: raw.host_id ? String(raw.host_id) : raw.hostId,
    farmSlug: farm.slug || raw.farmSlug,
    farmName: farm.title || raw.farmName,
    epicenterLat: Number(raw.epicenter_lat ?? raw.epicenterLat ?? 30.55),
    epicenterLng: Number(raw.epicenter_lng ?? raw.epicenterLng ?? 79.56),
    impactRadiusKm: Number(raw.impact_radius_km ?? raw.impactRadiusKm ?? 15),
    issuedAt: raw.issued_at ? raw.issued_at.slice(0, 16).replace("T", " ") : raw.issuedAt || "2026-08-07 18:10",
    expiresAt: raw.expires_at ? raw.expires_at.slice(0, 16).replace("T", " ") : raw.expiresAt || "2026-08-14 18:10",
    status: raw.status || "Active",
    severity: raw.severity || "High",
    title: raw.title || "Hazard Alert",
    description: raw.description || "Active slope debris advisory.",
    affectedFarmsCount: Number(raw.affectedFarmsCount || (raw.impact_radius_km > 10 ? 2 : 1)),
    affectedBookingsCount: Number(raw.affectedBookingsCount || (raw.impact_radius_km > 10 ? 3 : 1)),
  };
}

export function normalizeReport(raw: any): LandslideReport & any {
  // If photo_url is a dead/revoked blob URL from a previous session, provide a realistic resilient image fallback
  let photo = raw.photo_url || raw.image_s3_url || raw.imageS3Url || null;
  if (photo && typeof photo === "string" && photo.startsWith("blob:")) {
    // Generate deterministic scenic hazard fallback for legacy test blobs
    const seedId = raw.id || raw.report_code || "landslide";
    photo = `https://picsum.photos/seed/landslide-${seedId}/800/600`;
  }

  return {
    ...raw,
    id: raw.id || raw.report_code || `LS-${Date.now()}`,
    report_code: raw.report_code || (raw.id ? `REP-2026-${raw.id}` : undefined),
    location: raw.location_name || raw.location || "Mountain Transit Corridor",
    location_name: raw.location_name || raw.location || "Mountain Transit Corridor",
    lat: Number(raw.latitude ?? raw.device_lat ?? raw.lat ?? 0),
    lng: Number(raw.longitude ?? raw.device_lng ?? raw.lng ?? 0),
    severity: raw.severity || "High",
    reportedAt: raw.reported_at || (raw.report_time ? raw.report_time.slice(0, 16).replace("T", " ") : raw.reportedAt || new Date().toISOString()),
    reported_at: raw.reported_at || raw.report_time || new Date().toISOString(),
    status: raw.status || (raw.processing_status === "Processed" ? "Verified via CNN" : "pending_moderation"),
    cnnConfidenceScore: raw.cnn_confidence_score ?? raw.cnnConfidenceScore ?? 0.85,
    uploadedBy: raw.uploaded_by || raw.uploadedBy || (raw.users ? `${raw.users.first_name || ""} ${raw.users.last_name || ""}`.trim() : "Citizen Reporter"),
    imageS3Url: photo,
    image_s3_url: photo,
    photo_url: photo,
    credibility_score: raw.credibility_score ?? (raw.cnn_confidence_score ? Math.round(raw.cnn_confidence_score * 100) : 75),
    score_band: raw.score_band || (raw.credibility_score >= 75 ? "high" : raw.credibility_score >= 50 ? "medium" : "low"),
    report_signals: raw.report_signals || [],
    claimed_type: raw.claimed_type || "Landslide",
    details: raw.details || "",
  };
}

export function normalizeMatrix(raw: any): MonthlySafetyRecord {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const m = Number(raw.month || 1);
  return {
    month: m,
    monthName: raw.monthName || months[m - 1] || "Month",
    year: Number(raw.year || 2026),
    district: raw.district || "Chamoli",
    state: raw.state || "Uttarakhand",
    safetyRating: raw.safety_rating || raw.safetyRating || "Safe",
    rainfallMm: Number(raw.rainfall_mm ?? raw.rainfallMm ?? 30),
    soilStabilityIndex: Number(raw.soil_stability_index ?? raw.soilStabilityIndex ?? 90),
    historicalLandslidesCount: Number(raw.historical_landslides_count ?? raw.historicalLandslidesCount ?? 0),
    activeOverrideAlert: raw.activeOverrideAlert ?? false,
  };
}

export function normalizeNotification(raw: any): NotificationLog {
  return {
    id: raw.id ? String(raw.id) : `NOTIF-${Date.now()}`,
    userId: raw.user_id ? String(raw.user_id) : raw.userId || "USR-GST-001",
    userRole: raw.user_role || raw.userRole || (raw.user_id === 2 ? "host" : "guest"),
    warningId: raw.warning_id ? `WRN-2026-0${raw.warning_id}` : raw.warningId,
    relatedBookingId: raw.related_booking_id ? `AGS-4821${raw.related_booking_id}` : raw.relatedBookingId,
    notificationType: raw.notification_type || raw.notificationType || "Push",
    title: raw.title || "Safety Update",
    messageContent: raw.message_content || raw.messageContent || "",
    isRead: Boolean(raw.is_read ?? raw.isRead ?? false),
    dispatchedAt: raw.dispatched_at ? raw.dispatched_at.slice(0, 16).replace("T", " ") : raw.dispatchedAt || "2026-08-07 18:12",
    severity: raw.severity || "info",
  };
}

// -------------------------------------------------------------
// API Client Interface
// -------------------------------------------------------------

export const api = {
  // 1. Farms
  farms: {
    async list(filters?: {
      state?: string;
      district?: string;
      subdistrict?: string;
      category?: string;
      host_id?: number | string;
    }): Promise<Farm[]> {
      const query = new URLSearchParams();
      if (filters?.host_id) query.set("host_id", String(filters.host_id));
      if (filters?.state) query.set("state", filters.state);
      if (filters?.district) query.set("district", filters.district);
      if (filters?.subdistrict) query.set("subdistrict", filters.subdistrict);
      if (filters?.category) query.set("category", filters.category);

      const res = await request<any[]>(`/farms?${query.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeFarm);
      }
      // Fallback only if backend offline
      return FALLBACK_FARMS.filter((f) => {
        if (filters?.host_id && String(f.hostId) !== String(filters.host_id)) return false;
        if (filters?.state && f.state.toLowerCase() !== filters.state.toLowerCase()) return false;
        if (filters?.district && f.district.toLowerCase() !== filters.district.toLowerCase()) return false;
        if (filters?.subdistrict && f.subDistrict.toLowerCase() !== filters.subdistrict.toLowerCase()) return false;
        if (filters?.category && f.category !== filters.category) return false;
        return true;
      });
    },

    async getBySlug(slug: string): Promise<Farm | null> {
      const res = await request<any>(`/farms/${slug}`);
      if (res.success && res.data) {
        return normalizeFarm(res.data);
      }
      return FALLBACK_FARMS.find((f) => f.slug === slug) || null;
    },

    async create(payload: {
      title: string;
      description: string;
      state: string;
      district: string;
      subdistrict?: string;
      category?: string;
      nightly_rate: number;
      max_guests?: number;
      latitude?: number;
      longitude?: number;
      images?: string[];
      amenities?: string[];
      cancellation_policy?: string;
      emergency_contact?: string;
      regional_guidelines?: string;
    }): Promise<{ success: boolean; farm?: Farm; error?: string }> {
      const res = await request<any>("/farms", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        return { success: true, farm: normalizeFarm(res.data) };
      }
      return { success: false, error: res.error || "Failed to create farm" };
    },

    /** Seats left on a farm for a given stay window. */
    async availability(
      slug: string,
      checkIn: string,
      checkOut: string
    ): Promise<{
      success: boolean;
      data?: { maxGuests: number; bookedGuests: number; availableSeats: number };
      error?: string;
    }> {
      const query = new URLSearchParams({ checkIn, checkOut });
      const res = await request<any>(`/farms/${slug}/availability?${query.toString()}`);
      if (res.success && res.data) {
        return {
          success: true,
          data: {
            maxGuests: Number(res.data.maxGuests ?? 10),
            bookedGuests: Number(res.data.bookedGuests ?? 0),
            availableSeats: Number(res.data.availableSeats ?? 10),
          },
        };
      }
      return { success: false, error: res.error || "Failed to check availability" };
    },

    /** Farmer-only: update the seat capacity on their own listing. */
    async updateCapacity(slug: string, max_guests: number): Promise<{ success: boolean; farm?: Farm; error?: string }> {
      const res = await request<any>(`/farms/${slug}/capacity`, {
        method: "PATCH",
        body: JSON.stringify({ max_guests }),
      });
      if (res.success && res.data) {
        return { success: true, farm: normalizeFarm(res.data) };
      }
      return { success: false, error: res.error || "Failed to update seat capacity" };
    },

    /** Multi-hazard risk overview (landslide, flood, cyclone, heat, thunderstorm). */
    async getRisk(slug: string, date?: string): Promise<{ success: boolean; data?: FarmRiskOverview; error?: string }> {
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await request<FarmRiskOverview>(`/farms/${slug}/risk${query}`);
      return res;
    },
  },

  // 2. Bookings
  bookings: {
    async list(): Promise<Booking[]> {
      const res = await request<any[]>("/bookings");
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeBooking);
      }
      return FALLBACK_BOOKINGS;
    },

    async create(payload: {
      farm_id: number;
      stay_start_date: string;
      stay_end_date: string;
      total_guests: number;
      gateway_ref?: string;
      cab_pickup_location?: string;
      cab_pincode?: string;
    }): Promise<{ success: boolean; data?: any; error?: string }> {
      const res = await request<any>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res;
    },

    /** 15-minute hold on seat availability before checkout completion. */
    async createHold(payload: {
      farm_id: number;
      stay_start_date: string;
      stay_end_date: string;
      total_guests: number;
      cab_pickup_location?: string;
      cab_pincode?: string;
    }): Promise<{ success: boolean; data?: any; error?: string }> {
      return await request<any>("/bookings/hold", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    /** Weather-aware zero-penalty rescheduling or cancellation. */
    async reschedule(
      id: number | string,
      payload: { new_start_date?: string; new_end_date?: string; cancel?: boolean; reason?: string }
    ): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
      return await request<any>(`/bookings/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // 2b. Payments (Razorpay)
  payments: {
    async createOrder(payload: {
      farm_id: number;
      stay_start_date: string;
      stay_end_date: string;
      total_guests: number;
    }): Promise<{
      success: boolean;
      data?: { order_id: string; amount: number; currency: string; key_id: string; quote: any };
      error?: string;
    }> {
      return await request<any>("/payments/razorpay/order", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async verify(payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      farm_id: number;
      stay_start_date: string;
      stay_end_date: string;
      total_guests: number;
      cab_pickup_location?: string;
      cab_pincode?: string;
    }): Promise<{ success: boolean; data?: any; error?: string }> {
      return await request<any>("/payments/razorpay/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // 3. Escrow
  escrow: {
    async list(): Promise<PaymentEscrow[]> {
      const res = await request<any[]>("/escrow");
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeEscrow);
      }
      return FALLBACK_ESCROWS;
    },

    async release(paymentId: number | string, note?: string): Promise<{ success: boolean; data?: any; error?: string }> {
      const numericId = typeof paymentId === "number" ? paymentId : parseInt(String(paymentId).replace(/\D/g, ""), 10) || 1;
      return await request<any>(`/escrow/${numericId}/release`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
    },

    async refund(paymentId: number | string, reason?: string): Promise<{ success: boolean; data?: any; error?: string }> {
      const numericId = typeof paymentId === "number" ? paymentId : parseInt(String(paymentId).replace(/\D/g, ""), 10) || 1;
      return await request<any>(`/escrow/${numericId}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
  },

  // 4. Warnings
  warnings: {
    async list(status?: string): Promise<Warning[]> {
      const query = status && status !== "all" ? `?status=${status}` : "";
      const res = await request<any[]>(`/warnings${query}`);
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeWarning);
      }
      return FALLBACK_WARNINGS.filter((w) => !status || status === "all" || w.status === status);
    },

    async create(payload: {
      farm_id?: number;
      title: string;
      description: string;
      severity?: string;
      epicenter_lat: number;
      epicenter_lng: number;
      impact_radius_km?: number;
      duration_hours?: number;
    }): Promise<{ success: boolean; warning?: Warning; error?: string }> {
      const res = await request<any>("/warnings/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        return { success: true, warning: normalizeWarning(res.data) };
      }
      return { success: false, error: res.error || "Failed to broadcast warning" };
    },

    async revoke(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
      return await request<any>(`/warnings/${id}/revoke`, {
        method: "POST",
      });
    },
  },

  // 5. Landslide Reports
  reports: {
    async list(): Promise<LandslideReport[]> {
      const res = await request<any[]>("/reports");
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeReport);
      }
      return [];
    },

    async create(payload: {
      image_s3_url?: string;
      photo_url?: string;
      latitude: number;
      longitude: number;
      location_name?: string;
      details?: string;
      claimed_type?: string;
      is_live_camera?: boolean;
    }): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
      const photo = payload.photo_url || payload.image_s3_url || "";
      return await request<any>("/reports", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          photo_url: photo,
          image_s3_url: photo,
        }),
      });
    },

    async getById(id: number | string): Promise<{ success: boolean; data?: IncidentReport; error?: string }> {
      return await request<IncidentReport>(`/reports/${id}`);
    },

    async submitDecision(
      id: number | string,
      decision: "Confirm" | "Reject",
      reason?: string
    ): Promise<{ success: boolean; data?: any; error?: string }> {
      return await request<any>(`/reports/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, reason }),
      });
    },
  },

  // 6. Safety & Matrix
  safety: {
    async matrix(district: string, year = 2026): Promise<MonthlySafetyRecord[]> {
      const res = await request<any[]>(`/safety/matrix?district=${encodeURIComponent(district)}&year=${year}`);
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeMatrix);
      }
      return FALLBACK_MATRIX.filter((m) => m.district.toLowerCase() === district.toLowerCase());
    },

    async query(params: {
      state: string;
      district: string;
      latitude?: number;
      longitude?: number;
      date?: string;
    }): Promise<any> {
      const query = new URLSearchParams();
      query.set("state", params.state);
      query.set("district", params.district);
      if (params.latitude) query.set("latitude", String(params.latitude));
      if (params.longitude) query.set("longitude", String(params.longitude));
      if (params.date) query.set("date", params.date);

      const res = await request<any>(`/safety/query?${query.toString()}`);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },

    /** Guest / user 'I'm Safe' acknowledgment for dispatched official alerts. */
    async acknowledgeAlert(
      alertId: number | string,
      bookingId?: number | string,
      status: "SAFE" | "NEED_ASSISTANCE" = "SAFE"
    ): Promise<{ success: boolean; error?: string }> {
      return await request<any>(`/safety/alerts/${alertId}/ack`, {
        method: "POST",
        body: JSON.stringify({ booking_id: bookingId, status }),
      });
    },

    /** Monitor freshness & circuit status of IMD, SACHET, Open-Meteo, NASA. */
    async getSourceHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
      return await request<any>("/safety/sources/health");
    },

    /** Admin simulation test alert trigger (CAP 1.2 test flow). */
    async simulateAlert(payload: {
      farm_id?: number | string;
      source?: string;
      event: string;
      level: "Yellow" | "Orange" | "Red";
      district_name?: string;
      state?: string;
      headline: string;
      description: string;
      duration_hours?: number;
    }): Promise<{ success: boolean; data?: any; error?: string }> {
      return await request<any>("/safety/simulate-alert", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // 7. Notifications
  notifications: {
    async list(): Promise<NotificationLog[]> {
      const res = await request<any[]>("/notifications");
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeNotification);
      }
      return FALLBACK_NOTIFICATIONS;
    },

    async markRead(id: number | string): Promise<{ success: boolean }> {
      const numericId = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10) || 1;
      const res = await request<any>(`/notifications/${numericId}/read`, {
        method: "PATCH",
      });
      return { success: res.success };
    },

    async markAllRead(): Promise<{ success: boolean }> {
      const res = await request<any>("/notifications/read-all", {
        method: "POST",
      });
      return { success: res.success };
    },
  },

  // 8. Auth
  auth: {
    async login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
      const res = await request<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.success && res.data?.token) {
        if (typeof window !== "undefined") {
          localStorage.setItem("agrosafe_token", res.data.token);
          localStorage.setItem("agrosafe_user", JSON.stringify(res.data.user));
        }
        return { success: true, token: res.data.token, user: res.data.user };
      }
      return { success: false, error: res.error || "Invalid credentials" };
    },

    async register(userData: {
      user_type: "guest" | "host";
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      phone_number?: string;
    }): Promise<{ success: boolean; token?: string; user?: any; requiresVerification?: boolean; message?: string; error?: string }> {
      const res = await request<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      if (res.success) {
        if (res.data?.token) {
          if (typeof window !== "undefined") {
            localStorage.setItem("agrosafe_token", res.data.token);
            localStorage.setItem("agrosafe_user", JSON.stringify(res.data.user));
          }
          return { success: true, token: res.data.token, user: res.data.user };
        }
        return {
          success: true,
          requiresVerification: true,
          user: res.data?.user,
          message: res.data?.message || "Registration successful! Please verify your email before logging in.",
        };
      }
      return { success: false, error: res.error || "Registration failed" };
    },

    async verifyEmail(token: string): Promise<{ success: boolean; message?: string; error?: string }> {
      const res = await request<any>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
      if (res.success) {
        return { success: true, message: res.data?.message || "Email verified successfully!" };
      }
      return { success: false, error: res.error || "Email verification failed" };
    },

    async resendVerification(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
      const res = await request<any>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res.success) {
        return { success: true, message: res.data?.message || "Verification email sent!" };
      }
      return { success: false, error: res.error || "Failed to resend verification email" };
    },

    async me(): Promise<{ success: boolean; user?: any }> {
      const res = await request<any>("/auth/me");
      if (res.success && res.data) {
        return { success: true, user: res.data };
      }
      return { success: false };
    },

    logout() {
      if (typeof window !== "undefined") {
        localStorage.removeItem("agrosafe_token");
        localStorage.removeItem("agrosafe_user");
      }
    },
  },
};
