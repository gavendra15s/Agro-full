import { RiskLevelCode, RiskConfidence, HazardScore, OfficialAlert } from "../../types/index.js";

export interface LandslideModuleInput {
  rain_24h_mm: number;
  is_soil_wet_recent: boolean;
  slope_degrees: number;
  susceptibility_class: "low" | "medium" | "high";
  official_alert_level?: RiskLevelCode; // 0, 1, 2, 3
  official_alert?: OfficialAlert | null;
  data_time: string;
}

export function evaluateLandslideRisk(input: LandslideModuleInput): {
  level: RiskLevelCode;
  reasons: string[];
  sourceTimes: Record<string, string>;
  officialAlertFloorApplied: boolean;
} {
  const reasons: string[] = [];
  const sourceTimes: Record<string, string> = {
    "IMD / Forecast": input.data_time,
  };

  // 1. Categorize 24h expected rainfall per IMD standard limits
  // Light/Moderate: < 64.5 mm (0)
  // Heavy: 64.5 to 115.5 mm (1)
  // Very Heavy: 115.6 to 204.4 mm (2)
  // Extremely Heavy: >= 204.5 mm (3)
  let rainCategory: 0 | 1 | 2 | 3 = 0;
  if (input.rain_24h_mm >= 204.5) {
    rainCategory = 3;
    reasons.push(`Extremely heavy rain forecast (≥ 204.5 mm/24h: ${input.rain_24h_mm.toFixed(1)} mm).`);
  } else if (input.rain_24h_mm >= 115.6) {
    rainCategory = 2;
    reasons.push(`Very heavy rain forecast (115.6–204.4 mm/24h: ${input.rain_24h_mm.toFixed(1)} mm).`);
  } else if (input.rain_24h_mm >= 64.5) {
    rainCategory = 1;
    reasons.push(`Heavy rain forecast (64.5–115.5 mm/24h: ${input.rain_24h_mm.toFixed(1)} mm).`);
  } else {
    rainCategory = 0;
    if (input.rain_24h_mm > 15) {
      reasons.push(`Moderate showers forecast (${input.rain_24h_mm.toFixed(1)} mm/24h).`);
    } else {
      reasons.push(`Light or dry weather forecast (${input.rain_24h_mm.toFixed(1)} mm/24h).`);
    }
  }

  // 2. Wet soil adjustment (past 3-7 days rainfall)
  const wetSoilBonus = input.is_soil_wet_recent ? 1 : 0;
  if (input.is_soil_wet_recent) {
    reasons.push("Prior 3-7 day rainfall has saturated the subsoil layers (+1 risk level).");
    sourceTimes["NASA IMERG / Soil Moisture"] = input.data_time;
  }

  // 3. Farm slope and susceptibility adjustment: low (-1), medium (0), high (+1)
  let susceptibilityMod = 0;
  if (input.susceptibility_class === "high" || input.slope_degrees > 25) {
    susceptibilityMod = 1;
    reasons.push(`High slope susceptibility (${input.slope_degrees.toFixed(1)}° incline, +1 risk level).`);
  } else if (input.susceptibility_class === "low" || input.slope_degrees < 10) {
    susceptibilityMod = -1;
    reasons.push(`Low terrain slope (${input.slope_degrees.toFixed(1)}° incline, -1 risk level mitigation).`);
  } else {
    reasons.push(`Moderate slope terrain (${input.slope_degrees.toFixed(1)}° incline).`);
  }

  // 4. Base rule computation (matching Section 5 of 04_risk_engine.md)
  let computedLevel: number = 0;
  if (rainCategory >= 1) {
    computedLevel = rainCategory + wetSoilBonus + susceptibilityMod;
  } else if (input.is_soil_wet_recent && (input.susceptibility_class === "high" || input.slope_degrees > 25)) {
    computedLevel = 1; // Yellow: rain is light, but soil is wet and the area is susceptible
    reasons.push("Light rain, but saturated soil on high slope triggers awareness level.");
  } else {
    computedLevel = 0;
  }

  // Clamp computed level strictly to 0..3
  computedLevel = Math.max(0, Math.min(3, computedLevel));

  // 5. Official Alert Floor Enforcement: An official alert can only raise the level, never lower it
  let finalLevel = computedLevel as RiskLevelCode;
  let floorApplied = false;

  const officialAlertFloor = input.official_alert_level ?? 0;
  if (officialAlertFloor > finalLevel) {
    finalLevel = officialAlertFloor;
    floorApplied = true;
    const alertSource = input.official_alert?.source || "Official Alert (SACHET/IMD)";
    reasons.push(`Official ${alertSource} warning level raised the risk floor to ${input.official_alert?.level || "Orange/Red"}.`);
    sourceTimes["Official Alert"] = input.official_alert?.effective || input.data_time;
  }

  return {
    level: finalLevel,
    reasons,
    sourceTimes,
    officialAlertFloorApplied: floorApplied,
  };
}
