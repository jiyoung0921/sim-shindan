"""
diff.py — プランデータの差分生成・Supabase への書き込みモジュール

- 変更フィールドを特定して diff_type を判定
- anomaly_flags が存在する場合は status=auto_blocked
- Supabase の plan_diffs テーブルに INSERT
"""

import logging
import os
from datetime import datetime, timezone
from typing import Literal, Optional

from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
IGNORED_DIFF_FIELDS = {
    "evidence.fetched_at",
    "updated_at",
}

_supabase: Optional[Client] = None
DiffProcessResult = Literal["inserted", "duplicate", "skipped", "failed"]


def get_supabase() -> Optional[Client]:
    global _supabase
    if _supabase:
        return _supabase
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase


# ─── 差分検出 ─────────────────────────────────────────────────────────

def get_changed_fields(before: dict, after: dict, prefix: str = "") -> list[str]:
    """
    2つの辞書を再帰的に比較して変更されたフィールドのパスを返す。
    """
    changed = []
    all_keys = set(before) | set(after)
    for key in all_keys:
        path = f"{prefix}.{key}" if prefix else key
        b_val = before.get(key)
        a_val = after.get(key)
        if isinstance(b_val, dict) and isinstance(a_val, dict):
            changed += get_changed_fields(b_val, a_val, path)
        elif isinstance(b_val, list) and isinstance(a_val, list):
            if path not in IGNORED_DIFF_FIELDS and b_val != a_val:
                changed.append(path)
        elif b_val != a_val:
            if path not in IGNORED_DIFF_FIELDS:
                changed.append(path)
    return changed


def determine_diff_type(changed_fields: list[str], is_new: bool = False) -> str:
    """変更フィールドから diff_type を判定する。"""
    if is_new:
        return "new_plan"
    if any("monthly_fee_yen" in f for f in changed_fields):
        return "price_change"
    if any("discount" in f for f in changed_fields):
        return "discount_change"
    return "field_change"


def build_summary(
    plan_name: str,
    diff_type: str,
    changed_fields: list[str],
    before: Optional[dict],
    after: dict,
) -> str:
    """人間が読みやすい差分サマリーを生成する。"""
    if any(f in {"evidence.notes_hash", "scraper_observation"} for f in changed_fields):
        return f"{plan_name}: 公式ページ内容の変化を検知（要目視確認）"

    if diff_type == "new_plan":
        fee = after.get("billing", {}).get("tiers", [{}])[0].get("monthly_fee_yen")
        return f"{plan_name} を新規追加 (¥{fee:,}/月)" if fee else f"{plan_name} を新規追加"

    if diff_type == "price_change" and before:
        b_fee = before.get("billing", {}).get("tiers", [{}])[0].get("monthly_fee_yen")
        a_fee = after.get("billing", {}).get("tiers", [{}])[0].get("monthly_fee_yen")
        if b_fee and a_fee:
            diff = a_fee - b_fee
            direction = "値下げ" if diff < 0 else "値上げ"
            return f"{plan_name}: {direction} ¥{b_fee:,} → ¥{a_fee:,}/月 (差額 ¥{abs(diff):,})"

    return f"{plan_name}: {', '.join(changed_fields[:3])} を更新"


# ─── Supabase 書き込み ────────────────────────────────────────────────

def insert_diff(
    plan_id: str,
    plan_name: str,
    diff_type: str,
    changed_fields: list[str],
    summary: str,
    before_data: Optional[dict],
    after_data: dict,
    anomaly_flags: list[dict],
) -> DiffProcessResult:
    """
    plan_diffs テーブルに差分を INSERT する。
    異常フラグがある場合は status=auto_blocked。
    Supabase 未設定の場合は console.log で代替。
    """
    status = "auto_blocked" if anomaly_flags else "pending"

    record = {
        "plan_id": plan_id,
        "diff_type": diff_type,
        "status": status,
        "changed_fields": changed_fields,
        "summary": summary,
        "before_data": before_data,
        "after_data": after_data,
        "anomaly_flags": anomaly_flags,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    sb = get_supabase()
    if not sb:
        logger.info("[diff][dry-run] %s — %s", plan_id, summary)
        return "inserted"

    try:
        existing = (
            sb.table("plan_diffs")
            .select("id,status")
            .eq("plan_id", plan_id)
            .in_("status", ["pending", "auto_blocked"])
            .limit(1)
            .execute()
        )
        if existing.data:
            logger.info(
                "Open diff already exists for %s (%s) — skipping duplicate",
                plan_id,
                existing.data[0].get("status"),
            )
            return "duplicate"

        sb.table("plan_diffs").insert(record).execute()
        logger.info(
            "Diff inserted: %s (%s) status=%s anomalies=%d",
            plan_id, diff_type, status, len(anomaly_flags),
        )
        return "inserted"
    except Exception as e:
        logger.error("Failed to insert diff for %s: %s", plan_id, e)
        return "failed"


def process_plan_diff(
    after_plan: dict,
    before_plan: Optional[dict],
    anomaly_flags: list,
) -> DiffProcessResult:
    """
    メインパイプラインから呼ばれるエントリーポイント。
    before_plan が None → 新規プランとして扱う。
    """
    plan_id = after_plan.get("id", "")
    plan_name = after_plan.get("plan_name", plan_id)

    if before_plan is None:
        changed_fields: list[str] = []
        diff_type = "new_plan"
    else:
        changed_fields = get_changed_fields(before_plan, after_plan)
        if not changed_fields:
            logger.info("No changes for %s — skipping diff", plan_id)
            return "skipped"
        diff_type = determine_diff_type(changed_fields)

    summary = build_summary(plan_name, diff_type, changed_fields, before_plan, after_plan)

    return insert_diff(
        plan_id=plan_id,
        plan_name=plan_name,
        diff_type=diff_type,
        changed_fields=changed_fields,
        summary=summary,
        before_data=before_plan,
        after_data=after_plan,
        anomaly_flags=[f.model_dump() if hasattr(f, "model_dump") else f for f in anomaly_flags],
    )
