import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 環境変数が未設定の場合はnullを返す（MVP期のフォールバック対応）
function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function createSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// シングルトン
let _client: SupabaseClient | null | undefined = undefined;
let _admin: SupabaseClient | null | undefined = undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client === undefined) _client = createSupabaseClient();
  return _client;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (_admin === undefined) _admin = createSupabaseAdmin();
  return _admin;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
