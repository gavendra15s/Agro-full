import { supabase } from "../config/supabase.js";
import { haversineDistanceKm } from "./warningService.js";
import { MonthlySafeMatrix, Farm, FarmRiskOverview } from "../types/index.js";
import { riskFusionEngine } from "./riskEngine/fusion.js";
import { getFarmBySlug } from "./farmService.js";

export const getAnnualMatrixForDistrict = async (district: string, year = 2026) => {
  const { data, error } = await supabase
    .from("monthly_safe_matrix")
    .select("*")
    .ilike("district", district)
    .eq("year", year)
    .order("month", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Returns detailed multi-hazard risk assessment for a farm on a chosen date.
 * Strictly rule-based using real data (forecast, recent conditions, official alerts).
 */
export const getFarmDetailedRisk = async (
  farmIdentifier: string | number,
  targetDate?: string
): Promise<FarmRiskOverview> => {
  let farm: Farm;
  if (typeof farmIdentifier === "number" || /^\d+$/.test(String(farmIdentifier))) {
    const { data, error } = await supabase.from("farms").select("*").eq("id", Number(farmIdentifier)).single();
    if (error || !data) throw new Error("Farm not found");
    farm = data;
  } else {
    farm = await getFarmBySlug(String(farmIdentifier));
  }

  const dateStr = targetDate || new Date().toISOString().split("T")[0];
  return await riskFusionEngine.evaluateFarmRisk(farm, dateStr);
};

export const evaluateSafetyStatus = async (params: {
  state: string;
  district: string;
  latitude?: number;
  longitude?: number;
  date?: string;
  farm_id?: number;
}) => {
  const targetDate = params.date ? new Date(params.date) : new Date();
  const dateStr = targetDate.toISOString().split("T")[0];
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();

  // If farm_id or coordinates provided, run the comprehensive multi-hazard evaluation
  if (params.farm_id || (params.latitude && params.longitude)) {
    const mockFarm: Farm = {
      id: params.farm_id || 1,
      slug: "regional-assessment",
      host_id: 1,
      title: `${params.district} Regional Node`,
      description: "Regional Farm Assessment Node",
      state: params.state,
      district: params.district,
      category: "Regional",
      latitude: params.latitude,
      longitude: params.longitude,
      uses_fallback_coords: false,
      nightly_rate: 4000,
      max_guests: 10,
      images: [],
      amenities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const riskOverview = await riskFusionEngine.evaluateFarmRisk(mockFarm, dateStr);
    return {
      location: `${params.district}, ${params.state}`,
      date: dateStr,
      month,
      year,
      overallLevel: riskOverview.overall_level,
      overallLevelName: riskOverview.overall_level_name,
      confidence: riskOverview.overall_confidence,
      hazards: riskOverview.hazards,
      activeWarning: riskOverview.active_official_alert,
      isRealtimeOverridden: riskOverview.official_alert_floor_applied,
      canRebookOrCancel: riskOverview.can_rebook_or_cancel,
      disclaimer: riskOverview.disclaimer,
      finalSafetyStatus:
        riskOverview.overall_level >= 2 ? "high" : riskOverview.overall_level === 1 ? "moderate" : "safe",
    };
  }

  // Fallback to legacy monthly safe matrix
  const { data: baseRecord } = await supabase
    .from("monthly_safe_matrix")
    .select("*")
    .ilike("district", params.district)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle<MonthlySafeMatrix>();

  const baseRating = baseRecord ? baseRecord.safety_rating : "Safe";

  return {
    location: `${params.district}, ${params.state}`,
    month,
    year,
    baseMatrixRating: baseRating,
    rainfall_mm: baseRecord?.rainfall_mm || 0,
    soil_stability_index: baseRecord?.soil_stability_index || 100,
    isRealtimeOverridden: false,
    activeWarning: null,
    finalSafetyStatus: baseRating.toLowerCase() === "high risk" ? "high" : baseRating.toLowerCase(),
  };
};
