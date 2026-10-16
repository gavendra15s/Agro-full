import { RiskLevelCode, OfficialAlert } from "../../types/index.js";

export interface FloodModuleInput {
  river_discharge_percentile: number; // 0 - 100
  rain_72h_mm: number;
  distance_to_river_km: number;
  official_alert_level?: RiskLevelCode;
  official_alert?: OfficialAlert | null;
  data_time: string;
}

export function evaluateFloodRisk(input: FloodModuleInput): {
  level: RiskLevelCode;
  reasons: string[];
  sourceTimes: Record<string, string>;
  isSmallStreamConfidenceDrop: boolean;
  officialAlertFloorApplied: boolean;
} {
  const reasons: string[] = [];
  const sourceTimes: Record<string, string> = {
    "GloFAS River Discharge": input.data_time,
  };

  // 1. Distance gate: farms far from water bodies have lower baseline flood exposure
  const isNearRiver = input.distance_to_river_km <= 3.0;
  const isImmediateFloodplain = input.distance_to_river_km <= 0.8;

  let ruleLevel: RiskLevelCode = 0;

  if (input.river_discharge_percentile >= 90 && input.rain_72h_mm >= 120) {
    ruleLevel = isImmediateFloodplain ? 3 : 2;
    reasons.push(
      `Extreme river discharge forecast (${input.river_discharge_percentile}th percentile) with heavy cumulative 72h rain (${input.rain_72h_mm.toFixed(1)} mm).`
    );
  } else if (input.river_discharge_percentile >= 80 && input.rain_72h_mm >= 70) {
    ruleLevel = isNearRiver ? 2 : 1;
    reasons.push(
      `Elevated river discharge (${input.river_discharge_percentile}th percentile) and persistent showers near river corridor (${input.distance_to_river_km.toFixed(1)} km).`
    );
  } else if (input.river_discharge_percentile >= 70 || input.rain_72h_mm >= 90) {
    ruleLevel = 1;
    reasons.push(
      `Moderate hydrological runoff forecast (${input.river_discharge_percentile}th percentile, ${input.rain_72h_mm.toFixed(1)} mm 72h rain).`
    );
  } else {
    ruleLevel = 0;
    reasons.push(
      `Normal river discharge (${input.river_discharge_percentile}th percentile) and safe distance to river (${input.distance_to_river_km.toFixed(1)} km).`
    );
  }

  // 2. Official CWC / SACHET flood alert floor
  let finalLevel: RiskLevelCode = ruleLevel;
  let floorApplied = false;
  const officialFloor = (input.official_alert_level && input.official_alert_level >= 0 ? input.official_alert_level : 0) as RiskLevelCode;
  if (officialFloor > finalLevel) {
    finalLevel = officialFloor;
    floorApplied = true;
    reasons.push(`Official Central Water Commission (CWC) alert sets minimum flood floor to level ${officialFloor}.`);
    sourceTimes["CWC Official Alert"] = input.official_alert?.effective || input.data_time;
  }


  // GloFAS is built for large rivers and does not fully catch sudden flash floods on small streams
  const isSmallStreamConfidenceDrop = isNearRiver && input.distance_to_river_km < 1.0;
  if (isSmallStreamConfidenceDrop) {
    reasons.push("Note: Micro-stream flash floods may deviate from GloFAS basin models.");
  }

  return {
    level: finalLevel,
    reasons,
    sourceTimes,
    isSmallStreamConfidenceDrop,
    officialAlertFloorApplied: floorApplied,
  };
}
