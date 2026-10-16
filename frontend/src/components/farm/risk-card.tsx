"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudLightning,
  Flame,
  Info,
  Mountain,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Waves,
  Wind,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { FarmRiskOverview, HazardScore, HazardType, RiskLevelCode } from "@/lib/types";

interface Props {
  farmSlug: string;
  initialDate?: string;
  onDateChange?: (date: string) => void;
  onRequestRebook?: () => void;
}

const HAZARD_META: Record<
  HazardType,
  { label: string; icon: typeof Mountain; description: string }
> = {
  landslide: {
    label: "Landslide Risk",
    icon: Mountain,
    description: "Slope angle, 72h cumulative rainfall & soil saturation proxy",
  },
  flood: {
    label: "River & Flash Flood",
    icon: Waves,
    description: "Distance to watercourse & GloFAS river discharge forecast",
  },
  cyclone: {
    label: "Cyclone & High Wind",
    icon: Wind,
    description: "Coastal proximity, wind gusts & IMD/INCOIS cyclone advisories",
  },
  heat: {
    label: "Extreme Heat Index",
    icon: Flame,
    description: "Rothfusz Heat Index formula from max temperature and relative humidity",
  },
  thunderstorm: {
    label: "Severe Thunderstorm",
    icon: CloudLightning,
    description: "IMD nowcast convective activity and lightning alerts",
  },
};

const LEVEL_STYLES: Record<
  RiskLevelCode,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    word: string;
    subword: string;
  }
> = {
  0: {
    bg: "bg-emerald-50/70 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-300",
    badgeBg: "bg-emerald-600 text-white",
    badgeText: "text-emerald-700",
    word: "Green",
    subword: "Low Hazard Risk",
  },
  1: {
    bg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-300",
    badgeBg: "bg-amber-500 text-white",
    badgeText: "text-amber-700",
    word: "Yellow",
    subword: "Watch / Moderate Caution",
  },
  2: {
    bg: "bg-orange-50/90 dark:bg-orange-950/30",
    border: "border-orange-300 dark:border-orange-800",
    text: "text-orange-900 dark:text-orange-200",
    badgeBg: "bg-orange-600 text-white",
    badgeText: "text-orange-700",
    word: "Orange",
    subword: "Warning / Elevated Risk",
  },
  3: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-400 dark:border-rose-700",
    text: "text-rose-900 dark:text-rose-100",
    badgeBg: "bg-rose-600 text-white",
    badgeText: "text-rose-700",
    word: "Red",
    subword: "Severe Danger / Alert Floor",
  },
};

