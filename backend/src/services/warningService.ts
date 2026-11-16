import { supabase, safeInsert } from "../config/supabase.js";

export const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const listAllReports = async () => {
  const { data, error } = await supabase
    .from("landslide_reports")
    .select("*, users(first_name, last_name, email)")
    .order("report_time", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const processLandslideReportWithCNN = async (
  userId: number,
  data: {
    image_s3_url: string;
    latitude: number;
    longitude: number;
    location_name?: string;
    details?: string;
  }
) => {
  const report_code = `UK-LS-${Math.floor(Math.random() * 9000 + 1000)}`;

  // Simulated CNN visual inference classification score (0.00 - 1.00)
  const confidenceScore = parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)); // 0.70 to 1.00
  const isHazardVerified = confidenceScore >= 0.75;
  const processing_status = isHazardVerified ? "Processed" : "Rejected";
  const severity = confidenceScore >= 0.9 ? "Critical" : confidenceScore >= 0.8 ? "High" : "Medium";

  // 1. Save Landslide Report
  const { data: report, error } = await safeInsert<any>("landslide_reports", {
    report_code,
    uploaded_by_user_id: userId,
    image_s3_url: data.image_s3_url,
    latitude: data.latitude,
    longitude: data.longitude,
    location_name: data.location_name || "Regional Mountain Approach",
    details: data.details,
    cnn_confidence_score: confidenceScore,
    processing_status,
    severity,
  });

  if (error || !report) throw new Error(error?.message || "Failed to record report");

  // 2. If CNN confidence is verified, automatically generate Active Warning in Warnings DB (CFD Warnings Flow)
  let autoWarning = null;
  if (isHazardVerified) {
    const warning_code = `WRN-AUTO-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data: warning } = await safeInsert<any>("warnings", {
      warning_code,
      warning_source: "Automated_CNN",
      report_id: report.id,
      title: `Automated Landslide Debris Alert (${data.location_name || "Highway Sector"})`,
      description: data.details || "CNN automated vision classified active slope movement. Route caution advised.",
      severity,
      epicenter_lat: data.latitude,
      epicenter_lng: data.longitude,
      impact_radius_km: 15.0,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      status: "Active",
    });
    autoWarning = warning;
  }

  return { report, confidenceScore, isHazardVerified, autoWarning };
};

export const issueHostManualWarning = async (
  hostId: number,
  data: {
    farm_id?: number;
    title: string;
    description: string;
    severity?: string;
    epicenter_lat: number;
    epicenter_lng: number;
    impact_radius_km?: number;
    duration_hours?: number;
  }
) => {
  const warning_code = `WRN-HOST-${Math.floor(Math.random() * 9000 + 1000)}`;
  const hours = data.duration_hours || 48;
  const expires_at = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const { data: warning, error } = await safeInsert<any>("warnings", {
    warning_code,
    warning_source: "Manual_Host",
    farm_id: data.farm_id,
    host_id: hostId,
    title: data.title,
    description: data.description,
    severity: data.severity,
    epicenter_lat: data.epicenter_lat,
    epicenter_lng: data.epicenter_lng,
    impact_radius_km: data.impact_radius_km,
    issued_at: new Date().toISOString(),
    expires_at,
    status: "Active",
  });

  if (error || !warning) throw new Error(error?.message || "Failed to broadcast warning");
  return warning;
};

export const listAllWarnings = async (status?: string) => {
  let query = supabase
    .from("warnings")
    .select("*, farms(title, slug, images), landslide_reports(image_s3_url, location_name), users(first_name, last_name, email)");
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data: warnings, error } = await query.order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!warnings || warnings.length === 0) return [];

  // Dynamically compute real affected farms and real affected bookings
  const [{ data: allFarms }, { data: allBookings }] = await Promise.all([
    supabase.from("farms").select("id, latitude, longitude"),
    supabase.from("bookings").select("id, farm_id, current_status"),
  ]);

  const farmsList = allFarms || [];
  const bookingsList = allBookings || [];

  return warnings.map((w: any) => {
    const lat = Number(w.epicenter_lat);
    const lng = Number(w.epicenter_lng);
    const radius = Number(w.impact_radius_km || 10);

    // Compute real distance to every farmstay using Haversine
    const affectedFarmIds = new Set<number>();
    farmsList.forEach((farm: any) => {
      if (farm.latitude && farm.longitude) {
        const dist = haversineDistanceKm(lat, lng, Number(farm.latitude), Number(farm.longitude));
        if (dist <= radius) {
          affectedFarmIds.add(Number(farm.id));
        }
      }
    });

    if (w.farm_id) {
      affectedFarmIds.add(Number(w.farm_id));
    }

    // Compute real affected bookings
    const affectedBookings = bookingsList.filter((b: any) => {
      if (!affectedFarmIds.has(Number(b.farm_id))) return false;
      const statusLower = String(b.current_status || "").toLowerCase();
      if (statusLower === "cancelled" || statusLower === "refunded") return false;
      return true;
    });

    return {
      ...w,
      affected_farms_count: affectedFarmIds.size,
      affected_bookings_count: affectedBookings.length,
    };
  });
};

export const revokeWarning = async (warningId: string | number) => {
  const { data, error } = await supabase
    .from("warnings")
    .update({ status: "Revoked" })
    .or(`id.eq.${warningId},warning_code.eq.${warningId}`)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};
