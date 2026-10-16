import { RiskLevelCode, OfficialAlert } from "../../types/index.js";

export interface CycloneModuleInput {
  distance_to_coast_km: number;
  wind_gust_kmh: number;
  rain_24h_mm: number;
  official_alert_level?: RiskLevelCode;
  official_alert?: OfficialAlert | null;
  data_time: string;
}

export function evaluateCycloneRisk(input: CycloneModuleInput): {
  level: RiskLevelCode;
  reasons: string[];
  sourceTimes: Record<string, string>;
  officialAlertFloorApplied: boolean;
} {
  const reasons: string[] = [];
  const sourceTimes: Record<string, string> = {
    "IMD / INCOIS Storm Tracking": input.data_time,
  };

  // Inland mountain farms (> 150 km from coast) do not suffer direct coastal cyclones
  if (input.distance_to_coast_km > 150) {
    if (input.wind_gust_kmh > 75) {
      reasons.push(`Inland gale gusts (${input.wind_gust_kmh} km/h); shielded from direct coastal surge (${input.distance_to_coast_km.toFixed(0)} km to coast).`);
      return {
        level: 1,
        reasons,
        sourceTimes,
        officialAlertFloorApplied: false,
      };
    }
    reasons.push(`Inland geography (${input.distance_to_coast_km.toFixed(0)} km to coast); no direct tropical cyclone exposure.`);
    return {
      level: 0,
      reasons,
      sourceTimes,
      officialAlertFloorApplied: false,
    };
  }

  // Coastal / near-coastal corridor (< 150 km)
  let ruleLevel: RiskLevelCode = 0;
  if (input.wind_gust_kmh >= 90 || (input.wind_gust_kmh >= 70 && input.rain_24h_mm >= 150)) {
    ruleLevel = 3;
    reasons.push(`Severe cyclonic gale gusts (≥ 90 km/h: ${input.wind_gust_kmh} km/h) with extreme coastal rain (${input.rain_24h_mm.toFixed(1)} mm).`);
  } else if (input.wind_gust_kmh >= 65 || input.rain_24h_mm >= 100) {
    ruleLevel = 2;
    reasons.push(`Squally coastal winds (${input.wind_gust_kmh} km/h) and heavy precipitation.`);
  } else if (input.wind_gust_kmh >= 45) {
    ruleLevel = 1;
    reasons.push(`Moderate coastal gustiness (${input.wind_gust_kmh} km/h).`);
  } else {
    ruleLevel = 0;
    reasons.push(`Calm coastal sea and winds (${input.wind_gust_kmh} km/h).`);
  }

  // Official IMD / INCOIS Cyclone Alert Floor
  let finalLevel: RiskLevelCode = ruleLevel;
  let floorApplied = false;
  const officialFloor = (input.official_alert_level && input.official_alert_level >= 0 ? input.official_alert_level : 0) as RiskLevelCode;
  if (officialFloor > finalLevel) {
    finalLevel = officialFloor;
    floorApplied = true;
    reasons.push(`Official IMD/INCOIS cyclone bulletin enforces minimum level ${officialFloor}.`);
    sourceTimes["IMD Cyclone Warning"] = input.official_alert?.effective || input.data_time;
  }


  return {
    level: finalLevel,
    reasons,
    sourceTimes,
    officialAlertFloorApplied: floorApplied,
  };
}
