export type SafetyStatus = "safe" | "moderate" | "high";

export interface Farm {
  id?: number;
  slug: string;
  name: string;
  location: string;
  state: string;
  district: string;
  subDistrict: string;
  category: string;
  pricePerNight: number;
  maxGuests: number;
  safety: SafetyStatus;
  host: string;
  hostId?: string | number;
  summary: string;
  images: string[];
  amenities: string[];
  cancellationPolicy: string;
  emergencyContact: string;
  regionalGuidelines: string;
  latitude?: number;
  longitude?: number;
  usesFallbackCoords?: boolean;
}

export interface Booking {
  id: string;
  farmSlug: string;
  farmName: string;
  location: string;
  image: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status:
    | "upcoming"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "weather_rescheduled"
    | "weather_cancelled"
    | "Draft"
    | "Held";
  escrowStatus?: "Held_In_Escrow" | "Released_To_Host" | "Refunded_To_Guest";
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface LandslideReport {
  id: string;
  location: string;
  lat: number;
  lng: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  reportedAt: string;
  status: string;
  cnnConfidenceScore?: number;
  uploadedBy?: string;
  imageS3Url?: string;
}

export type WarningSource = "Automated_CNN" | "Manual_Host";
export type WarningStatus = "Active" | "Expired" | "Revoked";

export interface Warning {
  id: string;
  warningSource: WarningSource;
  reportId?: string;
  hostId?: string;
  farmSlug?: string;
  farmName?: string;
  epicenterLat: number;
  epicenterLng: number;
  impactRadiusKm: number;
  issuedAt: string;
  expiresAt: string;
  status: WarningStatus;
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  description: string;
  affectedFarmsCount: number;
  affectedBookingsCount: number;
}

export interface PaymentTransactionLog {
  id: string;
  paymentId: string;
  transactionType: "Charge" | "Payout" | "Refund";
  amount: number;
  gatewayRef: string;
  processedAt: string;
  note: string;
}

export interface BookingStatusLog {
  id: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  changedAt: string;
}

export interface PaymentEscrow {
  paymentId: string;
  bookingId: string;
  farmName: string;
  farmSlug: string;
  guestName: string;
  stayAmount: number;
  platformFee: number;
  totalCharged: number;
  escrowStatus: "Awaiting_Funds" | "Held_In_Escrow" | "Released_To_Host" | "Refunded_To_Guest";
  gatewayRef: string;
  stayStartDate: string;
  stayEndDate: string;
  transactions: PaymentTransactionLog[];
  statusHistory: BookingStatusLog[];
}

export interface MonthlySafetyRecord {
  month: number;
  monthName: string;
  year: number;
  district: string;
  state: string;
  safetyRating: "Safe" | "Moderate" | "High Risk";
  rainfallMm: number;
  soilStabilityIndex: number; // 0 - 100
  historicalLandslidesCount: number;
  activeOverrideAlert?: boolean;
}

export interface NotificationLog {
  id: string;
  userId: string;
  userRole: "guest" | "host";
  warningId?: string;
  relatedBookingId?: string;
  notificationType: "Push" | "Email" | "SMS";
  title: string;
  messageContent: string;
  isRead: boolean;
  dispatchedAt: string;
  severity?: "info" | "warning" | "emergency";
}

export interface StaticGeoReference {
  state: string;
  district: string;
  subDistrict: string;
  centerLatitude: number;
  centerLongitude: number;
}

// -------------------------------------------------------------
// Multi-Hazard Risk & Official Alert Types
// -------------------------------------------------------------

export type HazardType = "landslide" | "flood" | "cyclone" | "heat" | "thunderstorm";
export type RiskLevelCode = 0 | 1 | 2 | 3;
export type RiskLevelName = "Green" | "Yellow" | "Orange" | "Red";
export type RiskConfidence = "High" | "Medium" | "Low";

export interface HazardScore {
  id?: number;
  farm_id: number;
  hazard: HazardType;
  date: string;
  level: RiskLevelCode;
  level_name: RiskLevelName;
  confidence: RiskConfidence;
  horizon_label: "Forecast" | "Early estimate" | "Historical trend" | "Insufficient data";
  reasons: string[];
  source_times: Record<string, string>;
  disclaimer: string;
  climatology_note?: string;
  can_rebook_or_cancel?: boolean;
  computed_at: string;
}

export interface OfficialAlert {
  id: number;
  cap_id: string;
  source: "SACHET" | "IMD" | "CWC" | "GSI" | "INCOIS";
  event: string;
  level: "Yellow" | "Orange" | "Red";
  level_code: 1 | 2 | 3;
  polygon_coordinates?: [number, number][];
  district_code?: string;
  district_name?: string;
  state?: string;
  headline: string;
  description: string;
  effective: string;
  expires: string;
  status: "Actual" | "Update" | "Cancel" | "Test";
  raw_xml?: string;
}

export interface FarmRiskOverview {
  farm_id: number;
  farm_title: string;
  date: string;
  overall_level: RiskLevelCode;
  overall_level_name: RiskLevelName;
  overall_confidence: RiskConfidence;
  hazards: Record<HazardType, HazardScore>;
  disclaimer: string;
  can_rebook_or_cancel: boolean;
  official_alert_floor_applied: boolean;
  active_official_alert?: OfficialAlert | null;
  data_timestamp: string;
}

export interface ReportSignal {
  id: number;
  report_id: number;
  signal_type: "EXIF_GPS_MATCH" | "EXIF_TIME_CHECK" | "IN_APP_CAMERA" | "WEATHER_CONTEXT" | "DUPLICATE_CHECK";
  passed: boolean;
  score_delta: number;
  details?: Record<string, any>;
  evaluated_at: string;
}

export interface IncidentReport {
  id: number;
  report_code: string;
  user_id: number;
  farm_id?: number;
  photo_url: string;
  device_lat: number;
  device_lng: number;
  photo_exif_lat?: number;
  photo_exif_lng?: number;
  photo_exif_time?: string;
  claimed_type: string;
  details?: string;
  location_name?: string;
  credibility_score: number;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED" | "AUTO_REJECTED";
  created_at: string;
  report_signals?: ReportSignal[];
}

export interface SourceRun {
  id: number;
  source: string;
  started_at: string;
  finished_at?: string;
  status: "SUCCESS" | "FAILED" | "DEGRADED";
  records_ingested: number;
  error_message?: string;
  payload_summary?: Record<string, any>;
}

