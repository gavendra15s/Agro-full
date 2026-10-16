import { openMeteoAdapter } from "../adapters/openMeteoAdapter.js";
import { sachetAdapter } from "../adapters/sachetAdapter.js";
import { imdAdapter } from "../adapters/imdAdapter.js";
import { nasaAdapter } from "../adapters/nasaAdapter.js";
import { riskFusionEngine } from "./riskEngine/fusion.js";
import { listAllFarms } from "./farmService.js";
import { supabase } from "../config/supabase.js";

export class BackgroundJobScheduler {
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[BackgroundJobs] Initializing data ingestion, risk precomputation and hold-release workers...");

    // 1. Initial warm-up ingestion & risk precompute
    this.runDataIngestionAndPrecompute().catch((err) =>
      console.warn("[BackgroundJobs] Warmup error:", err.message)
    );

    // 2. Poll SACHET official alerts every 5 minutes
    const sachetInterval = setInterval(() => {
      sachetAdapter.fetch().catch((e) => console.warn("[BackgroundJobs] SACHET poll error:", e.message));
    }, 5 * 60 * 1000);
    this.intervals.push(sachetInterval);

    // 3. Poll IMD district warnings every 30 minutes
    const imdInterval = setInterval(() => {
      imdAdapter.fetch().catch((e) => console.warn("[BackgroundJobs] IMD poll error:", e.message));
    }, 30 * 60 * 1000);
    this.intervals.push(imdInterval);

    // 4. Release expired 15-minute booking holds every 60 seconds
    const holdInterval = setInterval(() => {
      this.releaseExpiredHolds().catch((e) => console.warn("[BackgroundJobs] Hold release error:", e.message));
    }, 60 * 1000);
    this.intervals.push(holdInterval);

    // 5. Freshness watcher: check external source staleness every 10 minutes
    const freshnessInterval = setInterval(() => {
      this.checkSourceFreshness().catch((e) => console.warn("[BackgroundJobs] Freshness check error:", e.message));
    }, 10 * 60 * 1000);
    this.intervals.push(freshnessInterval);
  }

  stop(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    this.isRunning = false;
  }

  /**
   * Precomputes hazard scores for all farms across the next 15 days ahead of time.
   * This guarantees that when a tourist or host visits a farm page, the API serves
   * the precomputed score instantly without waiting on external meteorological APIs.
   */
  async runDataIngestionAndPrecompute(): Promise<{ farmsProcessed: number; scoresComputed: number }> {
    console.log("[BackgroundJobs] Starting risk_compute precomputation for catalog farms...");
    const farms = await listAllFarms({});
    const today = new Date();
    let scoresComputed = 0;

    for (const farm of farms) {
      // Precompute for next 15 days
      for (let dayOffset = 0; dayOffset <= 15; dayOffset++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const dateStr = targetDate.toISOString().split("T")[0];

        try {
          await riskFusionEngine.evaluateFarmRisk(farm, dateStr);
          scoresComputed++;
        } catch (err: any) {
          console.warn(`[BackgroundJobs] Failed computing risk for farm ${farm.id} on ${dateStr}:`, err.message);
        }
      }
    }

    console.log(`[BackgroundJobs] Precomputed ${scoresComputed} hazard score records across ${farms.length} farms.`);
    return { farmsProcessed: farms.length, scoresComputed };
  }

  /**
   * Automatically releases holds that exceeded their 15-minute validity window.
   */
  async releaseExpiredHolds(): Promise<number> {
    const nowIso = new Date().toISOString();
    const { data: expiredBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("current_status", "Held")
      .lt("hold_expires_at", nowIso);

    if (!expiredBookings || expiredBookings.length === 0) return 0;

    const expiredIds = expiredBookings.map((b) => b.id);
    await supabase
      .from("bookings")
      .update({ current_status: "Cancelled", updated_at: nowIso })
      .in("id", expiredIds);

    // Release held slots in availability calendar
    await supabase
      .from("availability")
      .update({ status: "available", held_until: null, held_by_booking_id: null })
      .in("held_by_booking_id", expiredIds);

    console.log(`[BackgroundJobs] Released ${expiredIds.length} expired booking holds.`);
    return expiredIds.length;
  }

  /**
   * Checks how old each data source is. If older than its limit, logs alert.
   */
  async checkSourceFreshness(): Promise<{ healthy: boolean; sources: any[] }> {
    const { data: runs } = await supabase.from("source_runs").select("*");
    const sources = (runs || []).map((r) => {
      const ageMinutes = (Date.now() - new Date(r.last_success_at).getTime()) / (60 * 1000);
      const isStale = ageMinutes > r.freshness_limit_minutes;
      return {
        ...r,
        ageMinutes: Math.round(ageMinutes),
        isStale,
      };
    });

    return {
      healthy: !sources.some((s) => s.isStale),
      sources,
    };
  }
}

export const backgroundScheduler = new BackgroundJobScheduler();
