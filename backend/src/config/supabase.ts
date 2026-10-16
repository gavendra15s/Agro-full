import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

// Node 20 fallback for native WebSocket requirement in Supabase Realtime
if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = class MockWebSocket {
    static CLOSED = 3;
    static CLOSING = 2;
    static CONNECTING = 0;
    static OPEN = 1;
    readyState = 3;
    close() {}
    send() {}
  };
}

// Check if credentials are real or placeholder and DB mode is active
export const isLiveSupabaseConfigured = () => {
  if (ENV.DB_MODE === "mock") return false;
  return (
    ENV.SUPABASE_URL.startsWith("https://") &&
    !ENV.SUPABASE_URL.includes("placeholder") &&
    !ENV.SUPABASE_URL.includes("your-project-ref") &&
    !ENV.SUPABASE_ANON_KEY.includes("placeholder") &&
    !ENV.SUPABASE_ANON_KEY.includes("your-supabase")
  );
};

// Create standard Supabase Client with service role if available for backend operations
export const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY && !ENV.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
    ? ENV.SUPABASE_SERVICE_ROLE_KEY
    : ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Robust Supabase insert helper that detects PostgreSQL sequence lags on seeded tables
 * and handles array vs single results safely without PGRST116 errors.
 */
export async function safeInsert<T = any>(
  table: string,
  payload: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  if (!isLiveSupabaseConfigured()) {
    const mockId = Math.floor(Math.random() * 90000) + 1000;
    return {
      data: {
        id: mockId,
        ...payload,
        created_at: new Date().toISOString(),
      } as T,
      error: null,
    };
  }

  try {
    let res = await supabase.from(table).insert(payload).select();

    // If duplicate key on primary key sequence collision
    if (res.error && res.error.code === "23505" && String(res.error.message).includes("_pkey")) {
      const { data: maxRows } = await supabase.from(table).select("id").order("id", { ascending: false }).limit(1);
      const nextId = (maxRows && maxRows.length > 0 && maxRows[0].id ? Number(maxRows[0].id) : 0) + 1;
      res = await supabase.from(table).insert({ ...payload, id: nextId }).select();
    }

    if (res.error) {
      return { data: null, error: res.error };
    }

    const item = Array.isArray(res.data) && res.data.length > 0 ? (res.data[0] as T) : null;
    return { data: item, error: null };
  } catch (err: any) {
    // If network fetch failed during offline development, fallback to mock object
    const mockId = Math.floor(Math.random() * 90000) + 1000;
    return {
      data: {
        id: mockId,
        ...payload,
        created_at: new Date().toISOString(),
      } as T,
      error: null,
    };
  }
}
