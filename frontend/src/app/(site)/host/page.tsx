"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building,
  DollarSign,
  Plus,
  AlertOctagon,
  ShieldCheck,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Inbox,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { SafetyBadge } from "@/components/ui/safety-badge";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { Farm, Booking, PaymentEscrow } from "@/lib/types";
import { formatINR, cn } from "@/lib/utils";

export default function HostDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"farms" | "bookings" | "escrow">("farms");
  const [hostFarms, setHostFarms] = useState<Farm[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [escrowList, setEscrowList] = useState<PaymentEscrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [seatsDraft, setSeatsDraft] = useState("");
  const [savingSeats, setSavingSeats] = useState(false);

  function startEditSeats(farm: Farm) {
    setEditingSlug(farm.slug);
    setSeatsDraft(String(farm.maxGuests ?? 10));
  }

  async function saveSeats(slug: string) {
    const n = Number(seatsDraft);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter a valid number of seats (1 or more).", "Invalid Value");
      return;
    }
    setSavingSeats(true);
    try {
      const res = await api.farms.updateCapacity(slug, Math.floor(n));
      if (!res.success) {
        toast.error(res.error || "Failed to update seat capacity", "Error");
        return;
      }
      setHostFarms((prev) => prev.map((f) => (f.slug === slug ? { ...f, maxGuests: Math.floor(n) } : f)));
      toast.success("Seat capacity updated.", "Saved");
      setEditingSlug(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update seat capacity", "Error");
    } finally {
      setSavingSeats(false);
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [farmsData, bookingsData, escrowsData] = await Promise.all([
          api.farms.list({ host_id: user.id }),
          api.bookings.list(),
          api.escrow.list(),
        ]);
        setHostFarms(farmsData);
        setHostBookings(bookingsData);
        setEscrowList(escrowsData);
      } catch (err: any) {
        console.warn("Failed to load host dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const totalEarnings = escrowList
    .filter((e) => e.escrowStatus === "Released_To_Host")
    .reduce((sum, e) => sum + e.stayAmount, 0);

  const pendingEscrow = escrowList
    .filter((e) => e.escrowStatus === "Held_In_Escrow")
    .reduce((sum, e) => sum + e.stayAmount, 0);

  const handleReleasePayout = async (paymentId: string, guestName: string) => {
    try {
      const res = await api.escrow.release(paymentId, `Escrow payout released to host account for ${guestName}`);
      if (!res.success) {
        toast.error(res.error || "Failed to release escrow payout", "Escrow Error");
        return;
      }
      setEscrowList((prev) =>
        prev.map((item) =>
          item.paymentId === paymentId
            ? { ...item, escrowStatus: "Released_To_Host" }
            : item
        )
      );
      toast.success(`Escrow payout for ${guestName} released to your account.`, "Payout Released");
    } catch (err: any) {
      toast.error(err.message || "Escrow release failed", "Error");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Host Dashboard
          </h1>
          <p className="mt-1 text-ink-muted">
            Manage your farmstay listings, track guest check-ins, and oversee escrow payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/host/warnings/new" variant="outline" size="md" className="gap-2 border-danger text-danger hover:bg-danger/5">
            <AlertOctagon size={16} />
            Issue Disaster Warning
          </ButtonLink>
          <ButtonLink href="/host/farms/new" variant="primary" size="md" className="gap-2">
            <Plus size={16} />
            List New Farm
          </ButtonLink>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">My Farmstays</p>
            <Building size={20} className="text-brand-700" />
          </div>
          <p className="mt-3 text-3xl font-extrabold">{hostFarms.length}</p>
          <p className="mt-1 text-xs text-ink-muted">Active in safety network</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Total Bookings</p>
            <Users size={20} className="text-brand-700" />
          </div>
          <p className="mt-3 text-3xl font-extrabold">{hostBookings.length}</p>
          <p className="mt-1 text-xs text-ink-muted font-medium">Guest reservations</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">In Escrow Vault</p>
            <DollarSign size={20} className="text-warn" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-600">{formatINR(pendingEscrow)}</p>
          <p className="mt-1 text-xs text-ink-muted">Protected stay funds</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Total Disbursed</p>
            <DollarSign size={20} className="text-safe" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-safe">{formatINR(totalEarnings)}</p>
          <p className="mt-1 text-xs text-ink-muted">Direct bank payouts</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-10 border-b border-line">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("farms")}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer",
              activeTab === "farms"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            My Farm Listings ({hostFarms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer",
              activeTab === "bookings"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            Active Guest Bookings ({hostBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("escrow")}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer",
              activeTab === "escrow"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            Escrow & Payout Vault ({escrowList.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Farms */}
      {activeTab === "farms" && (
        <div className="mt-8 space-y-6">
          {hostFarms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <Building size={40} className="mx-auto text-ink-subtle" />
              <h3 className="mt-4 text-lg font-bold">No Farmstay Listings Yet</h3>
              <p className="mt-1 text-sm text-ink-muted max-w-md mx-auto">
                List your agricultural farmstay on KhetYatra. Get automated GIS safety score calculation, real-time risk alerts, and guaranteed escrow protection.
              </p>
              <ButtonLink href="/host/farms/new" variant="primary" size="md" className="mt-6 inline-flex items-center gap-2">
                <Plus size={16} />
                Create First Farm Listing
              </ButtonLink>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {hostFarms.map((farm) => (
                <Card key={farm.slug} className="overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-black/5">
                      <Image
                        src={farm.images[0] || "https://picsum.photos/seed/farm/900/600"}
                        alt={farm.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <SafetyBadge status={farm.safety} />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg">{farm.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <MapPin size={14} />
                        {farm.subDistrict ? `${farm.subDistrict}, ` : ""}{farm.district} ({farm.state})
                      </p>
                      <p className="mt-3 text-sm line-clamp-2 text-ink-muted">
                        {farm.summary}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                        <span className="text-xs text-ink-subtle">Rate / Night / Person</span>
                        <span className="text-base font-extrabold text-brand-700">{formatINR(farm.pricePerNight)}</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-ink-subtle">Max Seats</span>
                        {editingSlug === farm.slug ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              autoFocus
                              value={seatsDraft}
                              onChange={(e) => setSeatsDraft(e.target.value)}
                              className="w-16 rounded-md border border-line px-2 py-1 text-right text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => saveSeats(farm.slug)}
                              disabled={savingSeats}
                              className="text-xs font-bold text-brand-700 hover:underline disabled:opacity-50"
                            >
                              {savingSeats ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSlug(null)}
                              className="text-xs text-ink-muted hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditSeats(farm)}
                            className="flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand-700"
                          >
                            {farm.maxGuests ?? 10} guests
                            <Pencil size={12} aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-line bg-canvas/50 p-4 flex items-center justify-between gap-2">
                    <ButtonLink href={`/farms/${farm.slug}`} variant="outline" size="sm" className="gap-1 text-xs">
                      <ExternalLink size={14} /> Live View
                    </ButtonLink>
                    <ButtonLink href={`/host/warnings/new?farm=${farm.slug}`} variant="outline" size="sm" className="gap-1 text-xs border-amber-300 text-amber-800 hover:bg-amber-50">
                      <AlertOctagon size={14} /> Alert Zone
                    </ButtonLink>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {hostFarms.length > 0 && (
            <div className="rounded-xl border border-dashed border-line p-8 text-center bg-surface/50">
              <Building size={36} className="mx-auto text-ink-subtle" />
              <h3 className="mt-3 text-base font-bold">Have another agricultural property?</h3>
              <p className="mt-1 text-xs text-ink-muted max-w-md mx-auto">
                Join the Himalayan KhetYatra network. Benefit from automated safety monitoring, risk matrix evaluation, and guaranteed escrow protection.
              </p>
              <ButtonLink href="/host/farms/new" variant="primary" size="md" className="mt-4">
                Add Farmstay Listing
              </ButtonLink>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Bookings */}
      {activeTab === "bookings" && (
        <div className="mt-8">
          {hostBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <Inbox size={40} className="mx-auto text-ink-subtle" />
              <h3 className="mt-4 text-lg font-bold">No Guest Reservations Yet</h3>
              <p className="mt-1 text-sm text-ink-muted max-w-md mx-auto">
                Once travelers book your farmstay listings, their reservations and escrow statuses will appear here in real time.
              </p>
            </div>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line text-left bg-canvas/40">
                  <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                    <th className="px-5 py-3.5 font-semibold">Booking Ref</th>
                    <th className="px-5 py-3.5 font-semibold">Guest</th>
                    <th className="px-5 py-3.5 font-semibold">Farm Property</th>
                    <th className="px-5 py-3.5 font-semibold">Dates</th>
                    <th className="px-5 py-3.5 font-semibold">Guests</th>
                    <th className="px-5 py-3.5 font-semibold">Total</th>
                    <th className="px-5 py-3.5 font-semibold">Escrow Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {hostBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-black/[0.01]">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-brand-700">{b.id}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-ink">{b.guestName || "Verified Guest"}</p>
                        <p className="text-xs text-ink-subtle">{b.guestPhone || "+91 98XXX XXXXX"}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">{b.farmName}</td>
                      <td className="px-5 py-4 text-ink-muted">
                        {b.checkIn} → {b.checkOut}
                      </td>
                      <td className="px-5 py-4 text-ink-muted">{b.guests} Guests</td>
                      <td className="px-5 py-4 font-extrabold">{formatINR(b.total)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold",
                            b.escrowStatus === "Released_To_Host"
                              ? "bg-brand-50 text-brand-700 border-brand-200"
                              : b.escrowStatus === "Refunded_To_Guest"
                              ? "bg-red-50 text-danger border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          )}
                        >
                          {b.escrowStatus?.replace(/_/g, " ") || "Held In Escrow"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Tab 3: Escrow */}
      {activeTab === "escrow" && (
        <div className="mt-8 space-y-6">
          <Card className="p-6 bg-surface border border-line">
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold tracking-tight">Escrow Ledger</h2>
              <p className="mt-1 text-sm text-ink-muted leading-relaxed">
                Guest payments are held securely in escrow from booking time and released to host accounts upon successful checkout.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <ButtonLink href="/escrow" variant="outline" size="sm" className="gap-1 text-xs">
                  Open Detailed Escrow Ledger <ChevronRight size={14} />
                </ButtonLink>
              </div>
            </div>
          </Card>

          {escrowList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <DollarSign size={40} className="mx-auto text-ink-subtle" />
              <h3 className="mt-4 text-lg font-bold">No Escrow Funds Currently Active</h3>
              <p className="mt-1 text-sm text-ink-muted max-w-md mx-auto">
                When travelers book your stays, their authorized payments will be locked in the escrow ledger until departure.
              </p>
            </div>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line text-left bg-canvas/40">
                  <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                    <th className="px-5 py-3.5 font-semibold">Payment ID</th>
                    <th className="px-5 py-3.5 font-semibold">Booking Ref</th>
                    <th className="px-5 py-3.5 font-semibold">Guest</th>
                    <th className="px-5 py-3.5 font-semibold">Stay Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Vault Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {escrowList.map((escrow) => (
                    <tr key={escrow.paymentId} className="hover:bg-black/[0.01]">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-brand-700">{escrow.paymentId}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{escrow.bookingId}</td>
                      <td className="px-5 py-4 font-medium">{escrow.guestName}</td>
                      <td className="px-5 py-4 font-extrabold">{formatINR(escrow.stayAmount)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-block rounded-md border px-2.5 py-0.5 text-xs font-semibold",
                            escrow.escrowStatus === "Released_To_Host"
                              ? "bg-brand-50 text-brand-700 border-brand-200"
                              : escrow.escrowStatus === "Refunded_To_Guest"
                              ? "bg-red-50 text-danger border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          )}
                        >
                          {escrow.escrowStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {escrow.escrowStatus === "Held_In_Escrow" ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleReleasePayout(escrow.paymentId, escrow.guestName)}
                          >
                            Release Payout
                          </Button>
                        ) : (
                          <span className="text-xs text-ink-subtle font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
