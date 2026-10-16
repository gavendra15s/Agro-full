import { supabase, safeInsert } from "../config/supabase.js";
import { SourceRun } from "../types/index.js";

export interface AdapterResult<T> {
  success: boolean;
  source: string;
  issuedAt: string; // IST ISO string
  fetchedAt: string;
  data: T | null;
  error?: string;
}

export abstract class BaseAdapter<T> {
  abstract readonly sourceName: "Open-Meteo" | "SACHET" | "IMD" | "NASA-IMERG" | "NASA-POWER" | "GloFAS";
  abstract readonly jobName: string;
  abstract readonly freshnessLimitMinutes: number;

  protected consecutiveFailures = 0;
  protected lastSuccessAt: string | null = null;
  protected lastAttemptAt: string | null = null;
  protected lastError: string | null = null;

  /**
   * Standardizes date string to Indian Standard Time (IST, UTC+5:30) representation.
   */
  protected toISTString(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Health recording helper: logs or updates the status of this external source in `source_runs`.
   */
  async recordRun(success: boolean, recordCount = 0, error?: string): Promise<void> {
    const now = new Date().toISOString();
    this.lastAttemptAt = now;

    if (success) {
      this.lastSuccessAt = now;
      this.consecutiveFailures = 0;
      this.lastError = null;
    } else {
      this.consecutiveFailures += 1;
      this.lastError = error || "Unknown fetch error";
    }

    try {
      // Upsert into source_runs
      const { data: existing } = await supabase
        .from("source_runs")
        .select("id")
        .eq("source_name", this.sourceName)
        .eq("job_name", this.jobName)
        .maybeSingle();

      const payload = {
        source_name: this.sourceName,
        job_name: this.jobName,
        last_attempt_at: this.lastAttemptAt,
        last_success_at: this.lastSuccessAt || now,
        is_healthy: this.consecutiveFailures < 3,
        consecutive_failures: this.consecutiveFailures,
        last_error: this.lastError,
        records_processed: recordCount,
        freshness_limit_minutes: this.freshnessLimitMinutes,
      };

      if (existing?.id) {
        await supabase.from("source_runs").update(payload).eq("id", existing.id);
      } else {
        await safeInsert("source_runs", payload);
      }
    } catch (e: any) {
      console.warn(`[Adapter:${this.sourceName}] Error saving source_run health:`, e.message);
    }
  }

  /**
   * Checks whether the current data from this source is within freshness tolerance.
   */
  isFresh(timestampIso: string): boolean {
    const ageMs = Date.now() - new Date(timestampIso).getTime();
    const maxAgeMs = this.freshnessLimitMinutes * 60 * 1000;
    return ageMs <= maxAgeMs;
  }

  abstract fetch(params?: Record<string, any>): Promise<AdapterResult<T>>;
}

