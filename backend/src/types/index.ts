export type UserType = "guest" | "host" | "admin";

export interface User {
  id: number;
  user_type: UserType;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone_number?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: number;
  slug: string;
  host_id: number;
  title: string;
  description: string;
  state: string;
  district: string;
  subdistrict?: string;
  category: string;
  latitude?: number;
  longitude?: number;
  uses_fallback_coords: boolean;
  nightly_rate: number;
  max_guests: number;
  images: string[];
  amenities: string[];
  cancellation_policy?: string;
  emergency_contact?: string;
  regional_guidelines?: string;
  created_at: string;
  updated_at: string;
}

export interface FarmStaticProfile {
  id?: number;
  farm_id: number;
  elevation_meters: number;
  slope_degrees: number;
  distance_to_river_km: number;
  distance_to_coast_km: number;
  landslide_susceptibility_class: "low" | "medium" | "high";
  source: string;
  created_at?: string;
}

export interface FarmClimatology {
  id?: number;
  farm_id: number;
  month: number;
  avg_heavy_rain_days: number;
  temp_p10: number;
  temp_p50: number;
  temp_p90: number;
  source_years: string;
  summary_text?: string;
}

export type AvailabilityStatus = "available" | "held" | "booked";

export interface Availability {
  id?: number;
  farm_id: number;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  price: number;
  held_until?: string | null;
  held_by_booking_id?: number | null;
}

export type HazardType = "landslide" | "flood" | "cyclone" | "heat" | "thunderstorm";
export type RiskLevelCode = 0 | 1 | 2 | 3 | -1; // 0=Green, 1=Yellow, 2=Orange, 3=Red, -1=Insufficient data
export type RiskLevelName = "Green" | "Yellow" | "Orange" | "Red" | "Insufficient data";
export type RiskConfidence = "high" | "medium" | "low" | "not_applicable";

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

export interface OfficialAlert {
  id?: number;
  cap_id: string;
  source: "SACHET" | "IMD" | "CWC" | "GSI" | "INCOIS";
  event: string;
  level: "Yellow" | "Orange" | "Red";
  level_code: 1 | 2 | 3;
  polygon_coordinates?: [number, number][]; // GeoJSON polygon exterior ring
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
  credibility_score: number; // 0 - 100
  score_band: "low" | "medium" | "high";
  status: "pending_moderation" | "confirmed" | "rejected";
  moderator_note?: string;
  reported_at: string;
  signals?: ReportSignal[];
}

export interface ReportSignal {
  id?: number;
  report_id: number;
  signal_name: string;
  signal_value: string;
  weight: number;
  score_points: number;
  description: string;
}

export interface ModerationAction {
  id?: number;
  report_id: number;
  moderator_id: number;
  decision: "confirm" | "reject" | "request_info";
  reason: string;
  decided_at: string;
}

export interface AlertDelivery {
  id?: number;
  alert_id: number | string;
  recipient_id: number;
  recipient_name: string;
  recipient_phone?: string;
  recipient_email?: string;
  channel: "Push" | "SMS" | "WhatsApp" | "Email";
  status: "sent" | "delivered" | "failed";
  is_safe_acked: boolean;
  acked_at?: string | null;
  dispatched_at: string;
}

export interface SourceRun {
  id?: number;
  source_name: "Open-Meteo" | "SACHET" | "IMD" | "NASA-IMERG" | "NASA-POWER" | "GloFAS";
  job_name: string;
  last_attempt_at: string;
  last_success_at: string;
  is_healthy: boolean;
  consecutive_failures: number;
  last_error?: string | null;
  records_processed: number;
  freshness_limit_minutes: number;
  is_stale: boolean;
}

export type BookingStatus =
  | "Draft"
  | "Held"
  | "Pending"
  | "Confirmed"
  | "Active"
  | "Completed"
  | "Cancelled"
  | "Refunded"
  | "Rescheduled";

export type EscrowStatus = "Awaiting_Funds" | "Held_In_Escrow" | "Released_To_Host" | "Refunded_To_Guest";

export interface Booking {
  id: number;
  booking_code: string;
  guest_id: number;
  farm_id: number;
  stay_start_date: string;
  stay_end_date: string;
  total_guests: number;
  current_status: BookingStatus;
  hold_expires_at?: string | null;
  rebook_offered_at?: string | null;
  weather_risk_level?: RiskLevelName;
  created_at: string;
  updated_at: string;
}

export interface LandslideReport {
  id: number;
  report_code: string;
  uploaded_by_user_id?: number;
  image_s3_url: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  details?: string;
  report_time: string;
  cnn_confidence_score: number;
  processing_status: "Pending" | "Processed" | "Rejected";
  severity: "Low" | "Medium" | "High" | "Critical";
}

export type WarningSource = "Automated_CNN" | "Manual_Host" | "Official_SACHET" | "Official_IMD" | "Simulation_Test";
export type WarningStatus = "Active" | "Expired" | "Revoked";

export interface Warning {
  id: number;
  warning_code: string;
  warning_source: WarningSource;
  report_id?: number;
  farm_id?: number;
  host_id?: number;
  title: string;
  description?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  epicenter_lat: number;
  epicenter_lng: number;
  impact_radius_km: number;
  issued_at: string;
  expires_at: string;
  status: WarningStatus;
}

export interface Payment {
  id: number;
  payment_code: string;
  booking_id: number;
  stay_amount: number;
  platform_fee: number;
  total_charged: number;
  escrow_status: EscrowStatus;
  gateway_ref?: string;
  razorpay_order_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionLog {
  id: number;
  payment_id: number;
  transaction_type: "Charge" | "Payout" | "Refund";
  payment_gateway_ref: string;
  amount: number;
  note?: string;
  processed_at: string;
}

export interface BookingStatusLog {
  id: number;
  booking_id: number;
  previous_status: string;
  new_status: string;
  reason: string;
  changed_at: string;
}

export interface NotificationLog {
  id: number;
  user_id: number;
  warning_id?: number;
  related_booking_id?: number;
  notification_type: "Push" | "Email" | "SMS";
  title: string;
  message_content: string;
  is_read: boolean;
  severity?: "info" | "warning" | "emergency";
  dispatched_at: string;
}

export interface StaticGeoReference {
  id: number;
  state: string;
  district: string;
  subdistrict?: string;
  center_latitude: number;
  center_longitude: number;
}

export interface MonthlySafeMatrix {
  id: number;
  state: string;
  district: string;
  year: number;
  month: number;
  safety_rating: "Safe" | "Moderate" | "High Risk";
  rainfall_mm: number;
  soil_stability_index: number;
  historical_landslides_count: number;
  last_updated: string;
}
