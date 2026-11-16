"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Filter,
  Flame,
  MapPin,
  PhoneCall,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  Maximize2,
  Eye,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Warning } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_BADGES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-300",
  High: "bg-orange-100 text-orange-800 border-orange-300",
  Medium: "bg-amber-100 text-amber-800 border-amber-300",
  Low: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export default function WarningsFeedPage() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("Active");
  const [activePhoto, setActivePhoto] = useState<{ url: string; title: string; severity?: string; code?: string } | null>(null);

  useEffect(() => {
    async function loadWarnings() {
      setLoading(true);
      try {
        const data = await api.warnings.list(filterStatus);
        setWarnings(data);
      } finally {
        setLoading(false);
      }
    }
    loadWarnings();
  }, [filterStatus]);

  const filteredWarnings = warnings.filter((w) => {
    const matchSeverity = filterSeverity === "all" || w.severity === filterSeverity;
    const matchSource = filterSource === "all" || w.warningSource === filterSource;
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSeverity && matchSource && matchStatus;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hazard Warnings & Advisories
          </h1>
          <p className="mt-1 text-ink-muted max-w-2xl">
            Real-time regional safety alerts. Affected farmstays and bookings automatically receive escrow protections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/report" variant="outline" size="md" className="gap-2 border-danger text-danger hover:bg-danger/5">
            <AlertTriangle size={16} />
            Report Landslide Photo
          </ButtonLink>
          <ButtonLink href="/host/warnings/new" variant="primary" size="md" className="gap-2">
            <Radio size={16} />
            Host Broadcast
          </ButtonLink>
        </div>
      </div>

      {/* Emergency Hotline Bar */}
      <div className="mt-8 rounded-xl border border-red-200 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger text-white">
            <PhoneCall size={18} />
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-danger tracking-wide">
              Himalayan Disaster Emergency Response Helplines
            </p>
            <p className="text-sm font-semibold text-ink">
              Uttarakhand State Control Room: 1070 | NDRF Toll-Free: 1078 | BRO Highway Clearance: 1800-180-5555
            </p>
          </div>
        </div>
        <ButtonLink href="/safety" variant="outline" size="sm" className="shrink-0 bg-surface">
          View Matrix Safety Check
        </ButtonLink>
      </div>

      {/* Filters Bar */}
      <Card className="mt-8 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-ink-subtle flex items-center gap-1">
              <Filter size={14} /> Filter Feed:
            </span>

            {/* Status Filter */}
            <div className="flex rounded-lg border border-line p-1 bg-canvas">
              {["Active", "Expired", "all"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all",
                    filterStatus === status ? "bg-surface shadow-xs text-ink" : "text-ink-muted hover:text-ink"
                  )}
                >
                  {status === "all" ? "All Statuses" : status}
                </button>
              ))}
            </div>

            {/* Source Filter */}
            <div className="flex rounded-lg border border-line p-1 bg-canvas">
              {[
                { id: "all", label: "All Sources" },
                { id: "Automated_CNN", label: "Automated CNN" },
                { id: "Manual_Host", label: "Host Manual" },
              ].map((src) => (
                <button
                  key={src.id}
                  onClick={() => setFilterSource(src.id)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    filterSource === src.id ? "bg-surface shadow-xs text-ink" : "text-ink-muted hover:text-ink"
                  )}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <p className="text-xs text-ink-muted">
            Showing <strong>{filteredWarnings.length}</strong> warning records
          </p>
        </div>
      </Card>

      {/* Warnings List */}
      <div className="mt-8 space-y-6">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden border-l-4 border-l-brand-300 p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-64 lg:w-72 h-52 bg-line/50 shrink-0" />
                  <div className="p-6 flex-1 space-y-4">
                    <div className="h-6 w-3/4 rounded bg-line/60" />
                    <div className="h-4 w-1/2 rounded bg-line/40" />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="h-12 rounded-lg bg-line/30" />
                      <div className="h-12 rounded-lg bg-line/30" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          filteredWarnings.map((warning) => (
          <Card
            key={warning.id}
            className={cn(
              "overflow-hidden border-l-4 transition-all hover:shadow-md",
              warning.severity === "Critical"
                ? "border-l-danger bg-red-50/20"
                : warning.severity === "High"
                ? "border-l-orange-500 bg-orange-50/10"
                : warning.severity === "Medium"
                ? "border-l-amber-500"
                : "border-l-safe"
            )}
          >
            <div className="flex flex-col md:flex-row">
              {/* Alert Media Picture */}
              <div className="relative w-full md:w-64 lg:w-72 h-52 md:h-auto min-h-[200px] shrink-0 bg-slate-900 group">
                <img
                  src={warning.imageUrl || `https://picsum.photos/seed/${warning.id}/800/600`}
                  alt={warning.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 md:bg-gradient-to-r md:from-transparent md:to-black/20" />

                {/* Severity Badge overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-bold shadow-sm backdrop-blur-xs",
                      SEVERITY_BADGES[warning.severity]
                    )}
                  >
                    {warning.severity} Hazard
                  </span>
                  <span className="rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-mono text-white/90">
                    {warning.id}
                  </span>
                </div>

                {/* Enlarge Button */}
                <button
                  type="button"
                  onClick={() =>
                    setActivePhoto({
                      url: warning.imageUrl || `https://picsum.photos/seed/${warning.id}/800/600`,
                      title: warning.title,
                      severity: warning.severity,
                      code: warning.id,
                    })
                  }
                  className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/70 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-xs hover:bg-black/90 transition-colors cursor-pointer"
                >
                  <Maximize2 size={13} />
                  <span>Inspect Photo</span>
                </button>
              </div>

              {/* Alert Text & Actions Content */}
              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700 flex items-center gap-1">
                      {warning.warningSource === "Automated_CNN" ? (
                        <>
                          <Cpu size={12} className="text-indigo-600" /> Automated Verification
                        </>
                      ) : (
                        <>
                          <Users size={12} className="text-emerald-700" /> Host Broadcast
                        </>
                      )}
                    </span>

                    {warning.status === "Active" ? (
                      <span className="rounded-md bg-red-100 text-danger border border-red-200 px-2 py-0.5 text-[11px] font-bold animate-pulse">
                        LIVE ALERT
                      </span>
                    ) : (
                      <span className="rounded-md bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 text-[11px] font-medium">
                        CLEARED / EXPIRED
                      </span>
                    )}

                    {warning.farmName && (
                      <span className="rounded-md bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                        {warning.farmName}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold tracking-tight text-ink">{warning.title}</h2>
                  <p className="text-sm text-ink-muted leading-relaxed">{warning.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-subtle pt-2">
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin size={14} className="text-danger" /> Epicenter: {warning.epicenterLat}° N, {warning.epicenterLng}° E
                    </span>
                    <span className="flex items-center gap-1">
                      <Compass size={14} /> Blast Radius: <strong>{warning.impactRadiusKm} km</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> Issued: {warning.issuedAt}
                    </span>
                    <span className="flex items-center gap-1 text-ink-muted">
                      Expires: {warning.expiresAt}
                    </span>
                  </div>
                </div>

                {/* Bottom Impact & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-line/60 pt-4">
                  <div>
                    <span className="text-xs text-ink-subtle font-medium">
                      Impacted Corridor: <strong className="text-ink">{warning.affectedFarmsCount} Farmstays</strong> &bull;{" "}
                      <strong className="text-ink">{warning.affectedBookingsCount} Bookings</strong>
                    </span>
                    <p className="text-[11px] text-safe font-semibold">100% Escrow Refund Protected</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {warning.farmSlug && (
                      <ButtonLink href={`/farms/${warning.farmSlug}`} variant="outline" size="sm">
                        View Farm
                      </ButtonLink>
                    )}
                    <ButtonLink href="/escrow" variant="primary" size="sm">
                      Escrow Status
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))
        )}

        {!loading && filteredWarnings.length === 0 && (
          <Card className="p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-safe" />
            <h3 className="mt-3 text-lg font-bold">No Warnings Match Your Filter</h3>
            <p className="mt-1 text-xs text-ink-muted">Try switching between Active / Expired or All Sources.</p>
          </Card>
        )}
      </div>

      {/* Lightbox / Modal for Alert Photo Inspection */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-2xl bg-surface border border-line overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-canvas">
              <div>
                <span className="text-xs font-mono font-bold text-danger uppercase">
                  {activePhoto.code || "HAZARD OBSERVATION"}
                </span>
                <h3 className="text-base font-bold text-ink">{activePhoto.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="rounded-lg p-1.5 text-ink-subtle hover:bg-black/5 hover:text-ink transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
            <div className="p-4 bg-surface flex items-center justify-between text-xs text-ink-muted">
              <span>High-resolution hazard telemetry photograph</span>
              <Button size="sm" variant="outline" onClick={() => setActivePhoto(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DFD / CFD Educational Guide */}
      <div className="mt-16 rounded-xl border border-line bg-surface p-8">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ShieldAlert size={20} className="text-brand-700" /> How AgroSafe Warning Dispatch Operates (CFD / DFD Pipeline)
        </h3>
        <div className="mt-6 grid gap-6 md:grid-cols-3 text-xs leading-relaxed text-ink-muted">
          <div className="rounded-lg border border-line p-4 bg-canvas/40">
            <p className="font-bold text-ink text-sm flex items-center gap-1.5">
              <Cpu size={16} className="text-indigo-600" /> 1. CNN Image Inference
            </p>
            <p className="mt-2">
              Citizen landslide reports undergo automated visual classification. Reports scoring above the 0.70 confidence threshold automatically generate an active warning record in DB.
            </p>
          </div>
          <div className="rounded-lg border border-line p-4 bg-canvas/40">
            <p className="font-bold text-ink text-sm flex items-center gap-1.5">
              <Users size={16} className="text-emerald-700" /> 2. Verified Host Triggers
            </p>
            <p className="mt-2">
              Local farmstay hosts have direct operational authority to issue manual hazard broadcasts. The system cross-references nearby properties within the specified radius.
            </p>
          </div>
          <div className="rounded-lg border border-line p-4 bg-canvas/40">
            <p className="font-bold text-ink text-sm flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-600" /> 3. Escrow Safeguard
            </p>
            <p className="mt-2">
              Active warnings trigger an instant lock on affected stays. Guests can cancel with a single tap for a 100% full refund directly from the AgroSafe Escrow Vault.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
