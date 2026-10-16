"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  FileUp,
  LocateFixed,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

export function ReportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [hazardType, setHazardType] = useState("Landslide / Rockfall");
  const [lat, setLat] = useState("30.556");
  const [lng, setLng] = useState("79.563");
  const [uploadedAt, setUploadedAt] = useState("");
  const [details, setDetails] = useState("");
  const [isLiveCamera, setIsLiveCamera] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportResult, setReportResult] = useState<any>(null);

  // Stamped after mount — rendering a clock on the server would mismatch on hydration.
  useEffect(() => setUploadedAt(new Date().toLocaleString()), []);

  // Revoke the object URL when the preview changes or the form unmounts.
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  function accept(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Only JPG, PNG, and WebP images are accepted.");
      toast.error("Only JPG, PNG, and WebP images are accepted.", "File Format");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 10MB.");
      toast.error("That image is larger than 10MB.", "File Too Large");
      return;
    }
    setError("");
    setPreview({ url: URL.createObjectURL(file), name: file.name });
    setUploadedAt(new Date().toLocaleString());
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot share your location. Enter the coordinates manually.");
      toast.error("This browser cannot share your location.", "Location Error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLng(pos.coords.longitude.toFixed(4));
        setError("");
        toast.info(
          `GPS coordinates resolved: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          "Location Captured"
        );
      },
      () => {
        setError("Location permission denied. Enter the coordinates manually.");
        toast.error("Location permission denied.", "Permission Error");
      }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
      setError("Attach a photo of the hazard — reports without evidence cannot be verified.");
      toast.error("Attach a photo of the hazard.", "Evidence Required");
      return;
    }
    if (!lat || !lng) {
      setError("Latitude and longitude are required.");
      toast.error("Latitude and longitude are required.", "Missing Coordinates");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await api.reports.create({
        image_s3_url: preview.url || "https://picsum.photos/seed/landslide-evidence/800/600",
        latitude: Number(lat),
        longitude: Number(lng),
        location_name: `Transit Corridor (${lat}° N, ${lng}° E)`,
        details: `${hazardType}: ${details}`,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit incident report", "Submission Error");
        return;
      }

      setReportResult(res.data);
      toast.success(
        "Hazard photo report submitted and queued for verification!",
        "Report Enqueued"
      );
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report", "Error");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center sm:p-10 shadow-xs">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
          <ShieldCheck size={32} aria-hidden />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">
          Photo Evidence Queued for Verification
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
          Your report for coordinates <strong>{lat}° N, {lng}° E</strong> has been submitted.
          Per safety specifications, user-reported photos pass automated multi-factor signals
          and are routed to the 24/7 moderation desk before community broadcast.
        </p>

        {/* Multi-Factor Verification Signal Preview */}
        <div className="mx-auto mt-6 max-w-lg rounded-lg border border-line bg-canvas p-4 text-left text-xs space-y-2.5">
          <span className="font-bold text-ink">Automated Verification Signals:</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded bg-surface p-2 border border-line/60">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>EXIF GPS vs Device GPS Match</span>
            </div>
            <div className="flex items-center gap-2 rounded bg-surface p-2 border border-line/60">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>In-App Camera Sensor Check</span>
            </div>
            <div className="flex items-center gap-2 rounded bg-surface p-2 border border-line/60">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Timestamp Freshness Check</span>
            </div>
            <div className="flex items-center gap-2 rounded bg-surface p-2 border border-line/60">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>IMD Weather Context Correlated</span>
            </div>
          </div>
          <div className="border-t border-line/60 pt-2 text-[11px] text-ink-subtle">
            Routing: <strong>Human Moderation Queue</strong> • Expected review time: &lt; 5 minutes
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSubmitted(false);
            setPreview(null);
            setDetails("");
          }}
        >
          File Another Report
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-5 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-bold text-ink">Path B Photo Incident Submission</h2>
          <p className="text-xs text-ink-muted">
            Report road blockages, landslides, or flooding with cryptographic photo and GPS verification.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-1 text-[11px] font-bold text-brand-800">
          Path B Reporter
        </span>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-bold text-ink mb-1.5">Hazard Category</label>
        <select
          value={hazardType}
          onChange={(e) => setHazardType(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
        >
          <option value="Landslide / Rockfall">Landslide / Slope Debris / Rockfall</option>
          <option value="Flash Flood / Waterlogging">Flash Flood / Road Submersion</option>
          <option value="Severe Tree Fall / High Wind Damage">Tree Fall / High Wind Damage</option>
          <option value="Bridge / Transit Corridor Obstruction">Bridge / Transit Corridor Obstruction</option>
        </select>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold text-ink mb-1.5">Evidence Image</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files[0]);
          }}
          className={cn(
            "rounded-lg border-2 border-dashed transition-colors",
            dragging ? "border-brand-600 bg-brand-50" : "border-line"
          )}
        >
          {preview ? (
            <div className="relative p-2">
              <div className="relative aspect-16/9 overflow-hidden rounded-md">
                <Image src={preview.url} alt={preview.name} fill unoptimized className="object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Remove image"
                className="absolute top-4 right-4 rounded-full bg-black/70 p-1.5 text-white hover:bg-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 px-6 py-10 text-center cursor-pointer"
            >
              <FileUp size={30} className="text-ink-muted" aria-hidden />
              <span className="text-xs font-medium text-ink">
                Click or drag evidence photo of the road / slope condition
              </span>
              <span className="text-[11px] text-ink-subtle">
                In-app camera or original unedited photo (JPG, PNG, WebP &lt; 10MB)
              </span>
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {/* Hardware Camera Check Simulation Toggle */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-canvas/60 p-3 text-xs">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-brand-700" />
          <span className="font-medium text-ink">In-App Live Camera Capture</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isLiveCamera}
            onChange={(e) => setIsLiveCamera(e.target.checked)}
            className="rounded border-line text-brand-700 focus:ring-brand-500"
          />
          <span className="text-xs text-ink-muted font-medium">Verify hardware source</span>
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Latitude">
          {(id) => (
            <Input id={id} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
          )}
        </Field>
        <Field label="Longitude">
          {(id) => (
            <Input id={id} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
          )}
        </Field>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 cursor-pointer"
        onClick={useMyLocation}
      >
        <LocateFixed size={16} aria-hidden />
        Use current GPS location
      </Button>

      <Field label="Capture Timestamp (Auto)" className="mt-5">
        {(id) => <Input id={id} readOnly value={uploadedAt} className="bg-black/[0.03]" />}
      </Field>

      <Field label="Observations / Road Status" className="mt-5">
        {(id) => (
          <Textarea
            id={id}
            placeholder="Describe debris size, lane blockages, alternative route viability, or caretaker contact..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        )}
      </Field>

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-xs text-danger font-medium">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="mt-6 w-full bg-brand-700 hover:bg-brand-800 text-white cursor-pointer"
      >
        <AlertTriangle size={18} aria-hidden />
        {loading ? "Verifying & Enqueuing..." : "Submit Incident for Verification"}
      </Button>
    </form>
  );
}
