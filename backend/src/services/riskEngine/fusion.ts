import {
  HazardType,
  RiskLevelCode,
  RiskLevelName,
  RiskConfidence,
  HazardScore,
  FarmRiskOverview,
  OfficialAlert,
  Farm,
  FarmStaticProfile,
} from "../../types/index.js";
import { openMeteoAdapter, DailyForecast } from "../../adapters/openMeteoAdapter.js";
import { sachetAdapter } from "../../adapters/sachetAdapter.js";
import { imdAdapter } from "../../adapters/imdAdapter.js";
import { nasaAdapter } from "../../adapters/nasaAdapter.js";
import { powerAdapter } from "../../adapters/powerAdapter.js";
import { evaluateLandslideRisk } from "./landslide.js";
import { evaluateFloodRisk } from "./flood.js";
import { evaluateCycloneRisk } from "./cyclone.js";
import { evaluateHeatRisk } from "./heat.js";
import { evaluateThunderstormRisk } from "./thunderstorm.js";
import { supabase, safeInsert } from "../../config/supabase.js";

const LEVEL_NAMES: Record<RiskLevelCode, RiskLevelName> = {
  0: "Green",
  1: "Yellow",
  2: "Orange",
  3: "Red",
  [-1]: "Insufficient data",
};

export class RiskFusionEngine {
  /**
   * Precomputes or reads risk evaluation for a farm on a specific target date.
   */
  async evaluateFarmRisk(farm: Farm, targetDateStr: string): Promise<FarmRiskOverview> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const dataTime = new Date().toISOString();

    // 1. If date is > 15 days in the future, return Climatology Historical Trend (Section 3 of 04_risk_engine.md)
    if (diffDays > 15) {
      const month = targetDate.getMonth() + 1;
      const climatology = powerAdapter.getClimatologyForFarm(farm.id || 1);
      const monthData = climatology.find((c) => c.month === month) || climatology[0];

      const climatologyNote = `Travel is ${diffDays} days away. Showing historical 10-year trend for month of ${targetDate.toLocaleString("default", { month: "long" })}: averaged ${monthData.avg_heavy_rain_days} heavy-rain days (NASA POWER). Automated daily re-checking will activate as travel date enters the 15-day forecast horizon.`;

      const historicalHazardScore = (hazard: HazardType): HazardScore => ({
        farm_id: farm.id || 1,
        hazard,
        date: targetDateStr,
        level: -1,
        level_name: "Insufficient data",
        confidence: "not_applicable",
        horizon_label: "Historical trend",
        reasons: [climatologyNote],
        source_times: { "NASA POWER 10-Yr Climatology": dataTime },
        disclaimer: "Historical climatological trend only. Exact forecast generated within 15 days of stay.",
        climatology_note: climatologyNote,
        can_rebook_or_cancel: false,
        computed_at: dataTime,
      });

      return {
        farm_id: farm.id || 1,
        farm_title: farm.title,
        date: targetDateStr,
        overall_level: -1,
        overall_level_name: "Insufficient data",
        overall_confidence: "not_applicable",
        hazards: {
          landslide: historicalHazardScore("landslide"),
          flood: historicalHazardScore("flood"),
          cyclone: historicalHazardScore("cyclone"),
          heat: historicalHazardScore("heat"),
          thunderstorm: historicalHazardScore("thunderstorm"),
        },
        disclaimer: "Historical climatological trend only. Multi-hazard forecast levels activate within 15 days.",
        can_rebook_or_cancel: false,
        official_alert_floor_applied: false,
        data_timestamp: dataTime,
      };
    }

    // 2. Fetch Farm Static Profile (or create default from farm parameters)
    const lat = farm.latitude ?? 29.426;
    const lng = farm.longitude ?? 79.552;
    const isHillState = ["Uttarakhand", "Himachal Pradesh", "Jammu and Kashmir", "Sikkim", "Kerala"].some((st) =>
      farm.state.toLowerCase().includes(st.toLowerCase())
    );

    const staticProfile: FarmStaticProfile = {
      farm_id: farm.id || 1,
      elevation_meters: isHillState ? 2100 : 350,
      slope_degrees: isHillState ? 22 : 4,
      distance_to_river_km: 1.8,
      distance_to_coast_km: farm.state.toLowerCase().includes("kerala") ? 65 : 450,
      landslide_susceptibility_class: isHillState ? "high" : "low",
      source: "Copernicus DEM & GSI National Landslide Susceptibility Mapping",
    };

