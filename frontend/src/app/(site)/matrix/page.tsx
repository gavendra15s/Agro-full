"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MATRIX_FEATURE_ENABLED } from "@/lib/feature-flags";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CloudRain,
  Compass,
  Cpu,
  Database,
  Flame,
  Globe,
  HelpCircle,
  Layers,
  MapPin,
  Mountain,
  Shield,
  ShieldAlert,
  Sparkles,
  Waves,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { STATIC_GEO_REFS } from "@/lib/data/farms";
import { MonthlySafetyRecord, Warning } from "@/lib/types";
import { cn } from "@/lib/utils";

const DISTRICTS = ["Nainital", "Chamoli", "Wayanad"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const RATING_COLORS: Record<string, string> = {
  Safe: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Moderate: "bg-amber-50 text-amber-800 border-amber-200",
  "High Risk": "bg-red-50 text-danger border-red-200",
};

export default function SafetyMatrixExplorerPage() {
  if (!MATRIX_FEATURE_ENABLED) notFound();

  const [selectedDistrict, setSelectedDistrict] = useState("Chamoli");
  const [selectedMonth, setSelectedMonth] = useState(8); // August
  const [districtRecords, setDistrictRecords] = useState<MonthlySafetyRecord[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  useEffect(() => {
    async function loadMatrix() {
      const [matrixData, warningsData] = await Promise.all([
        api.safety.matrix(selectedDistrict, 2026),
        api.warnings.list("Active"),
      ]);
      setDistrictRecords(matrixData);
      setWarnings(warningsData);
    }
    loadMatrix();
  }, [selectedDistrict]);

  const activeRecord = districtRecords.find((m) => m.month === selectedMonth) || districtRecords[0] || {
    month: 8,
    monthName: "August",
    year: 2026,
    district: selectedDistrict,
    state: "Uttarakhand",
    safetyRating: "High Risk",
    rainfallMm: 490,
    soilStabilityIndex: 34,
    historicalLandslidesCount: 18,
    activeOverrideAlert: true,
  };

  // Active warning for this district (if any)
  const activeDistrictWarning = warnings.find(
    (w) => w.status === "Active" && (w.title.includes(selectedDistrict) || w.description.includes(selectedDistrict))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Seasonal Safety Matrix
          </h1>
          <p className="mt-1 text-ink-muted max-w-3xl">
            Evaluate 12-month historical rainfall patterns, slope stability indexes, and active danger overrides across monitored districts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ButtonLink href="/warnings" variant="outline" size="md" className="gap-1.5">
            <AlertTriangle size={16} className="text-danger" /> View Live Warnings
          </ButtonLink>
          <ButtonLink href="/safety" variant="primary" size="md">
            Farm Matrix Check
          </ButtonLink>
        </div>
      </div>

      {/* Safety Evaluation Summary */}
      <Card className="mt-8 p-6 bg-surface border border-line">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-lg font-bold tracking-tight">How Safety Ratings Work</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              When a guest views a region, the system combines historical seasonal rainfall data with active weather alerts.
              If an active hazard warning is triggered in the area, the property rating automatically updates to High Risk with immediate escrow refund protections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ButtonLink href="/warnings" variant="outline" size="sm" className="text-xs">
              Check Active Warnings
            </ButtonLink>
          </div>
        </div>
      </Card>

      {/* District Selector & Matrix Calendar Heatmap */}
      <div className="mt-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Select District:</span>
            <div className="flex rounded-lg border border-line p-1 bg-surface">
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDistrict(d)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
                    selectedDistrict === d
                      ? "bg-brand-700 text-white shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            State: <strong>{districtRecords[0]?.state}</strong> • 12-Month Monitored Grid
          </p>
        </div>

        {/* 12-Month Heatmap Grid */}
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-subtle mb-4">
            Annual Hazard Matrix Grid ({selectedDistrict} — 2026)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
            {districtRecords.map((rec) => {
              const isSelected = selectedMonth === rec.month;
              return (
                <button
                  key={rec.month}
                  type="button"
                  onClick={() => setSelectedMonth(rec.month)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[120px]",
                    isSelected ? "ring-2 ring-brand-700 shadow-md border-brand-700" : "hover:border-ink-subtle",
                    rec.safetyRating === "Safe"
                      ? "bg-emerald-50/50 border-emerald-200"
                      : rec.safetyRating === "Moderate"
                      ? "bg-amber-50/50 border-amber-200"
                      : "bg-red-50/60 border-red-200"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">{rec.monthName.slice(0, 3)}</span>
                      {rec.activeOverrideAlert && (
                        <span className="size-2 rounded-full bg-danger animate-ping" title="Active Real-time Override" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 text-[11px] font-bold",
                        rec.safetyRating === "Safe"
                          ? "text-emerald-700"
                          : rec.safetyRating === "Moderate"
                          ? "text-amber-700"
                          : "text-danger"
                      )}
                    >
                      {rec.safetyRating}
                    </p>
                  </div>

                  <div className="text-[10px] text-ink-subtle border-t border-black/5 pt-1.5 space-y-0.5">
                    <p>{rec.rainfallMm}mm rain</p>
                    <p>Soil: {rec.soilStabilityIndex}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Selected Month In-Depth Diagnostic */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="text-xs font-bold text-brand-700 uppercase">Detailed Monthly Diagnostic</span>
                <h3 className="text-xl font-bold mt-0.5">{activeRecord.monthName} 2026 — {selectedDistrict}, {activeRecord.state}</h3>
              </div>
              <span
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-semibold uppercase",
                  RATING_COLORS[activeRecord.safetyRating]
                )}
              >
                Rating: {activeRecord.safetyRating}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-canvas/60 p-4">
                <div className="flex items-center justify-between text-ink-subtle">
                  <span className="text-xs uppercase font-semibold">Monthly Rainfall</span>
                  <CloudRain size={16} className="text-brand-700" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink">{activeRecord.rainfallMm} mm</p>
                <p className="text-[11px] text-ink-muted">Historical monthly avg</p>
              </div>

              <div className="rounded-lg border border-line bg-canvas/60 p-4">
                <div className="flex items-center justify-between text-ink-subtle">
                  <span className="text-xs uppercase font-semibold">Soil Stability Index</span>
                  <Mountain size={16} className="text-brand-700" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink">{activeRecord.soilStabilityIndex}/100</p>
                <p className="text-[11px] text-ink-muted">Sensor slope telemetry</p>
              </div>

              <div className="rounded-lg border border-line bg-canvas/60 p-4">
                <div className="flex items-center justify-between text-ink-subtle">
                  <span className="text-xs uppercase font-semibold">Historical Landslides</span>
                  <Waves size={16} className="text-brand-700" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink">{activeRecord.historicalLandslidesCount}</p>
                <p className="text-[11px] text-ink-muted">Recorded over 10 years</p>
              </div>
            </div>

            {/* Realtime Warning Active Override Notice */}
            {activeRecord.activeOverrideAlert && (
              <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-xs text-red-900 space-y-2">
                <p className="font-bold text-sm flex items-center gap-2 text-danger">
                  <ShieldAlert size={18} /> Active Warning Override Applied:
                </p>
                <p>
                  Although the base monthly rating is evaluated, there is currently an <strong>active real-time danger alert</strong> in this district (NH-7 Joshimath Sector Debris Flow).
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <ButtonLink href="/warnings" variant="outline" size="sm" className="border-red-300 bg-white text-danger">
                    Inspect Warning Details
                  </ButtonLink>
                </div>
              </div>
            )}
          </Card>

          {/* Static Geo Reference Directory */}
          <Card className="p-6">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <MapPin size={16} className="text-brand-700" /> Static Geo References for {selectedDistrict} (ERD: STATIC_GEO_REFERENCE)
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Center coordinates used as automatic fallback when farmstays do not specify custom GPS hardware.
            </p>

            <div className="mt-4 divide-y divide-line rounded-lg border border-line overflow-hidden text-xs">
              {STATIC_GEO_REFS.filter((g) => g.district === selectedDistrict).map((geo) => (
                <div key={geo.subDistrict} className="p-3.5 flex items-center justify-between bg-surface">
                  <div>
                    <p className="font-bold text-ink">{geo.subDistrict}</p>
                    <p className="text-ink-subtle">{geo.district}, {geo.state}</p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-brand-700">
                    {geo.centerLatitude}° N, {geo.centerLongitude}° E
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Travel Advisory Box */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
              <Compass size={16} /> Himalayan Travel Recommendation
            </h3>

            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="rounded-lg border border-line bg-canvas/40 p-4">
                <p className="font-bold text-ink">Peak Safe Season (Oct — Apr)</p>
                <p className="text-ink-muted mt-1">
                  Stable crystalline bedrock slopes, minimal rainfall, clear skies. Recommended for all orchard farmstays and high-altitude hiking.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-canvas/40 p-4">
                <p className="font-bold text-ink">Monsoon Precaution Season (Jun — Sep)</p>
                <p className="text-ink-muted mt-1">
                  Requires 24/7 KhetYatra Sensor Monitoring. All bookings in this window are backed with 100% Escrow Protection against road blockages.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <ButtonLink href="/safety" variant="primary" size="md" className="w-full">
                Verify My Planned Farmstay
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
