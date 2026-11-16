"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { LandslideReport, Warning } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-danger border-red-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-brand-50 text-brand-700 border-brand-200",
};

export default function LivePage() {
  const [reports, setReports] = useState<LandslideReport[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  async function loadData() {
    setLoading(true);
    try {
      const [reportsData, warningsData] = await Promise.all([
        api.reports.list(),
        api.warnings.list("Active"),
      ]);
      setReports(reportsData);
      setWarnings(warningsData);
      setLastRefreshed(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.warn("Failed to fetch live hazard telemetry:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Live Hazard Status
          </h1>
          <p className="mt-1 text-ink-muted">
            Real-time verified road observations and active regional weather warnings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Telemetry
          </Button>
          <ButtonLink href="/report" variant="primary" size="sm" className="gap-2">
            <FilePlus2 size={14} />
            Report Landslide
          </ButtonLink>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Active Warnings</p>
            <AlertOctagon size={20} className={warnings.length > 0 ? "text-danger" : "text-safe"} />
          </div>
          <p className={cn("mt-3 text-3xl font-extrabold", warnings.length > 0 ? "text-danger" : "text-ink")}>
            {warnings.length}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {warnings.length === 0 ? "No active warning broadcasts" : "Regional danger alerts active"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Verified Observations</p>
            <AlertTriangle size={20} className={reports.length > 0 ? "text-warn" : "text-safe"} />
          </div>
          <p className={cn("mt-3 text-3xl font-extrabold", reports.length > 0 ? "text-amber-600" : "text-ink")}>
            {reports.length}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {reports.length === 0 ? "Zero blockage reports" : "Logged citizen hazard reports"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Corridor Status</p>
            <ShieldCheck size={20} className="text-safe" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-safe flex items-center gap-2">
            <CheckCircle2 size={24} /> {reports.length + warnings.length === 0 ? "Stable" : "Caution"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Automated safety matrix monitoring
          </p>
        </Card>
      </div>

      {/* Active Warning Broadcasts (if any) */}
      {warnings.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-danger">
            <AlertOctagon size={18} /> Active Warning Broadcasts ({warnings.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {warnings.map((w) => (
              <Card key={w.id} className="overflow-hidden border-l-4 border-l-danger bg-red-50/40">
                <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                  <img
                    src={w.imageUrl || `https://picsum.photos/seed/${w.id}/800/600`}
                    alt={w.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-md bg-red-600/90 text-white px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur-xs">
                      {w.warningSource.replace(/_/g, " ")}
                    </span>
                    <span className="rounded-md bg-black/60 text-white/90 px-1.5 py-0.5 text-[10px] font-mono">
                      {w.id}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <h4 className="font-bold text-sm text-white drop-shadow-sm truncate">{w.title}</h4>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">{w.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-red-200/60 pt-2 text-xs text-ink-subtle">
                    <span>Epicenter: {w.epicenterLat}° N, {w.epicenterLng}° E</span>
                    <span className="font-semibold text-danger">{w.impactRadiusKm} km radius</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Verified Landslide Reports Table */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Verified Landslide Observations</h2>
            <p className="text-xs text-ink-muted mt-0.5">Citizen photo uploads verified through automated classification.</p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
            <CheckCircle2 size={36} className="mx-auto text-safe" />
            <h3 className="mt-3 text-base font-bold">No Active Hazards Reported</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
              All monitored routes are currently clear. No landslide blockages or debris movements have been logged in the past 7 days.
            </p>
            <div className="mt-5">
              <ButtonLink href="/report" variant="outline" size="sm" className="gap-1.5 text-xs">
                <FilePlus2 size={14} /> Submit Road Observation
              </ButtonLink>
            </div>
          </div>
        ) : (
          <Card className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line text-left bg-canvas/40">
                <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                  <th scope="col" className="px-5 py-3.5 font-semibold">Report Code</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Location / Sector</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Coordinates</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Severity</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Reported At</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-black/[0.01]">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-brand-700">{r.id}</td>
                    <td className="px-5 py-4 font-medium">{r.location}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-muted">
                      {r.lat}° N, {r.lng}° E
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.Medium,
                        )}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-muted">{r.reportedAt}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-safe">
                        <CheckCircle2 size={13} /> {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