export function RiskCard({
  farmSlug,
  initialDate,
  onDateChange,
  onRequestRebook,
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(initialDate || today);
  const [overview, setOverview] = useState<FarmRiskOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHazard, setExpandedHazard] = useState<HazardType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.farms
      .getRisk(farmSlug, selectedDate)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setOverview(res.data);
        } else {
          setError(res.error || "Unable to compute hazard profile for this date.");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to reach safety risk service.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [farmSlug, selectedDate]);

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    if (onDateChange) onDateChange(newDate);
  }

  // Precomputed date pills: Today, +1d, +2d, +3d, +7d
  const quickDates = [0, 1, 2, 3, 5, 7].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split("T")[0];
    const label =
      offset === 0
        ? "Today"
        : offset === 1
        ? "Tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return { dateStr, label };
  });

  const levelStyle =
    overview && LEVEL_STYLES[overview.overall_level]
      ? LEVEL_STYLES[overview.overall_level]
      : LEVEL_STYLES[0];

  return (
    <Card className="overflow-hidden border border-line bg-surface shadow-xs">
      {/* Top Header Banner */}
      <div className="border-b border-line bg-canvas/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 text-brand-700" />
            <h2 className="text-lg font-bold tracking-tight text-ink">
              Multi-Hazard Risk Engine
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Target Stay Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-2xs focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Date Selection Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickDates.map((item) => {
            const isSelected = item.dateStr === selectedDate;
            return (
              <button
                key={item.dateStr}
                onClick={() => handleDateChange(item.dateStr)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-brand-700 text-white shadow-2xs"
                    : "bg-surface text-ink-muted hover:bg-black/5 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-muted">
            <RefreshCw className="size-4 animate-spin text-brand-700" />
            <span>Fusing IMD alerts, GloFAS river discharge &amp; soil moisture...</span>
          </div>
        ) : error || !overview ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 text-amber-600" />
              <span>Insufficient Data for Rule Evaluation</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              {error ||
                "Live satellite or meteorological feeds for this date are unavailable. Per safety policy, AgroSafe never defaults to 'Safe' when data is missing."}
            </p>
          </div>
        ) : (
          <div>
            {/* Overall Composite Level Banner */}
            <div
              className={`rounded-xl border p-4 sm:p-5 transition-colors ${levelStyle.bg} ${levelStyle.border}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-black tracking-wider uppercase ${levelStyle.badgeBg}`}
                  >
                    {levelStyle.word} Level
                  </span>
                  <div>
                    <h3 className={`text-base font-bold sm:text-lg ${levelStyle.text}`}>
                      {levelStyle.subword}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Evaluated for {overview.date} • {overview.overall_confidence} Confidence
                    </p>
                  </div>
                </div>

                {overview.official_alert_floor_applied && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
                    <ShieldAlert className="size-3 text-rose-600" />
                    Official Govt Alert Floor Active
                  </span>
                )}
              </div>

              {/* Official Alert Banner details if present */}
              {overview.active_official_alert && (
                <div className="mt-3.5 rounded-lg border border-rose-200 bg-white/80 p-3 text-xs text-rose-950 backdrop-blur-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      {overview.active_official_alert.source} Alert:{" "}
                      {overview.active_official_alert.headline}
                    </span>
                    <span className="text-[10px] text-rose-700 uppercase">
                      CAP 1.2 {overview.active_official_alert.level}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted">
                    {overview.active_official_alert.description}
                  </p>
                </div>
              )}

              {/* Weather-Aware 72h Rebooking Waiver Notification */}
              {overview.can_rebook_or_cancel && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-300 bg-white/90 p-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 text-orange-950">
                    <AlertTriangle className="size-4 shrink-0 text-orange-600" />
                    <span>
                      <strong>Weather-Aware Policy:</strong> Due to elevated hazard risks, this
                      reservation qualifies for <strong>100% zero-fee cancellation or date change</strong>{" "}
                      under our 72-hour trigger policy.
                    </span>
                  </div>
                  {onRequestRebook && (
                    <button
                      type="button"
                      onClick={onRequestRebook}
                      className="shrink-0 rounded-md bg-orange-600 px-3 py-1 font-semibold text-white shadow-2xs hover:bg-orange-700"
                    >
                      Reschedule Stay
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Individual Hazard Breakdown */}
            <div className="mt-6">
              <h4 className="text-xs font-bold tracking-wider text-ink-muted uppercase">
                Hazard Score Breakdown by Category
              </h4>

              <div className="mt-3 space-y-2.5">
                {(Object.keys(overview.hazards) as HazardType[]).map((hazardKey) => {
                  const hazardScore: HazardScore = overview.hazards[hazardKey];
                  const meta = HAZARD_META[hazardKey];
                  const Icon = meta.icon;
                  const isExpanded = expandedHazard === hazardKey;
                  const itemStyle = LEVEL_STYLES[hazardScore.level];

                  return (
                    <div
                      key={hazardKey}
                      className="rounded-lg border border-line bg-surface transition-all hover:border-brand-200"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHazard(isExpanded ? null : hazardKey)
                        }
                        className="flex w-full items-center justify-between p-3.5 text-left text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-md ${itemStyle.bg} ${itemStyle.text}`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-ink">
                                {meta.label}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${itemStyle.badgeBg}`}
                              >
                                {itemStyle.word}
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted">
                              {hazardScore.reasons[0] || meta.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="hidden text-xs text-ink-muted sm:inline">
                            {hazardScore.horizon_label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-ink-muted" />
                          ) : (
                            <ChevronDown className="size-4 text-ink-muted" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-line/60 bg-canvas/30 p-3.5 text-xs">
                          <p className="font-medium text-ink-muted">{meta.description}</p>
                          <div className="mt-2 space-y-1">
                            <span className="font-semibold text-ink">Reasoning Rules Fired:</span>
                            <ul className="list-inside list-disc space-y-0.5 text-ink-muted">
                              {hazardScore.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Source Feed Times */}
                          <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-line/40 text-[11px] text-ink-muted">
                            <Clock className="size-3.5 text-ink-subtle mt-0.5" />
                            <span>Source data freshness:</span>
                            {Object.entries(hazardScore.source_times || {}).map(
                              ([src, time]) => (
                                <span
                                  key={src}
                                  className="rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px]"
                                >
                                  {src}: {new Date(time).toLocaleTimeString()}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Disclaimer & Architecture Footnote */}
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-black/[0.03] p-3 text-xs text-ink-muted">
              <Info className="size-4 shrink-0 text-brand-700 mt-0.5" />
              <div>
                <p className="font-medium text-ink">
                  Rule-Based Engine Architecture
                </p>
                <p className="mt-0.5 leading-relaxed">
                  {overview.disclaimer} Risk scores are derived deterministically from IMD
                  district color warnings, GloFAS river discharge, NASA IMERG rainfall, and
                  SACHET CAP 1.2 XML official polygon broadcasts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
