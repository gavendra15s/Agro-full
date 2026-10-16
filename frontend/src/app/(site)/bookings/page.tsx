"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CalendarX,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Booking } from "@/lib/types";
import { toast } from "@/lib/toast-context";
import { cn, formatINR } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-brand-50 text-brand-700 border-brand-200",
  confirmed: "bg-brand-50 text-brand-700 border-brand-200",
  completed: "bg-black/5 text-ink-muted border-line",
  cancelled: "bg-red-50 text-danger border-red-200",
  weather_rescheduled: "bg-amber-50 text-amber-700 border-amber-200",
  weather_cancelled: "bg-orange-50 text-orange-700 border-orange-200",
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Weather-Aware Rebooking Modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [newCheckIn, setNewCheckIn] = useState("");
  const [newCheckOut, setNewCheckOut] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("Official IMD weather warning in corridor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safe acknowledgments state
  const [safeAcked, setSafeAcked] = useState<Record<string, boolean>>({});

  async function loadBookings() {
    try {
      const data = await api.bookings.list();
      setBookings(data);
    } catch (err) {
      console.warn("Failed to load user bookings:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function handleAcknowledgeSafe(bookingId: string) {
    try {
      const res = await api.safety.acknowledgeAlert(1, bookingId, "SAFE");
      if (res.success) {
        setSafeAcked((prev) => ({ ...prev, [bookingId]: true }));
        toast.success(
          "Safety status confirmed: 'I am safe'. Host & platform care team have been notified.",
          "Check-In Recorded"
        );
      } else {
        toast.error(res.error || "Unable to log safety status", "Error");
      }
    } catch (err: any) {
      toast.error(err.message, "Network Error");
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleBooking) return;
    if (!newCheckIn || !newCheckOut) {
      toast.error("Please select both a new check-in and check-out date.", "Validation");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.bookings.reschedule(rescheduleBooking.id, {
        new_start_date: newCheckIn,
        new_end_date: newCheckOut,
        reason: rescheduleReason,
      });

      if (res.success) {
        toast.success(
          "Stay rescheduled with zero penalty fees under our Weather-Aware 72h policy!",
          "Rescheduled"
        );
        setRescheduleBooking(null);
        loadBookings();
      } else {
        toast.error(res.error || "Failed to reschedule booking.", "Error");
      }
    } catch (err: any) {
      toast.error(err.message, "Network Error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My Bookings</h1>
          <p className="mt-2 text-ink-muted">
            Every stay you have booked, with live escrow protection and weather-aware rebooking.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-lg border border-line bg-surface animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <CalendarX size={28} />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">No Bookings Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            You have not booked any stays under this account. Explore certified rural farmstays with
            real-time safety monitoring and escrow guarantees.
          </p>
          <div className="mt-6">
            <ButtonLink href="/" variant="primary" size="md" className="inline-flex items-center gap-2">
              <Compass size={16} />
              Explore Verified Farmstays
            </ButtonLink>
          </div>
        </div>
      ) : (
        <ul className="mt-8 space-y-6">
          {bookings.map((b) => {
            const isSafe = safeAcked[b.id];
            const isUpcoming = b.status === "upcoming" || b.status === "confirmed";

            return (
              <li key={b.id}>
                <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start overflow-hidden">
                  <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-md sm:w-44">
                    <Image
                      src={b.image}
                      alt={b.farmName}
                      fill
                      sizes="(max-width: 640px) 100vw, 176px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-bold tracking-tight text-ink">{b.farmName}</h2>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                          STATUS_STYLES[b.status] || STATUS_STYLES.upcoming
                        )}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <MapPin size={15} aria-hidden />
                      {b.location}
                    </p>

                    <p className="text-sm font-medium text-ink">
                      {longDate(b.checkIn)} → {longDate(b.checkOut)} • {b.guests}{" "}
                      {b.guests === 1 ? "guest" : "guests"} • <span className="font-mono text-xs text-ink-subtle">Ref #{b.id}</span>
                    </p>

                    {/* Escrow Guarantee Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-brand-700 font-medium">
                      <ShieldCheck size={14} />
                      <span>Funds secured in Escrow • Released to host only post-checkout</span>
                    </div>

                    {/* Safety Alert & "I'm Safe" Banner if upcoming */}
                    {isUpcoming && (
                      <div className="mt-3 rounded-lg border border-line bg-canvas/60 p-3 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-ink">
                            <ShieldAlert size={14} className="text-brand-700" />
                            <span className="font-semibold">Weather &amp; Safety Protocol</span>
                          </div>

                          {isSafe ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 size={12} />
                              Safety Status: Safe
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeSafe(b.id)}
                              className="rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100 transition-colors cursor-pointer"
                            >
                              Check-In: &ldquo;I&apos;m Safe&rdquo;
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Under our <strong>Weather-Aware Policy</strong>, if an official IMD Orange/Red
                          alert is triggered for this corridor within 72h of check-in, all rebooking and
                          cancellation fees are 100% waived.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 space-y-2 sm:text-right">
                    <p className="text-2xl font-extrabold text-ink">{formatINR(b.total)}</p>

                    <div className="flex flex-col gap-2 pt-2">
                      <ButtonLink
                        href={`/farms/${b.farmSlug}`}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        View Farm
                      </ButtonLink>

                      {isUpcoming && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleBooking(b);
                            setNewCheckIn(b.checkIn);
                            setNewCheckOut(b.checkOut);
                          }}
                          className="w-full text-xs border-orange-300 text-orange-800 hover:bg-orange-50 cursor-pointer"
                        >
                          <RefreshCw size={12} className="mr-1.5" />
                          Change Dates (Free)
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Weather-Aware Date Change</h3>
                  <p className="text-xs text-ink-subtle">
                    100% Zero-Penalty Rebooking Guarantee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                className="text-ink-subtle hover:text-ink cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-lg bg-orange-50/70 border border-orange-200 p-3 text-xs text-orange-900 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle size={14} className="text-orange-600" />
                <span>Zero Fee Policy Active</span>
              </div>
              You may shift your reservation to any available future dates. All platform and host
              rescheduling fees are fully waived.
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">New Check-in Date</label>
                <input
                  type="date"
                  required
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">New Check-out Date</label>
                <input
                  type="date"
                  required
                  min={newCheckIn || undefined}
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Reason for Rescheduling</label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                >
                  <option value="Official IMD weather warning in corridor">
                    Official IMD weather warning in corridor
                  </option>
                  <option value="Landslide or heavy rainfall advisory">
                    Landslide or heavy rainfall advisory
                  </option>
                  <option value="Flooding or road transit blockage">
                    Flooding or road transit blockage
                  </option>
                  <option value="Personal travel schedule adjustment">
                    Personal travel schedule adjustment
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setRescheduleBooking(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  disabled={isSubmitting}
                  className="bg-brand-700 hover:bg-brand-800 text-white"
                >
                  {isSubmitting ? "Updating Stay..." : "Confirm Date Change"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