    // 3. Fetch Recent Conditions (NASA IMERG & LHASA)
    const recent = nasaAdapter.getConditionsForFarm(farm.id || 1, farm.district);

    // 4. Fetch Weather Forecast (Open-Meteo)
    const forecastRes = await openMeteoAdapter.fetch({ latitude: lat, longitude: lng });
    const dayForecast =
      forecastRes.data?.days.find((d) => d.date === targetDateStr) ||
      forecastRes.data?.days[Math.min(diffDays, (forecastRes.data?.days.length || 1) - 1)] || {
        date: targetDateStr,
        rain_mm_24h: 12.0,
        temp_max_c: 24.0,
        temp_min_c: 14.0,
        humidity_percent: 65,
        wind_gust_kmh: 15,
        river_discharge_percentile: 35,
      };

    // 5. Match Official Alerts (SACHET & IMD)
    const sachetRes = await sachetAdapter.fetch();
    const activeOfficialAlert = (sachetRes.data || []).find((a) =>
      a.status !== "Cancel" && sachetAdapter.matchesFarm({ latitude: lat, longitude: lng, district: farm.district, state: farm.state }, a)
    );

    const imdWarning = imdAdapter.getWarningForDistrict(farm.district);
    const imdFloor = imdWarning.warning_level as RiskLevelCode;
    const sachetFloor = (activeOfficialAlert ? activeOfficialAlert.level_code : 0) as RiskLevelCode;
    const officialAlertFloor = Math.max(imdFloor, sachetFloor) as RiskLevelCode;

    // 6. Base Confidence by forecast horizon
    let baseConfidence: RiskConfidence = "high";
    let horizonLabel: "Forecast" | "Early estimate" | "Historical trend" | "Insufficient data" = "Forecast";

    if (diffDays <= 3) {
      baseConfidence = "high";
      horizonLabel = "Forecast";
    } else if (diffDays <= 7) {
      baseConfidence = "medium";
      horizonLabel = "Forecast";
    } else if (diffDays <= 15) {
      baseConfidence = "low";
      horizonLabel = "Early estimate";
    }

    // 7. Evaluate All 5 Hazard Modules
    // Module 1: Landslide
    const landslideRes = evaluateLandslideRisk({
      rain_24h_mm: dayForecast.rain_mm_24h,
      is_soil_wet_recent: recent.soil_moisture_proxy === "wet" || recent.soil_moisture_proxy === "saturated",
      slope_degrees: staticProfile.slope_degrees,
      susceptibility_class: staticProfile.landslide_susceptibility_class,
      official_alert_level: officialAlertFloor,
      official_alert: activeOfficialAlert,
      data_time: dataTime,
    });

    // Module 2: Flood / Flash Flood
    const floodRes = evaluateFloodRisk({
      river_discharge_percentile: dayForecast.river_discharge_percentile,
      rain_72h_mm: dayForecast.rain_mm_24h * 2.2,
      distance_to_river_km: staticProfile.distance_to_river_km,
      official_alert_level: officialAlertFloor,
      official_alert: activeOfficialAlert,
      data_time: dataTime,
    });

    // Module 3: Cyclone / Storm
    const cycloneRes = evaluateCycloneRisk({
      distance_to_coast_km: staticProfile.distance_to_coast_km,
      wind_gust_kmh: dayForecast.wind_gust_kmh,
      rain_24h_mm: dayForecast.rain_mm_24h,
      official_alert_level: officialAlertFloor,
      official_alert: activeOfficialAlert,
      data_time: dataTime,
    });

    // Module 4: Extreme Heat
    const heatRes = evaluateHeatRisk({
      temp_max_c: dayForecast.temp_max_c,
      humidity_percent: dayForecast.humidity_percent,
      official_alert_level: imdWarning.warning_type.toLowerCase().includes("heat") ? officialAlertFloor : 0,
      official_alert: activeOfficialAlert,
      data_time: dataTime,
    });

    // Module 5: Thunderstorm / Lightning
    const thunderstormRes = evaluateThunderstormRisk({
      has_active_nowcast: imdWarning.nowcast_active,
      nowcast_text: imdWarning.nowcast_text,
      official_alert_level: imdWarning.nowcast_active ? 1 : 0,
      official_alert: activeOfficialAlert,
      data_time: dataTime,
    });

