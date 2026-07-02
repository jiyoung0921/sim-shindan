import { readFile } from "node:fs/promises";
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

function planRecordToDbRow(plan) {
  return {
    id: plan.id,
    carrier_id: plan.carrier_id,
    brand_id: plan.brand_id,
    plan_name: plan.plan_name,
    plan_type: plan.plan_type,
    billing: plan.billing,
    discounts: plan.discounts,
    point_economy: plan.point_economy,
    data_monthly_gb: String(plan.data.monthly_gb),
    data_throttle_kbps: plan.data.throttle_speed_kbps,
    data_tethering: String(plan.data.tethering_gb),
    online_only: plan.constraints.online_only,
    store_support: plan.constraints.store_support,
    esim_available: plan.constraints.esim_available,
    sim_only_available: plan.constraints.sim_only_available,
    payment_methods: plan.constraints.payment_methods,
    bundled_sales: plan.device.bundled_sales,
    installment_available: plan.device.installment_available,
    source_url: plan.evidence.source_url,
    fetched_at: plan.evidence.fetched_at,
    published_at: plan.evidence.published_at ?? null,
    reviewed_by: plan.evidence.reviewed_by ?? null,
    reviewed_at: plan.evidence.reviewed_at ?? null,
    snapshot_path: plan.evidence.snapshot_path,
    notes_hash: plan.evidence.notes_hash,
    status: plan.status,
    plan_status: plan.plan_status ?? "unknown",
    last_verified_at: plan.last_verified_at ?? plan.evidence.fetched_at,
  };
}

const plans = JSON.parse(await readFile(plansPath, "utf8"));
const rows = plans.map(planRecordToDbRow);
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await supabase.from("plans").upsert(rows, { onConflict: "id" });

if (error) {
  console.error(`Failed to seed plans: ${error.message}`);
  process.exit(1);
}

console.log(`Seeded ${rows.length} plans from ${path.relative(rootDir, plansPath)}.`);
