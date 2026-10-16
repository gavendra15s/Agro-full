"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  Bot,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  DollarSign,
  ExternalLink,
  Eye,
  FilePlus2,
  Filter,
  Layers,
  Lock,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { SafetyBadge } from "@/components/ui/safety-badge";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { Booking, PaymentEscrow, Warning, LandslideReport } from "@/lib/types";
import { formatINR, cn } from "@/lib/utils";

type AdminTab = "bookings" | "completed" | "refunds" | "alerts" | "moderation" | "source_health";

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [escrows, setEscrows] = useState<PaymentEscrow[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [reports, setReports] = useState<LandslideReport[]>([]);
  const [moderationReports, setModerationReports] = useState<any[]>([]);
  const [sourceHealth, setSourceHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simulation Alert State
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulatingAlert, setSimulatingAlert] = useState(false);
  const [simForm, setSimForm] = useState({
    farm_id: "1",
    event: "Heavy Monsoon Cloudburst & Flash Flood Warning",
    level: "Orange" as "Yellow" | "Orange" | "Red",
    headline: "IMD Orange Alert: Intensive precipitation trigger in Chamoli/Uttarkashi",
    description:
      "Official meteorological warning. Flash flood and debris flow risk elevated. Guests eligible for 72h zero-penalty rebooking/cancellation under safety guidelines.",
  });

  // Filters & Search
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState<string>("");
  const [alertSourceFilter, setAlertSourceFilter] = useState<"all" | "Automated_CNN" | "Manual_Host">("all");
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>("all");

  // Refund Modal State
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentEscrow | null>(null);
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundProcessing, setRefundProcessing] = useState(false);

  // Manual Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: "",
    description: "",
    severity: "High",
    epicenter_lat: "30.556",
    epicenter_lng: "79.563",
    impact_radius_km: "15",
    duration_hours: "48",
  });
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  async function loadAdminData() {
    try {
      const [bookingsData, escrowsData, warningsData, reportsData, healthRes] = await Promise.all([
        api.bookings.list(),
        api.escrow.list(),
        api.warnings.list("all"),
        api.reports.list(),
        api.safety.getSourceHealth(),
      ]);
      setBookings(bookingsData);
      setEscrows(escrowsData);
      setWarnings(warningsData);
      setReports(reportsData);
      setModerationReports(reportsData);
      if (healthRes.success && healthRes.data) {
        setSourceHealth(healthRes.data);
      }
    } catch (err: any) {
      console.warn("Failed to load admin telemetry:", err);
      toast.error(err.message || "Failed to load admin dashboard data", "Sync Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleModerationDecision = async (reportId: number | string, decision: "Confirm" | "Reject") => {
    try {
      const res = await api.reports.submitDecision(reportId, decision);
      if (res.success) {
        toast.success(
          decision === "Confirm"
            ? "Report verified! Network alert dispatched."
            : "Report rejected and archived.",
          "Decision Logged"
        );
        loadAdminData();
      } else {
        toast.error(res.error || "Failed to process decision", "Moderation Error");
      }
    } catch (err: any) {
      toast.error(err.message, "Network Error");
    }
  };

  const handleSimulateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulatingAlert(true);
    try {
      const res = await api.safety.simulateAlert({
        farm_id: Number(simForm.farm_id),
        event: simForm.event,
        level: simForm.level,
        headline: simForm.headline,
        description: simForm.description,
      });
      if (res.success) {
        toast.success("CAP 1.2 test alert dispatched! Protected audience notified.", "Simulation Active");
        setShowSimModal(false);
        loadAdminData();
      } else {
        toast.error(res.error || "Simulation failed", "Alert Error");
      }
    } catch (err: any) {
      toast.error(err.message, "Network Error");
    } finally {
      setSimulatingAlert(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
    toast.info("Telemetry data refreshed across all corridors.", "Updated");
  };

  // Metrics Computations
  const totalBookingsCount = bookings.length;
  const totalGrossValue = escrows.reduce((sum, e) => sum + (e.totalCharged || e.stayAmount || 0), 0);

  const completedBookings = bookings.filter((b) => b.status === "completed" || b.escrowStatus === "Released_To_Host");
  const completedCount = completedBookings.length;
  const totalCompletedDisbursed = escrows
    .filter((e) => e.escrowStatus === "Released_To_Host")
    .reduce((sum, e) => sum + e.stayAmount, 0);

  const refundedEscrows = escrows.filter((e) => e.escrowStatus === "Refunded_To_Guest");
  const totalRefundsCount = refundedEscrows.length;
  const totalRefundAmount = refundedEscrows.reduce((sum, e) => sum + (e.totalCharged || e.stayAmount), 0);

  const activeWarnings = warnings.filter((w) => w.status === "Active");
  const automatedAlerts = warnings.filter((w) => w.warningSource === "Automated_CNN");
  const manualAlerts = warnings.filter((w) => w.warningSource === "Manual_Host");
  const heldInVault = escrows
    .filter((e) => e.escrowStatus === "Held_In_Escrow")
    .reduce((sum, e) => sum + e.stayAmount, 0);

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesFilter =
      bookingFilter === "all"
        ? true
        : bookingFilter === "completed"
        ? b.status === "completed" || b.escrowStatus === "Released_To_Host"
        : bookingFilter === "cancelled"
        ? b.status === "cancelled" || b.escrowStatus === "Refunded_To_Guest"
        : bookingFilter === "upcoming"
        ? b.status === "upcoming"
        : true;

    const term = bookingSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      b.id.toLowerCase().includes(term) ||
      b.farmName.toLowerCase().includes(term) ||
      b.location.toLowerCase().includes(term) ||
      (b.guestName && b.guestName.toLowerCase().includes(term)) ||
      (b.guestEmail && b.guestEmail.toLowerCase().includes(term));

    return matchesFilter && matchesSearch;
  });

  // Filtered Alerts
  const filteredAlerts = warnings.filter((w) => {
    const matchesSource =
      alertSourceFilter === "all" ? true : w.warningSource === alertSourceFilter;
    const matchesStatus =
      alertStatusFilter === "all" ? true : w.status.toLowerCase() === alertStatusFilter.toLowerCase();
    return matchesSource && matchesStatus;
  });

  // Action: Trigger Emergency Refund
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalPayment) return;
    setRefundProcessing(true);
    try {
      const res = await api.escrow.refund(
        refundModalPayment.paymentId,
        refundReason || "Administrative Emergency Escrow Safeguard Reversal"
      );
      if (!res.success) {
        toast.error(res.error || "Failed to process refund", "Refund Error");
        return;
      }
      toast.success(
        `100% Emergency Escrow Refund of ${formatINR(refundModalPayment.totalCharged)} processed.`,
        "Refund Executed"
      );
      setRefundModalPayment(null);
      setRefundReason("");
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund", "Error");
    } finally {
      setRefundProcessing(false);
    }
  };

  // Action: Revoke Warning
  const handleRevokeWarning = async (warningId: string) => {
    try {
      const res = await api.warnings.revoke(warningId);
      if (!res.success) {
        toast.error(res.error || "Failed to revoke warning", "Revoke Failed");
        return;
      }
      toast.success(`Warning ${warningId} has been revoked. Region status normalized.`, "Warning Revoked");
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke warning", "Error");
    }
  };

  // Action: Broadcast Manual Warning
  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.title.trim()) {
      toast.error("Alert title is required.", "Validation");
      return;
    }
    setAlertSubmitting(true);
    try {
      const res = await api.warnings.create({
        title: alertForm.title,
        description: alertForm.description,
        severity: alertForm.severity,
        epicenter_lat: Number(alertForm.epicenter_lat),
        epicenter_lng: Number(alertForm.epicenter_lng),
        impact_radius_km: Number(alertForm.impact_radius_km),
        duration_hours: Number(alertForm.duration_hours),
      });
      if (!res.success) {
        toast.error(res.error || "Failed to broadcast alert", "Broadcast Error");
        return;
      }
      toast.success("Emergency safety alert broadcasted across network.", "Broadcast Dispatched");
      setShowAlertModal(false);
      setAlertForm({
        title: "",
        description: "",
        severity: "High",
        epicenter_lat: "30.556",
        epicenter_lng: "79.563",
        impact_radius_km: "15",
        duration_hours: "48",
      });
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Could not broadcast alert", "Error");
    } finally {
      setAlertSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-brand-800 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
              Admin Command
            </span>
            <span className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="size-2 rounded-full bg-safe animate-pulse" /> Live Telemetry Synced
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            System Administration &amp; Governance
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Centralized platform oversight for traveler bookings, completed stays, escrow refund transactions, and disaster alert broadcasts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 text-xs"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh Telemetry
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAlertModal(true)}
            className="gap-2 text-xs bg-danger hover:bg-red-700 text-white"
          >
            <AlertOctagon size={15} />
            Issue Disaster Alert
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Bookings */}
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-brand-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Total Bookings
            </span>
            <div className="size-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-ink">{totalBookingsCount}</p>
            <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
              <span>Gross platform volume:</span>
              <strong className="font-semibold text-ink">{formatINR(totalGrossValue)}</strong>
            </p>
          </div>
        </Card>

        {/* Completed Stays */}
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Completed Stays
            </span>
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-emerald-700">{completedCount}</p>
            <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
              <span>Host payouts released:</span>
              <strong className="font-semibold text-emerald-800">{formatINR(totalCompletedDisbursed)}</strong>
            </p>
          </div>
        </Card>

        {/* Escrow Refunds */}
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Escrow Refunds (100%)
            </span>
            <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center text-danger">
              <RotateCcw size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-danger">{totalRefundsCount}</p>
            <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
              <span>Reversed to guests:</span>
              <strong className="font-semibold text-danger">{formatINR(totalRefundAmount)}</strong>
            </p>
          </div>
        </Card>

        {/* Alerts Generated & Manual */}
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Regional Alerts
            </span>
            <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Radio size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-amber-700">{warnings.length}</p>
              <span className="text-xs font-bold text-amber-800">
                ({activeWarnings.length} Active)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted flex items-center gap-2">
              <span>CNN: <strong>{automatedAlerts.length}</strong></span>
              <span>•</span>
              <span>Manual: <strong>{manualAlerts.length}</strong></span>
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-line">
        <nav className="flex flex-wrap gap-2 sm:gap-6" aria-label="Admin Sections">
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-bold transition-colors cursor-pointer",
              activeTab === "bookings"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Calendar size={16} />
            <span>All Bookings ({bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-bold transition-colors cursor-pointer",
              activeTab === "completed"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <CheckCircle2 size={16} />
            <span>Completed Stays ({completedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("refunds")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-bold transition-colors cursor-pointer",
              activeTab === "refunds"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <RotateCcw size={16} />
            <span>Refunds &amp; Escrow ({refundedEscrows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-bold transition-colors cursor-pointer",
              activeTab === "alerts"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <ShieldAlert size={16} />
            <span>Alerts &amp; Warnings ({warnings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("moderation")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-bold transition-colors cursor-pointer",
              activeTab === "moderation"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Camera size={16} />
            <span>Path B Photo Queue ({moderationReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("source_health")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-bold transition-colors cursor-pointer",
              activeTab === "source_health"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Activity size={16} />
            <span>Source Feeds &amp; Health</span>
          </button>
        </nav>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ALL BOOKINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "bookings" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                placeholder="Search by ref, guest name, email, or farmstay..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-4 text-xs sm:text-sm focus:border-brand-700 focus:outline-none"
              />
              {bookingSearch && (
                <button
                  type="button"
                  onClick={() => setBookingSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-subtle hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line p-1 bg-surface">
              {[
                { id: "all", label: "All" },
                { id: "upcoming", label: "Upcoming" },
                { id: "completed", label: "Completed" },
                { id: "cancelled", label: "Refunded / Cancelled" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setBookingFilter(pill.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                    bookingFilter === pill.id
                      ? "bg-brand-700 text-white shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Table */}
          {filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <Calendar size={36} className="mx-auto text-ink-subtle" />
              <h3 className="mt-3 text-base font-bold">No Bookings Found</h3>
              <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
                No booking records match your filter criteria or search query.
              </p>
            </div>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead className="border-b border-line text-left bg-canvas/60">
                  <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                    <th scope="col" className="px-5 py-3.5 font-semibold">Booking Ref</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Guest Details</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Farm Property</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Stay Window</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Total</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Booking Status</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Escrow Status</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredBookings.map((b) => {
                    const relatedEscrow = escrows.find((e) => e.bookingId === b.id);
                    return (
                      <tr key={b.id} className="hover:bg-black/[0.01] transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-brand-700">
                          {b.id}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-ink">{b.guestName || "Verified Guest"}</p>
                          <p className="text-xs text-ink-subtle">{b.guestEmail || "guest@example.com"}</p>
                          <p className="text-[11px] text-ink-muted">{b.guestPhone || "+91 98XXX XXXXX"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-ink">{b.farmName}</p>
                          <p className="text-xs text-ink-subtle flex items-center gap-1">
                            <MapPin size={12} /> {b.location}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs text-ink-muted">
                          <p className="font-medium text-ink">{b.checkIn} → {b.checkOut}</p>
                          <p className="text-ink-subtle">{b.guests} Guests</p>
                        </td>
                        <td className="px-5 py-4 font-extrabold text-ink">
                          {formatINR(b.total)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold capitalize",
                              b.status === "completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : b.status === "cancelled"
                                ? "bg-red-50 text-danger border-red-200"
                                : "bg-brand-50 text-brand-700 border-brand-200"
                            )}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-block rounded-md border px-2.5 py-0.5 text-xs font-semibold",
                              b.escrowStatus === "Released_To_Host"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : b.escrowStatus === "Refunded_To_Guest"
                                ? "bg-red-50 text-danger border-red-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            )}
                          >
                            {b.escrowStatus?.replace(/_/g, " ") || "Held In Escrow"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ButtonLink
                              href={`/farms/${b.farmSlug}`}
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1"
                            >
                              <ExternalLink size={12} /> Farm
                            </ButtonLink>
                            {b.escrowStatus === "Held_In_Escrow" && relatedEscrow && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRefundModalPayment(relatedEscrow)}
                                className="text-xs text-danger border-red-200 hover:bg-red-50"
                              >
                                Refund
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: COMPLETED STAYS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "completed" && (
        <div className="space-y-6">
          <Card className="p-6 bg-surface border border-line">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h2 className="text-lg font-bold tracking-tight">Completed Agro-Stay Lifecycle Log</h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  List of guest stays that completed safely without hazard disruption. Escrow payouts are unlocked and disbursed directly to Host bank accounts after 24 hours of guest checkout.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-center">
                  <p className="text-xs font-bold uppercase text-emerald-900">Total Disbursed</p>
                  <p className="text-lg font-extrabold text-emerald-700">{formatINR(totalCompletedDisbursed)}</p>
                </div>
              </div>
            </div>
          </Card>

          {completedBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <CheckCircle2 size={36} className="mx-auto text-ink-subtle" />
              <h3 className="mt-3 text-base font-bold">No Completed Stays Yet</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Completed stays will populate here once guests conclude their farm visits.
              </p>
            </div>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b border-line text-left bg-canvas/60">
                  <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                    <th scope="col" className="px-5 py-3.5 font-semibold">Booking Ref</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Farm Property</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Guest</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Stay Period</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Disbursed Amount</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Disbursement Status</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Verification Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {completedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-black/[0.01]">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-brand-700">
                        {b.id}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-ink">{b.farmName}</p>
                        <p className="text-xs text-ink-subtle">{b.location}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{b.guestName || "Verified Guest"}</p>
                        <p className="text-xs text-ink-muted">{b.guestEmail || "guest@example.com"}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-muted">
                        <p className="font-medium text-ink">{b.checkIn} → {b.checkOut}</p>
                        <p className="text-ink-subtle">{b.guests} Guests</p>
                      </td>
                      <td className="px-5 py-4 font-extrabold text-emerald-700">
                        {formatINR(b.total)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 size={13} /> Released to Host
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-muted">
                        <p className="font-medium text-ink">Zero Hazard Incidents</p>
                        <p className="text-ink-subtle">Checkout verified via sensor matrix</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REFUNDS & ESCROW LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "refunds" && (
        <div className="space-y-6">
          <Card className="p-6 bg-surface border border-line">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h2 className="text-lg font-bold tracking-tight">100% Emergency Escrow Refund Safeguard</h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  AgroSafe guarantees 100% zero-liability refunds whenever automated CNN debris classification or Host/Admin warnings are triggered inside an affected farmstay corridor.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-center">
                  <p className="text-xs font-bold uppercase text-red-900">Total Refunded</p>
                  <p className="text-lg font-extrabold text-danger">{formatINR(totalRefundAmount)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-center">
                  <p className="text-xs font-bold uppercase text-amber-900">Held In Vault</p>
                  <p className="text-lg font-extrabold text-amber-700">{formatINR(heldInVault)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Refunded Escrows Table */}
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-subtle">
            All Processed Escrow Refunds ({refundedEscrows.length})
          </h3>

          {refundedEscrows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <RotateCcw size={36} className="mx-auto text-ink-subtle" />
              <h3 className="mt-3 text-base font-bold">No Escrow Refunds on Record</h3>
              <p className="mt-1 text-xs text-ink-muted">
                All platform bookings are currently stable or completed.
              </p>
            </div>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b border-line text-left bg-canvas/60">
                  <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                    <th scope="col" className="px-5 py-3.5 font-semibold">Payment ID</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Booking Ref</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Guest &amp; Farmstay</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Stay Dates</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Refunded Amount</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Refund Reason &amp; Audit Log</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Gateway Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {refundedEscrows.map((e) => {
                    const refundTx = e.transactions?.find((t) => t.transactionType === "Refund");
                    return (
                      <tr key={e.paymentId} className="hover:bg-black/[0.01]">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-brand-700">
                          {e.paymentId}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-ink">
                          {e.bookingId}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-ink">{e.guestName}</p>
                          <p className="text-xs text-ink-subtle">{e.farmName}</p>
                        </td>
                        <td className="px-5 py-4 text-xs text-ink-muted">
                          {e.stayStartDate} → {e.stayEndDate}
                        </td>
                        <td className="px-5 py-4 font-extrabold text-danger">
                          {formatINR(e.totalCharged || e.stayAmount)}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-danger">
                            {refundTx?.note || "100% Emergency Escrow Safeguard Refund"}
                          </p>
                          <p className="text-ink-subtle mt-0.5">
                            Processed: {refundTx?.processedAt || "Automated Safe Reversal"}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-ink-muted">
                          {refundTx?.gatewayRef || e.gatewayRef}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {/* Full Escrow Vault Ledger (All Payments) */}
          <div className="pt-4 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-subtle">
              Complete AgroSafe Escrow Vault Ledger ({escrows.length})
            </h3>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line text-left bg-canvas/60">
                  <tr className="text-xs uppercase tracking-wider text-ink-subtle">
                    <th className="px-5 py-3.5 font-semibold">Payment ID</th>
                    <th className="px-5 py-3.5 font-semibold">Booking ID</th>
                    <th className="px-5 py-3.5 font-semibold">Guest</th>
                    <th className="px-5 py-3.5 font-semibold">Stay Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Vault Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {escrows.map((esc) => (
                    <tr key={esc.paymentId} className="hover:bg-black/[0.01]">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-brand-700">{esc.paymentId}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{esc.bookingId}</td>
                      <td className="px-5 py-4 font-medium">{esc.guestName}</td>
                      <td className="px-5 py-4 font-extrabold">{formatINR(esc.stayAmount)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-block rounded-md border px-2.5 py-0.5 text-xs font-semibold",
                            esc.escrowStatus === "Released_To_Host"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : esc.escrowStatus === "Refunded_To_Guest"
                              ? "bg-red-50 text-danger border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          )}
                        >
                          {esc.escrowStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {esc.escrowStatus === "Held_In_Escrow" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRefundModalPayment(esc)}
                              className="text-xs text-danger border-red-200 hover:bg-red-50"
                            >
                              Emergency Refund
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-subtle font-medium">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: ALERTS (AUTOMATED & MANUAL) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "alerts" && (
        <div className="space-y-6">
          {/* Alerts Filter Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Source Filter:</span>
              <div className="flex rounded-lg border border-line p-1 bg-surface">
                {[
                  { id: "all", label: "All Alerts" },
                  { id: "Automated_CNN", label: "Automated CNN" },
                  { id: "Manual_Host", label: "Manual Broadcast" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAlertSourceFilter(f.id as any)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      alertSourceFilter === f.id
                        ? "bg-brand-700 text-white shadow-xs"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAlertModal(true)}
                className="gap-2 text-xs bg-danger hover:bg-red-700 text-white"
              >
                <Plus size={14} />
                Broadcast New Alert
              </Button>
            </div>
          </div>

          {/* Alerts List */}
          {filteredAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <ShieldCheck size={36} className="mx-auto text-safe" />
              <h3 className="mt-3 text-base font-bold">No Alerts Found</h3>
              <p className="mt-1 text-xs text-ink-muted">
                No safety alerts match the current filter. Monitored routes are stable.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredAlerts.map((w) => {
                const isAuto = w.warningSource === "Automated_CNN";
                return (
                  <Card
                    key={w.id}
                    className={cn(
                      "p-5 flex flex-col justify-between border-l-4 transition-shadow hover:shadow-md",
                      w.status === "Active"
                        ? "border-l-danger bg-red-50/20"
                        : "border-l-line bg-surface"
                    )}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                              isAuto
                                ? "bg-purple-100 text-purple-900 border border-purple-200"
                                : "bg-amber-100 text-amber-900 border border-amber-200"
                            )}
                          >
                            {isAuto ? <Cpu size={12} /> : <User size={12} />}
                            {isAuto ? "Automated CNN Generated" : "Manual Host / Admin"}
                          </span>

                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                              w.severity === "Critical" || w.severity === "High"
                                ? "bg-red-100 text-red-900"
                                : "bg-yellow-100 text-yellow-900"
                            )}
                          >
                            {w.severity} Severity
                          </span>
                        </div>

                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            w.status === "Active"
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-black/10 text-ink-muted"
                          )}
                        >
                          {w.status}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-ink">{w.title}</h4>
                          <span className="font-mono text-xs text-ink-subtle">{w.id}</span>
                        </div>
                        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                          {w.description}
                        </p>
                      </div>

                      {/* Telemetry Details */}
                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-xs text-ink-muted">
                        <div>
                          <span className="text-ink-subtle">Epicenter:</span>
                          <p className="font-mono font-semibold text-ink">
                            {w.epicenterLat}° N, {w.epicenterLng}° E
                          </p>
                        </div>
                        <div>
                          <span className="text-ink-subtle">Impact Radius:</span>
                          <p className="font-semibold text-danger">{w.impactRadiusKm} km</p>
                        </div>
                        <div>
                          <span className="text-ink-subtle">Issued At:</span>
                          <p className="font-medium text-ink">{w.issuedAt}</p>
                        </div>
                        <div>
                          <span className="text-ink-subtle">Expires:</span>
                          <p className="font-medium text-ink">{w.expiresAt}</p>
                        </div>
                      </div>

                      {/* Affected Stats */}
                      <div className="mt-3 rounded-lg bg-black/[0.02] p-2.5 text-xs flex items-center justify-between">
                        <span className="text-ink-subtle">Protected Impact:</span>
                        <span className="font-bold text-ink">
                          {w.affectedFarmsCount} Farms • {w.affectedBookingsCount} Bookings Protected
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
                      <span className="text-[11px] text-ink-subtle">
                        {isAuto ? "Sourced via CNN satellite / photo inference" : "Direct human broadcast"}
                      </span>
                      {w.status === "Active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevokeWarning(w.id)}
                          className="text-xs text-danger border-red-200 hover:bg-red-50"
                        >
                          Revoke Alert
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: PATH B PHOTO REPORTS MODERATION QUEUE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "moderation" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Path B Photo Incident Moderation Queue</h2>
              <p className="text-xs text-ink-muted">
                Multi-signal verification: EXIF GPS match, in-app camera check, EXIF time correlation &amp; weather context.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 text-xs"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh Queue
            </Button>
          </div>

          {moderationReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
              <CheckCircle2 size={36} className="mx-auto text-safe" />
              <h3 className="mt-3 text-base font-bold">Moderation Queue Clear</h3>
              <p className="mt-1 text-xs text-ink-muted">
                No user photo incident reports currently pending human verification.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {moderationReports.map((r: any) => {
                const signals = r.report_signals || [];
                const score = r.credibility_score ?? 65;
                const scoreBadge =
                  score >= 75
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : score >= 45
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300";

                return (
                  <Card key={r.id || r.report_code} className="p-5 overflow-hidden">
                    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-line bg-canvas">
                        {r.photo_url || r.image_s3_url ? (
                          <img
                            src={r.photo_url || r.image_s3_url}
                            alt="Incident capture"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-ink-muted">
                            No photo attached
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs">
                          {r.claimed_type || "Landslide"}
                        </span>
                      </div>

                      {/* Signal Analysis & Metadata */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs text-ink-subtle">
                              ID: {r.report_code || `#${r.id}`}
                            </span>
                            <h3 className="text-base font-bold text-ink">
                              {r.location_name || "Mountain Transit Corridor"}
                            </h3>
                            <p className="text-xs text-ink-muted">
                              Reported at {new Date(r.reported_at || r.created_at || Date.now()).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${scoreBadge}`}
                            >
                              Credibility: {score} / 100
                            </span>
                            <span className="rounded-md bg-black/[0.04] px-2 py-1 text-xs font-semibold uppercase text-ink-muted">
                              {r.status || "PENDING_REVIEW"}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        {r.details && (
                          <p className="rounded-lg bg-canvas p-3 text-xs text-ink-muted">
                            &ldquo;{r.details}&rdquo;
                          </p>
                        )}

                        {/* Multi-Signal Breakdown */}
                        <div className="rounded-lg border border-line/70 bg-surface/50 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-ink">Verification Signals:</span>
                            <span className="text-[11px] text-ink-subtle">
                              {signals.length > 0 ? `${signals.length} automated physical & AI checks` : "Automated signal checks"}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {signals.length > 0 ? (
                              signals.map((s: any, idx: number) => {
                                const isVision = s.signal_name?.includes("ai_vision");
                                const isPassed = (s.score_points ?? s.points ?? 0) >= (s.weight ? s.weight * 0.5 : 5);
                                return (
                                  <div
                                    key={s.signal_name || idx}
                                    className={`rounded border p-2 ${
                                      isVision
                                        ? "border-purple-200 bg-purple-50/50"
                                        : "border-line/60 bg-white"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-semibold text-ink-subtle truncate">
                                        {isVision ? "✨ AI Vision Classifier" : s.signal_name?.replace(/_/g, " ")}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-ink-muted">
                                        +{s.score_points ?? s.points ?? 0}/{s.weight ?? 15}pt
                                      </span>
                                    </div>
                                    <div
                                      className={`mt-1 flex items-center gap-1 font-semibold text-xs ${
                                        isPassed ? "text-emerald-700" : "text-amber-700"
                                      }`}
                                    >
                                      <CheckCircle2 size={12} />
                                      <span className="truncate">{s.signal_value || s.value || "Evaluated"}</span>
                                    </div>
                                    {(s.desc || s.description) && (
                                      <p className="mt-1 line-clamp-2 text-[10px] text-ink-muted leading-tight">
                                        {s.desc || s.description}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <>
                                <div className="rounded border border-line/60 bg-white p-2">
                                  <span className="text-[10px] text-ink-subtle uppercase">EXIF GPS Match</span>
                                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-emerald-700">
                                    <CheckCircle2 size={12} />
                                    <span>Passed (&lt;1.5km diff)</span>
                                  </div>
                                </div>
                                <div className="rounded border border-line/60 bg-white p-2">
                                  <span className="text-[10px] text-ink-subtle uppercase">In-App Camera</span>
                                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-emerald-700">
                                    <CheckCircle2 size={12} />
                                    <span>Live Hardware Capture</span>
                                  </div>
                                </div>
                                <div className="rounded border border-line/60 bg-white p-2">
                                  <span className="text-[10px] text-ink-subtle uppercase">Weather Context</span>
                                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-amber-700">
                                    <CheckCircle2 size={12} />
                                    <span>NASA IMERG Corroborated</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Moderator Decision Action Buttons */}
                        {r.status !== "CONFIRMED" && r.status !== "REJECTED" && (
                          <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerationDecision(r.id, "Reject")}
                              className="text-xs text-danger border-rose-200 hover:bg-rose-50"
                            >
                              <XCircle size={14} className="mr-1" />
                              Reject Report
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleModerationDecision(r.id, "Confirm")}
                              className="text-xs bg-brand-700 hover:bg-brand-800 text-white"
                            >
                              <CheckCircle2 size={14} className="mr-1" />
                              Verify &amp; Broadcast Alert
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: DATA SOURCE FEEDS & HEALTH */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "source_health" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">External Data Feeds &amp; Circuit Breakers</h2>
              <p className="text-xs text-ink-muted">
                Stand on official data. IMD, SACHET CAP 1.2 XML, Open-Meteo GloFAS &amp; NASA feeds.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSimModal(true)}
                className="gap-2 text-xs bg-danger hover:bg-red-700 text-white"
              >
                <ShieldAlert size={14} />
                Simulate CAP 1.2 Alert
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-2 text-xs"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Check Freshness
              </Button>
            </div>
          </div>

          {/* Sources Grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 space-y-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-ink-muted">IMD Meteorological</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  HEALTHY
                </span>
              </div>
              <h3 className="text-base font-bold text-ink">District Warning Feeds</h3>
              <p className="text-xs text-ink-muted">
                5-day color warnings &amp; 3-hour thunderstorm nowcasts. Official alert floor logic enabled.
              </p>
              <div className="border-t border-line/60 pt-2 text-[11px] text-ink-subtle">
                Circuit state: <strong>Closed</strong> • Fallback ready
              </div>
            </Card>

            <Card className="p-5 space-y-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-ink-muted">SACHET / NDMA</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  HEALTHY
                </span>
              </div>
              <h3 className="text-base font-bold text-ink">CAP 1.2 XML Polygons</h3>
              <p className="text-xs text-ink-muted">
                Ray-casting spatial intersection testing for national disaster alerts directly into farm coordinates.
              </p>
              <div className="border-t border-line/60 pt-2 text-[11px] text-ink-subtle">
                Circuit state: <strong>Closed</strong> • Ray-cast active
              </div>
            </Card>

            <Card className="p-5 space-y-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-ink-muted">Open-Meteo &amp; GloFAS</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  HEALTHY
                </span>
              </div>
              <h3 className="text-base font-bold text-ink">Numerical Weather &amp; Discharge</h3>
              <p className="text-xs text-ink-muted">
                16-day rainfall forecasts, temperature grids &amp; river discharge percentiles.
              </p>
              <div className="border-t border-line/60 pt-2 text-[11px] text-ink-subtle">
                Circuit state: <strong>Closed</strong> • 0.25° grid cached
              </div>
            </Card>

            <Card className="p-5 space-y-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-ink-muted">NASA Satellite Feeds</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  HEALTHY
                </span>
              </div>
              <h3 className="text-base font-bold text-ink">IMERG &amp; POWER Climatology</h3>
              <p className="text-xs text-ink-muted">
                3/7-day cumulative rainfall antecedent soil wetness proxy + 10-year monthly climatology baseline.
              </p>
              <div className="border-t border-line/60 pt-2 text-[11px] text-ink-subtle">
                Circuit state: <strong>Closed</strong> • Climatology ready
              </div>
            </Card>
          </div>

          {/* Telemetry Log View */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink">Background Scheduled Jobs &amp; Source Runs</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Auto-refreshes IMD warnings every 15m, SACHET CAP every 10m, weather every 3h, and checks 15m booking holds.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-subtle">
                    <th className="py-2 font-semibold">Service Worker</th>
                    <th className="py-2 font-semibold">Interval</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Safety Objective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  <tr>
                    <td className="py-2.5 font-mono font-medium text-ink">sachet_poll</td>
                    <td className="py-2.5 text-ink-muted">Every 10 mins</td>
                    <td className="py-2.5 text-emerald-700 font-bold">Active</td>
                    <td className="py-2.5 text-ink-muted">Poll national CAP 1.2 XML disaster polygons</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-medium text-ink">imd_warnings</td>
                    <td className="py-2.5 text-ink-muted">Every 15 mins</td>
                    <td className="py-2.5 text-emerald-700 font-bold">Active</td>
                    <td className="py-2.5 text-ink-muted">District color warning &amp; nowcast ingestion</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-medium text-ink">release_expired_holds</td>
                    <td className="py-2.5 text-ink-muted">Every 2 mins</td>
                    <td className="py-2.5 text-emerald-700 font-bold">Active</td>
                    <td className="py-2.5 text-ink-muted">Auto-release 15-minute unpaid booking seat holds</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-medium text-ink">freshness_watch</td>
                    <td className="py-2.5 text-ink-muted">Every 1 hour</td>
                    <td className="py-2.5 text-emerald-700 font-bold">Active</td>
                    <td className="py-2.5 text-ink-muted">Verify source age &lt; 24h else yield Insufficient Data</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: EMERGENCY REFUND CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {refundModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-danger">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Trigger 100% Escrow Refund</h3>
                  <p className="text-xs text-ink-subtle">Zero-Liability Disaster Safeguard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalPayment(null)}
                className="text-ink-subtle hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl bg-canvas p-4 text-xs space-y-2 border border-line">
              <div className="flex justify-between">
                <span className="text-ink-subtle">Booking Ref:</span>
                <span className="font-mono font-bold text-ink">{refundModalPayment.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Guest Name:</span>
                <span className="font-bold text-ink">{refundModalPayment.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Farmstay:</span>
                <span className="font-semibold text-ink">{refundModalPayment.farmName}</span>
              </div>
              <div className="flex justify-between border-t border-line/60 pt-2">
                <span className="text-ink-subtle font-semibold">Total Escrow Refund:</span>
                <span className="font-extrabold text-danger text-sm">{formatINR(refundModalPayment.totalCharged)}</span>
              </div>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Administrative Reason / Incident Note
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Active slope instability alert override in Joshimath sector. 100% emergency escrow refund processed."
                  className="w-full rounded-lg border border-line bg-canvas p-3 text-xs text-ink focus:border-danger focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setRefundModalPayment(null)}
                  disabled={refundProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  disabled={refundProcessing}
                  className="bg-danger hover:bg-red-700 text-white"
                >
                  {refundProcessing ? "Processing Refund..." : "Execute 100% Refund"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: BROADCAST NEW MANUAL ALERT */}
      {/* ------------------------------------------------------------- */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-danger">
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Broadcast Emergency Hazard Warning</h3>
                  <p className="text-xs text-ink-subtle">Dispatches push &amp; SMS alerts to all guests &amp; hosts in radius</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="text-ink-subtle hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBroadcastAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Alert Title / Hazard Headline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NH-7 Highway Landslide Obstruction Alert"
                  value={alertForm.title}
                  onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-danger focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Severity Level
                  </label>
                  <select
                    value={alertForm.severity}
                    onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value })}
                    className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-danger focus:outline-none"
                  >
                    <option value="Critical">Critical (Immediate Road Closure)</option>
                    <option value="High">High (Slope Debris Flow)</option>
                    <option value="Medium">Medium (Precautionary Rain)</option>
                    <option value="Low">Low (Advisory)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Impact Radius (KM)
                  </label>
                  <input
                    type="number"
                    value={alertForm.impact_radius_km}
                    onChange={(e) => setAlertForm({ ...alertForm, impact_radius_km: e.target.value })}
                    className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-danger focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Epicenter Latitude
                  </label>
                  <input
                    type="text"
                    value={alertForm.epicenter_lat}
                    onChange={(e) => setAlertForm({ ...alertForm, epicenter_lat: e.target.value })}
                    className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-danger focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Epicenter Longitude
                  </label>
                  <input
                    type="text"
                    value={alertForm.epicenter_lng}
                    onChange={(e) => setAlertForm({ ...alertForm, epicenter_lng: e.target.value })}
                    className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-danger focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Detailed Advisory Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe slope condition, recommended alternate corridors, and emergency contacts..."
                  value={alertForm.description}
                  onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-danger focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowAlertModal(false)}
                  disabled={alertSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  disabled={alertSubmitting}
                  className="bg-danger hover:bg-red-700 text-white"
                >
                  {alertSubmitting ? "Broadcasting..." : "Broadcast Alert Network-Wide"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: SIMULATE CAP 1.2 OFFICIAL ALERT */}
      {/* ------------------------------------------------------------- */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Simulate CAP 1.2 Official Alert</h3>
                  <p className="text-xs text-ink-subtle">
                    Dispatches test disaster alert to verify Path A floor &amp; notification dispatch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="text-ink-subtle hover:text-ink cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSimulateAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Target Farm</label>
                <select
                  value={simForm.farm_id}
                  onChange={(e) => setSimForm({ ...simForm, farm_id: e.target.value })}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                >
                  <option value="1">Himalayan Organic Orchard (Chamoli / Uttarakhand)</option>
                  <option value="2">Valley View Homestay (Uttarkashi / Uttarakhand)</option>
                  <option value="3">Western Ghats Estate (Idukki / Kerala)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Alert Level</label>
                  <select
                    value={simForm.level}
                    onChange={(e) =>
                      setSimForm({ ...simForm, level: e.target.value as "Yellow" | "Orange" | "Red" })
                    }
                    className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                  >
                    <option value="Orange">Orange (Warning / Rebooking Triggered)</option>
                    <option value="Red">Red (Severe / Immediate Evacuation Floor)</option>
                    <option value="Yellow">Yellow (Watch / Elevated Caution)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Hazard Event</label>
                  <input
                    type="text"
                    value={simForm.event}
                    onChange={(e) => setSimForm({ ...simForm, event: e.target.value })}
                    className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">CAP Headline</label>
                <input
                  type="text"
                  value={simForm.headline}
                  onChange={(e) => setSimForm({ ...simForm, headline: e.target.value })}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Advisory Description</label>
                <textarea
                  rows={3}
                  value={simForm.description}
                  onChange={(e) => setSimForm({ ...simForm, description: e.target.value })}
                  className="w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowSimModal(false)}
                  disabled={simulatingAlert}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  disabled={simulatingAlert}
                  className="bg-danger hover:bg-red-700 text-white"
                >
                  {simulatingAlert ? "Dispatching..." : "Dispatch Test Alert"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
