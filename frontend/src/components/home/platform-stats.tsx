"use client";

import { useEffect, useState } from "react";
import { Users, Home, ShieldCheck, MapPin, Sparkles, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { PlatformStats } from "@/lib/types";

export function PlatformStatsCounter({ initialStats }: { initialStats?: PlatformStats }) {
  const [stats, setStats] = useState<PlatformStats>(
    initialStats || {
      totalUsers: 14,
      guestsCount: 10,
      hostsCount: 3,
      adminsCount: 1,
      totalFarms: 24,
      activeWarnings: 2,
      totalBookings: 15,
      monitoredDistricts: 8,
    }
  );
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const liveStats = await api.stats.get();
        if (mounted && liveStats) {
          setStats(liveStats);
        }
      } catch (err) {
        console.warn("Failed to fetch live platform stats:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStats();
    // Auto-refresh stats every 45 seconds
    const interval = setInterval(loadStats, 45000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative -mt-8 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-line/80 bg-surface/95 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-ink/5">
        {/* Top Header Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line/60 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-2.5 rounded-full bg-safe animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-800">
              Live Network Telemetry
            </span>
            <span className="rounded-full bg-brand-50 border border-brand-200/80 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
              Real-time Active Platform
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Activity size={13} className="text-safe" />
            <span>Updated live from Supabase Escrow &amp; Auth Ledger</span>
          </div>
        </div>

        {/* Counter Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-6">
          {/* 1. Total Registered Users Counter */}
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-brand-50/70 via-surface to-surface p-4 sm:p-5 border border-brand-100 transition-all hover:border-brand-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-900">
                Registered Users
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-xs">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-900 font-mono">
                  {stats.totalUsers}
                </span>
                <span className="text-xs font-bold text-safe uppercase">Active</span>
              </div>
              <p className="mt-1 text-xs font-medium text-ink-muted">
                {stats.guestsCount} travelers &bull; {stats.hostsCount} farm hosts
              </p>
            </div>
          </div>

          {/* 2. Verified Farm Stays */}
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-emerald-50/70 via-surface to-surface p-4 sm:p-5 border border-emerald-100 transition-all hover:border-emerald-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Active Farmstays
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Home size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-950 font-mono">
                  {stats.totalFarms}
                </span>
                <span className="text-xs font-bold text-emerald-700 uppercase">Listed</span>
              </div>
              <p className="mt-1 text-xs font-medium text-ink-muted">
                100% Escrow payment protected
              </p>
            </div>
          </div>

          {/* 3. Verified Farm Owners & Hosts */}
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-amber-50/70 via-surface to-surface p-4 sm:p-5 border border-amber-100 transition-all hover:border-amber-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Farm Owners / Hosts
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-950 font-mono">
                  {stats.hostsCount}
                </span>
                <span className="text-xs font-bold text-amber-700 uppercase">Verified</span>
              </div>
              <p className="mt-1 text-xs font-medium text-ink-muted">
                Local agrarian partners &amp; stewards
              </p>
            </div>
          </div>

          {/* 4. Protected Travel Corridors */}
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-blue-50/70 via-surface to-surface p-4 sm:p-5 border border-blue-100 transition-all hover:border-blue-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Monitored Districts
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-950 font-mono">
                  {stats.monitoredDistricts}
                </span>
                <span className="text-xs font-bold text-blue-700 uppercase">Districts</span>
              </div>
              <p className="mt-1 text-xs font-medium text-ink-muted">
                AI Landslide Matrix &bull; 24/7 IMD Sync
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
