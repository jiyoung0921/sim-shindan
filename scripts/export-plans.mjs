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

let currentOrder = new Map();
let currentPlanById = new Map();
try {
  const currentPlans = JSON.parse(await readFile(plansPath, "utf8"));
  currentOrder = new Map(currentPlans.map((plan, index) => [plan.id, index]));
  currentPlanById = new Map(currentPlans.map((plan) => [plan.id, plan]));
} catch {
  currentOrder = new Map();
  currentPlanById = new Map();
}

function dbRowToPlanRecord(row) {
  const current = currentPlanById.get(row.id);
  const fetchedAt = preserveTimestamp(current?.evidence?.fetched_at, row.fetched_at);
  const lastVerifiedAt = preserveTimestamp(current?.last_verified_at, row.last_verified_at ?? row.fetched_at);

  return {
    id: row.id,
    carrier_id: row.carrier_id,
    brand_id: row.brand_id,
    plan_name: row.plan_name,
    plan_type: row.plan_type,
    billing: normalizeBilling(row.billing),
    discounts: (row.discounts ?? []).map(normalizeDiscount),
    point_economy: normalizePointEconomy(row.point_economy),
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
      fetched_at: fetchedAt,
      published_at: row.published_at ?? undefined,
      reviewed_by: row.reviewed_by ?? undefined,
      reviewed_at: row.reviewed_at ?? undefined,
      snapshot_path: row.snapshot_path ?? "",
      notes_hash: row.notes_hash ?? "",
    },
    status: row.status,
    created_at: current?.created_at ?? row.created_at,
    updated_at: current?.updated_at ?? row.updated_at,
    plan_status: row.plan_status ?? "unknown",
    last_verified_at: lastVerifiedAt,
  };
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeTier(tier) {
  return {
    up_to_gb: tier.up_to_gb,
    monthly_fee_yen: tier.monthly_fee_yen,
    label: tier.label,
  };
}

function normalizeDiscount(discount) {
  const normalized = {
    name: discount.name,
    monthly_discount_yen: discount.monthly_discount_yen,
    condition: discount.condition,
  };
  if (discount.exclusive_group) {
    normalized.exclusive_group = discount.exclusive_group;
  }
  normalized.condition_structured = discount.condition_structured ?? {};
  normalized.is_permanent = discount.is_permanent;
  if (discount.expires_at) {
    normalized.expires_at = discount.expires_at;
  }
  return normalized;
}

function normalizeBilling(billing) {
  return {
    base_fee_yen: billing.base_fee_yen,
    tiers: (billing.tiers ?? []).map(normalizeTier),
    call_option_unlimited_yen: billing.call_option_unlimited_yen ?? null,
    call_option_limited_yen: billing.call_option_limited_yen ?? null,
    initial_fee_yen: billing.initial_fee_yen,
    cancellation_fee_yen: billing.cancellation_fee_yen,
  };
}

function normalizePointEconomy(pointEconomy) {
  if (!pointEconomy) return null;
  return {
    point_type: pointEconomy.point_type,
    monthly_point_estimate: pointEconomy.monthly_point_estimate,
    condition: pointEconomy.condition,
  };
}

function preserveTimestamp(currentValue, rowValue) {
  if (!currentValue || !rowValue) return rowValue;
  const currentTime = Date.parse(currentValue);
  const rowTime = Date.parse(rowValue);
  if (Number.isFinite(currentTime) && currentTime === rowTime) {
    return currentValue;
  }
  return rowValue;
}

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
plans.sort((a, b) => {
  const aOrder = currentOrder.has(a.id) ? currentOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
  const bOrder = currentOrder.has(b.id) ? currentOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return `${a.carrier_id}:${a.id}`.localeCompare(`${b.carrier_id}:${b.id}`);
});
await writeFile(plansPath, `${JSON.stringify(plans, null, 2)}\n`);

console.log(`Exported ${plans.length} published plans to ${path.relative(rootDir, plansPath)}.`);
