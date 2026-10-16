import { RiskLevelCode, OfficialAlert } from "../../types/index.js";

/**
 * Computes Rothfusz Heat Index (°C) given temperature in Celsius and relative humidity (%).
 */
export function computeHeatIndexC(tempC: number, humidityPct: number): number {
  if (tempC < 26.7) return tempC; // Below ~80°F heat index is close to dry bulb temperature

  const T = (tempC * 9) / 5 + 32; // Fahrenheit
  const R = Math.max(0, Math.min(100, humidityPct));

  // Rothfusz regression equation
  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Convert back to Celsius
  return ((HI - 32) * 5) / 9;
}

export interface HeatModuleInput {
  temp_max_c: number;
  humidity_percent: number;
  official_alert_level?: RiskLevelCode;
  official_alert?: OfficialAlert | null;
  data_time: string;
}

export function evaluateHeatRisk(input: HeatModuleInput): {
  level: RiskLevelCode;
  heatIndexC: number;
  reasons: string[];
  sourceTimes: Record<string, string>;
  officialAlertFloorApplied: boolean;
} {
  const reasons: string[] = [];
  const sourceTimes: Record<string, string> = {
    "IMD / Forecast Heat Metrics": input.data_time,
  };

  const hi = computeHeatIndexC(input.temp_max_c, input.humidity_percent);
  let ruleLevel: RiskLevelCode = 0;

  if (hi >= 54 || input.temp_max_c >= 45) {
    ruleLevel = 3;
    reasons.push(
      `Extreme Heat Danger: Heat index ${hi.toFixed(1)}°C (air temp ${input.temp_max_c.toFixed(1)}°C, ${input.humidity_percent}% humidity). High heat stroke risk.`
    );
  } else if (hi >= 41 || input.temp_max_c >= 40) {
    ruleLevel = 2;
    reasons.push(
      `Severe Heat Wave / Danger: Heat index ${hi.toFixed(1)}°C with ${input.temp_max_c.toFixed(1)}°C peak daytime temperature.`
    );
  } else if (hi >= 32 || input.temp_max_c >= 35) {
    ruleLevel = 1;
    reasons.push(
      `Heat Caution: Daytime heat index reaches ${hi.toFixed(1)}°C. Stay hydrated during outdoor farm activities.`
    );
  } else {
    ruleLevel = 0;
    reasons.push(
      `Comfortable temperature profile: peak ${input.temp_max_c.toFixed(1)}°C, heat index ${hi.toFixed(1)}°C.`
    );
  }

  // Official IMD Heat Wave alert floor
  let finalLevel: RiskLevelCode = ruleLevel;
  let floorApplied = false;
  const officialFloor = (input.official_alert_level && input.official_alert_level >= 0 ? input.official_alert_level : 0) as RiskLevelCode;
  if (officialFloor > finalLevel) {
    finalLevel = officialFloor;
    floorApplied = true;
    reasons.push(`Official IMD Heat-Wave warning sets minimum advisory floor to level ${officialFloor}.`);
    sourceTimes["IMD Heat Bulletin"] = input.official_alert?.effective || input.data_time;
  }


  return {
    level: finalLevel,
    heatIndexC: Math.round(hi * 10) / 10,
    reasons,
    sourceTimes,
    officialAlertFloorApplied: floorApplied,
  };
}
