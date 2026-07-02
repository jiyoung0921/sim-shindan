import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plansPath = path.join(rootDir, "public/data/plans.json");

async function loadLocalEnv() {
  try {
    const content = await readFile(path.join(rootDir, ".env.local"), "utf8");
    for (const line of content.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1);
      process.env[key] ??= value;
    }
  } catch {
    // CI uses real environment variables; .env.local is only for local operations.
  }
}

await loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are required.");
  process.exit(1);
}

function dbRowToPlanRecord(row) {
  return {
    id: row.id,
    carrier_id: row.carrier_id,
    brand_id: row.brand_id,
    plan_name: row.plan_name,
    plan_type: row.plan_type,
    billing: row.billing,
    discounts: row.discounts ?? [],
    point_economy: row.point_economy ?? null,
    data: {
      monthly_gb: row.data_monthly_gb === "unlimited" ? "unlimited" : Number(row.data_monthly_gb),
      throttle_speed_kbps: row.data_throttle_kbps,
      tethering_gb: row.data_tethering,
    },
    constraints: {
      online_only: row.online_only,
      store_support: row.store_support,
      esim_available: row.esim_available,
      sim_only_available: row.sim_only_available,
      payment_methods: row.payment_methods ?? [],
    },
    device: {
      bundled_sales: row.bundled_sales,
      installment_available: row.installment_available,
    },
    evidence: {
      source_url: row.source_url,
      fetched_at: row.fetched_at,
      published_at: row.published_at ?? undefined,
      reviewed_by: row.reviewed_by ?? undefined,
      reviewed_at: row.reviewed_at ?? undefined,
      snapshot_path: row.snapshot_path ?? "",
      notes_hash: row.notes_hash ?? "",
    },
    status: row.status,
    plan_status: row.plan_status ?? "unknown",
    last_verified_at: row.last_verified_at ?? row.fetched_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("plans")
  .select("*")
  .eq("status", "published")
  .order("carrier_id", { ascending: true })
  .order("id", { ascending: true });

if (error) {
  console.error(`Failed to export plans: ${error.message}`);
  process.exit(1);
}

const plans = (data ?? []).map(dbRowToPlanRecord);
await writeFile(plansPath, `${JSON.stringify(plans, null, 2)}\n`);

console.log(`Exported ${plans.length} published plans to ${path.relative(rootDir, plansPath)}.`);
