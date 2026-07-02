"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanAvailability, PlanRecord } from "@/lib/types";

const AVAILABILITY_LABEL: Record<PlanAvailability, string> = {
  active: "受付中",
  ended: "受付終了",
  existing_only: "既存のみ",
  unknown: "未確認",
};

const AVAILABILITY_CLASS: Record<PlanAvailability, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ended: "border-zinc-200 bg-stone-100 text-zinc-500",
  existing_only: "border-amber-200 bg-amber-50 text-amber-800",
  unknown: "border-zinc-200 bg-white text-zinc-600",
};

const OPTIONS: PlanAvailability[] = ["active", "existing_only", "ended", "unknown"];

export function PlanAvailabilityControl({ plan }: { plan: PlanRecord }) {
  const router = useRouter();
  const [value, setValue] = useState<PlanAvailability>(plan.plan_status ?? "unknown");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function updateAvailability(nextValue: PlanAvailability) {
    const previousValue = value;
    setValue(nextValue);
    setSaving(true);
    setFailed(false);

    try {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          plan_status: nextValue,
        }),
      });

      if (!res.ok) throw new Error("Failed to update plan availability");
      router.refresh();
    } catch {
      setValue(previousValue);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="sr-only" htmlFor={`plan-availability-${plan.id}`}>
        {plan.plan_name}の受付状態
      </label>
      <select
        id={`plan-availability-${plan.id}`}
        value={value}
        disabled={saving}
        onChange={(event) => void updateAvailability(event.target.value as PlanAvailability)}
        className={`h-8 rounded-md border px-2 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-zinc-950/10 disabled:cursor-wait disabled:opacity-70 ${AVAILABILITY_CLASS[value]}`}
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {AVAILABILITY_LABEL[option]}
          </option>
        ))}
      </select>
      <p className={`text-[11px] ${failed ? "text-red-600" : "text-zinc-400"}`}>
        {failed ? "更新に失敗しました" : saving ? "保存中" : " "}
      </p>
    </div>
  );
}
