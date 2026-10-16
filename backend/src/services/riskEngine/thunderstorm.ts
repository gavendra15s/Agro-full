import { RiskLevelCode, OfficialAlert } from "../../types/index.js";

export interface ThunderstormModuleInput {
  has_active_nowcast: boolean;
  nowcast_text?: string;
  official_alert_level?: RiskLevelCode;
  official_alert?: OfficialAlert | null;
  data_time: string;
}

export function evaluateThunderstormRisk(input: ThunderstormModuleInput): {
  level: RiskLevelCode;
  reasons: string[];
  sourceTimes: Record<string, string>;
  officialAlertFloorApplied: boolean;
} {
  const reasons: string[] = [];
  const sourceTimes: Record<string, string> = {
    "IMD Doppler / Nowcast Feed": input.data_time,
  };

  let level: RiskLevelCode = 0;

  if (input.has_active_nowcast) {
    level = (input.official_alert_level && input.official_alert_level > 1 ? input.official_alert_level : 1) as RiskLevelCode;
    reasons.push(input.nowcast_text || "Active IMD Nowcast: Severe convective cloud cluster and lightning warning in district.");
    if (input.official_alert?.effective) {
      sourceTimes["IMD Nowcast Time"] = input.official_alert.effective;
    }
  } else if (input.official_alert_level && input.official_alert_level > 0) {
    level = input.official_alert_level;
    reasons.push(`Official IMD lightning/thunderstorm advisory in place: level ${input.official_alert_level}.`);
    sourceTimes["IMD Advisory"] = input.official_alert?.effective || input.data_time;
  } else {
    level = 0;
    reasons.push("No active IMD thunderstorm or lightning nowcast detected.");
  }

  return {
    level,
    reasons,
    sourceTimes,
    officialAlertFloorApplied: level > 0,
  };
}