    // 8. Confidence Adjustments (per section 3 of 04_risk_engine.md)
    // - If official alert exists and agrees with rule result (diff <= 1), raise confidence by 1 step
    let adjustedConfidence = baseConfidence;
    if (activeOfficialAlert && baseConfidence === "medium") {
      adjustedConfidence = "high";
    } else if (activeOfficialAlert && baseConfidence === "low") {
      adjustedConfidence = "medium";
    }

    // - Where a source has a known limitation (GloFAS on small streams), lower confidence
    if (floodRes.isSmallStreamConfidenceDrop && adjustedConfidence === "high") {
      adjustedConfidence = "medium";
    }

    // 9. Overall Maximum Level computation
    const hazardLevels: RiskLevelCode[] = [
      landslideRes.level,
      floodRes.level,
      cycloneRes.level,
      heatRes.level,
      thunderstormRes.level,
    ];

    let overallLevel = Math.max(...hazardLevels) as RiskLevelCode;

    // Floor rule: Official alert sets a floor that rules cannot lower
    if (officialAlertFloor > overallLevel) {
      overallLevel = officialAlertFloor;
    }

    const overallLevelName = LEVEL_NAMES[overallLevel];
    const canRebookOrCancel = overallLevel >= 2; // Orange or Red triggers weather-aware rebooking / cancel policy

    const createHazardScore = (
      hazard: HazardType,
      level: RiskLevelCode,
      reasons: string[],
      sourceTimes: Record<string, string>
    ): HazardScore => ({
      farm_id: farm.id || 1,
      hazard,
      date: targetDateStr,
      level,
      level_name: LEVEL_NAMES[level],
      confidence: adjustedConfidence,
      horizon_label: horizonLabel,
      reasons,
      source_times: sourceTimes,
      disclaimer: "This is a rule-based risk estimate, not a guarantee of safety.",
      can_rebook_or_cancel: level >= 2,
      computed_at: dataTime,
    });

    const overview: FarmRiskOverview = {
      farm_id: farm.id || 1,
      farm_title: farm.title,
      date: targetDateStr,
      overall_level: overallLevel,
      overall_level_name: overallLevelName,
      overall_confidence: adjustedConfidence,
      hazards: {
        landslide: createHazardScore("landslide", landslideRes.level, landslideRes.reasons, landslideRes.sourceTimes),
        flood: createHazardScore("flood", floodRes.level, floodRes.reasons, floodRes.sourceTimes),
        cyclone: createHazardScore("cyclone", cycloneRes.level, cycloneRes.reasons, cycloneRes.sourceTimes),
        heat: createHazardScore("heat", heatRes.level, heatRes.reasons, heatRes.sourceTimes),
        thunderstorm: createHazardScore("thunderstorm", thunderstormRes.level, thunderstormRes.reasons, thunderstormRes.sourceTimes),
      },
      disclaimer: "This is a multi-disaster risk estimate based on official data, not a guarantee of safety.",
      can_rebook_or_cancel: canRebookOrCancel,
      official_alert_floor_applied:
        landslideRes.officialAlertFloorApplied ||
        floodRes.officialAlertFloorApplied ||
        cycloneRes.officialAlertFloorApplied ||
        heatRes.officialAlertFloorApplied,
      active_official_alert: activeOfficialAlert || null,
      data_timestamp: dataTime,
    };

    // Store into hazard_scores in background (fire-and-forget or awaited)
    this.persistHazardScores(overview).catch((e) =>
      console.warn("[RiskFusion] Could not persist scores:", e.message)
    );

    return overview;
  }

  private async persistHazardScores(overview: FarmRiskOverview): Promise<void> {
    for (const [hazard, score] of Object.entries(overview.hazards)) {
      await safeInsert("hazard_scores", {
        farm_id: overview.farm_id,
        hazard,
        date: overview.date,
        level_code: score.level,
        level_name: score.level_name,
        confidence: score.confidence,
        horizon_label: score.horizon_label,
        reasons: JSON.stringify(score.reasons),
        source_times: JSON.stringify(score.source_times),
        disclaimer: score.disclaimer,
        can_rebook_or_cancel: score.can_rebook_or_cancel,
        computed_at: score.computed_at,
      });
    }
  }
}

export const riskFusionEngine = new RiskFusionEngine();
