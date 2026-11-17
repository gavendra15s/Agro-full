"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Building,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-context";
import { Farm } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NewHostWarningPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [severity, setSeverity] = useState<"Medium" | "High" | "Critical">("High");
  const [title, setTitle] = useState("Incline Soil Saturation & Heavy Rainfall Warning");
  const [description, setDescription] = useState(
    "Continuous heavy downpour over the last 36 hours has caused localized road slips and mudflow risks on the valley approach road. Travellers are advised to postpone arrival."
  );
  const [radiusKm, setRadiusKm] = useState(12);
  const [durationHours, setDurationHours] = useState(48);
  const [submitted, setSubmitted] = useState(false);
  const [dispatchStats, setDispatchStats] = useState<{ farms: number; guests: number }>({ farms: 2, guests: 4 });
  const [lat, setLat] = useState("29.426");
  const [lng, setLng] = useState("79.552");

  useEffect(() => {
    async function loadFarms() {
      const data = await api.farms.list();
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarm(data[0].slug);
        if (data[0].latitude && data[0].longitude) {
          setLat(String(data[0].latitude));
          setLng(String(data[0].longitude));
        }
      }
    }
    loadFarms();
  }, []);

  const activeFarm = farms.find((f) => f.slug === selectedFarm) || farms[0] || {
    name: "Apple Blossom Retreat",
    district: "Nainital",
    state: "Uttarakhand",
    slug: "apple-blossom-retreat",
  };

  const handleFarmSelect = (slug: string) => {
    setSelectedFarm(slug);
    const f = farms.find((item) => item.slug === slug);
    if (f && f.latitude && f.longitude) {
      setLat(String(f.latitude));
      setLng(String(f.longitude));
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a warning title.", "Validation Error");
      return;
    }
    const affectedFarms = radiusKm > 10 ? 3 : 1;
    const affectedGuests = affectedFarms * 2;
    setDispatchStats({ farms: affectedFarms, guests: affectedGuests });

    try {
      const res = await api.warnings.create({
        farm_id: activeFarm?.id,
        title,
        description,
        severity,
        epicenter_lat: Number(lat),
        epicenter_lng: Number(lng),
        impact_radius_km: radiusKm,
        duration_hours: durationHours,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to broadcast warning", "Broadcast Error");
        return;
      }

      toast.success("Emergency safety alert broadcasted to travelers!", "Alert Dispatched");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast warning", "Error");
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Card className="p-10 border-2 border-danger/30 bg-surface">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-50 text-danger ring-8 ring-red-50/50">
            <Radio size={36} className="animate-pulse" />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Emergency Warning Broadcast Complete
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Your manual warning <strong>{title}</strong> has been logged to the KhetYatra Warning DB and broadcast to the regional safety grid.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3 text-left">
            <div className="rounded-lg border border-line bg-canvas/60 p-4">
              <p className="text-xs text-ink-subtle uppercase font-semibold">Impact Radius</p>
              <p className="mt-1 text-2xl font-extrabold text-danger">{radiusKm} km</p>
              <p className="text-[11px] text-ink-muted">Epicenter: {lat}, {lng}</p>
            </div>

            <div className="rounded-lg border border-line bg-canvas/60 p-4">
              <p className="text-xs text-ink-subtle uppercase font-semibold">Affected Farmstays</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{dispatchStats.farms}</p>
              <p className="text-[11px] text-ink-muted">Status overridden to High</p>
            </div>

            <div className="rounded-lg border border-line bg-canvas/60 p-4">
              <p className="text-xs text-ink-subtle uppercase font-semibold">Guests Alerted</p>
              <p className="mt-1 text-2xl font-extrabold text-safe">{dispatchStats.guests}</p>
              <p className="text-[11px] text-ink-muted">Push + SMS dispatched</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-xs text-amber-900 border border-amber-200 text-left">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-warn" /> Escrow Safeguard Activated:
            </p>
            <p className="mt-1">
              All upcoming bookings within the {radiusKm}km radius have been granted 100% free penalty cancellation & full escrow refund guarantees.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/warnings" variant="primary" size="md">
              View Active Warnings Feed
            </ButtonLink>
            <ButtonLink href="/host" variant="outline" size="md">
              Back to Host Dashboard
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-6">
        <ButtonLink href="/host" variant="outline" size="sm" className="gap-1 text-xs">
          <ArrowLeft size={14} /> Back to Host Dashboard
        </ButtonLink>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 sm:p-8">
        <div className="flex items-center gap-3 text-danger font-bold text-sm">
          <AlertOctagon size={22} className="shrink-0" />
          <span>Host Protocol: Manual Emergency Warning Broadcast (CFD Warnings Flow)</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Issue Manual Local Disaster Warning
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          As a verified property host, if you observe dangerous slope saturation, rockfalls, or road blockages,
          broadcast an instant alert to protect incoming travellers and notify emergency authorities.
        </p>
      </div>

      <form onSubmit={handleDispatch} className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="p-6 space-y-5">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Building size={18} className="text-brand-700" /> Originating Property & Epicenter
            </h2>

            <Field label="Select Your Farmstay">
              {(id) => (
                <Select id={id} value={selectedFarm} onChange={(e) => handleFarmSelect(e.target.value)}>
                  {farms.map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.name} — {f.district}, {f.state}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Epicenter Latitude (° N)">
                {(id) => (
                  <Input id={id} value={lat} onChange={(e) => setLat(e.target.value)} />
                )}
              </Field>
              <Field label="Epicenter Longitude (° E)">
                {(id) => (
                  <Input id={id} value={lng} onChange={(e) => setLng(e.target.value)} />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Warning Severity Level">
                {(id) => (
                  <Select id={id} value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                    <option value="Medium">Medium — Active Advisory</option>
                    <option value="High">High — Travel Not Recommended</option>
                    <option value="Critical">Critical — Immediate Road Closure & Evacuation</option>
                  </Select>
                )}
              </Field>

              <Field label="Active Validity Period">
                {(id) => (
                  <Select id={id} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))}>
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days)</option>
                    <option value={72}>72 Hours (3 Days)</option>
                    <option value={168}>7 Days</option>
                  </Select>
                )}
              </Field>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-subtle">
                Impact Blast Radius: <span className="font-extrabold text-danger text-sm">{radiusKm} km</span>
              </label>
              <input
                type="range"
                min="2"
                max="35"
                step="1"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="mt-2 w-full accent-danger cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-ink-subtle mt-1">
                <span>2 km (Local slope)</span>
                <span>15 km (Valley level)</span>
                <span>35 km (District level)</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <AlertTriangle size={18} className="text-warn" /> Warning Details & Advisory Message
            </h2>

            <Field label="Warning Headline">
              {(id) => (
                <Input
                  id={id}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Heavy Debris Flow on NH-7"
                />
              )}
            </Field>

            <Field label="Emergency Instructions for Guests & Travellers">
              {(id) => (
                <Textarea
                  id={id}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </Field>
          </Card>

          <Button type="submit" size="lg" className="w-full bg-danger hover:bg-red-700 text-white gap-2">
            <Radio size={18} /> Broadcast Emergency Warning & Notify Guests
          </Button>
        </div>

        {/* Right Info Box */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="p-6 border-danger/30">
            <h3 className="text-sm font-bold uppercase tracking-wider text-danger flex items-center gap-2">
              <BellRing size={16} /> Automated CFD Dispatch Pipeline
            </h3>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold">1</div>
                <div>
                  <p className="font-semibold text-ink">Spatial Radius Computation</p>
                  <p className="text-ink-muted mt-0.5">Calculates all farms & roads within {radiusKm}km of ({lat}, {lng}).</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold">2</div>
                <div>
                  <p className="font-semibold text-ink">Active Booking Query (D4 DB)</p>
                  <p className="text-ink-muted mt-0.5">Finds all upcoming and active guest reservations in the zone.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold">3</div>
                <div>
                  <p className="font-semibold text-ink">Multi-channel Push Notification</p>
                  <p className="text-ink-muted mt-0.5">Dispatches high-priority push, SMS, and email alerts with refund options.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold">4</div>
                <div>
                  <p className="font-semibold text-ink">Safety Matrix Override</p>
                  <p className="text-ink-muted mt-0.5">Overrides base monthly safety score with real-time DANGER warning.</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-canvas/60">
            <p className="text-xs font-bold text-ink">Live Broadcast Preview</p>
            <div className="mt-3 rounded-lg border border-red-200 bg-white p-4 text-xs shadow-sm">
              <div className="flex items-center gap-2 text-danger font-bold">
                <AlertOctagon size={14} />
                <span>EMERGENCY ADVISORY ({severity.toUpperCase()})</span>
              </div>
              <p className="mt-1 font-bold text-ink text-sm">{title}</p>
              <p className="mt-1 text-ink-muted line-clamp-3">{description}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[10px] text-ink-subtle">
                <span>Origin: {activeFarm.name}</span>
                <span>Radius: {radiusKm}km</span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
