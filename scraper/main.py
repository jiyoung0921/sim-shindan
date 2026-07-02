"""
main.py — スクレイパーのメインエントリーポイント

実行手順:
  1. config.json を読み込む
  2. 全プランページを Conditional GET で取得 (fetcher)
  3. HTML から料金データを抽出 (extractor)
  4. ベースラインデータと正規化 (normalizer)
  5. Pydantic バリデーション + 異常検知 (validator)
  6. 変更があれば plan_diffs に INSERT (diff)
  7. 新サービス検知を並行実行 (new_service_detector)
  8. Slack に完了通知 (notifier)

使用例:
  python -m scraper.main
  python scraper/main.py --dry-run
"""

import asyncio
import json
import logging
import os
import sys
import uuid
from pathlib import Path

from fetcher import detect_content_hash_change, fetch_all, persist_content_hash
from extractor import extract_plan_data
from normalizer import normalize_plan, load_baseline_plans
from validator import validate_plan, validate_all
from diff import get_changed_fields, process_plan_diff
from new_service_detector import run_detector
from notifier import notify_slack

# ─── ロギング設定 ─────────────────────────────────────────────────────

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("main")

# ─── 設定読み込み ─────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent / "config.json"


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def flatten_plans(config: dict) -> list[dict]:
    """config.json の carriers[].plans[] を平坦なリストに変換する。"""
    plans = []
    for carrier in config.get("carriers", []):
        carrier_id = carrier["id"]
        for plan in carrier.get("plans", []):
            plans.append({**plan, "carrier_id": carrier_id})
    return plans


def db_row_to_plan_record(row: dict) -> dict:
    """Supabase plans のフラット行をアプリ側 PlanRecord 形式に戻す。"""
    if "evidence" in row:
        return row

    monthly_gb_raw = row.get("data_monthly_gb")
    if monthly_gb_raw == "unlimited":
        monthly_gb = "unlimited"
    else:
        try:
            monthly_gb = int(monthly_gb_raw)
        except (TypeError, ValueError):
            monthly_gb = monthly_gb_raw

    return {
        "id": row.get("id"),
        "carrier_id": row.get("carrier_id"),
        "brand_id": row.get("brand_id"),
        "plan_name": row.get("plan_name"),
        "plan_type": row.get("plan_type"),
        "billing": row.get("billing"),
        "discounts": row.get("discounts") or [],
        "point_economy": row.get("point_economy"),
        "data": {
            "monthly_gb": monthly_gb,
            "throttle_speed_kbps": row.get("data_throttle_kbps"),
            "tethering_gb": row.get("data_tethering"),
        },
        "constraints": {
            "online_only": row.get("online_only"),
            "store_support": row.get("store_support"),
            "esim_available": row.get("esim_available"),
            "sim_only_available": row.get("sim_only_available"),
            "payment_methods": row.get("payment_methods") or [],
        },
        "device": {
            "bundled_sales": row.get("bundled_sales"),
            "installment_available": row.get("installment_available"),
        },
        "evidence": {
            "source_url": row.get("source_url"),
            "fetched_at": row.get("fetched_at"),
            "published_at": row.get("published_at"),
            "reviewed_by": row.get("reviewed_by"),
            "reviewed_at": row.get("reviewed_at"),
            "snapshot_path": row.get("snapshot_path") or "",
            "notes_hash": row.get("notes_hash") or "",
        },
        "status": row.get("status"),
        "plan_status": row.get("plan_status"),
        "last_verified_at": row.get("last_verified_at") or row.get("fetched_at"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


# ─── Supabase から現在の公開プランを取得 ──────────────────────────────

def fetch_current_plans() -> dict[str, dict]:
    """
    Supabase の plans テーブルから published プランを取得する。
    Supabase 未設定の場合は plans.json から読む。
    """
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")

    if supabase_url and supabase_key:
        try:
            from supabase import create_client
            sb = create_client(supabase_url, supabase_key)
            res = sb.table("plans").select("*").eq("status", "published").execute()
            plans = res.data or []
            return {p["id"]: db_row_to_plan_record(p) for p in plans}
        except Exception as e:
            logger.warning("Failed to fetch plans from Supabase: %s — falling back to JSON", e)

    return load_baseline_plans()


# ─── メインパイプライン ───────────────────────────────────────────────

async def run(dry_run: bool = False) -> None:
    run_id = str(uuid.uuid4())[:8]
    logger.info("=== Scraper run started (run_id=%s dry_run=%s) ===", run_id, dry_run)

    config = load_config()
    all_plan_configs = flatten_plans(config)
    delay = config.get("request_delay_sec", 2.0)

    logger.info("Plans to scrape: %d", len(all_plan_configs))

    # ─── 1. HTTP 取得 ──────────────────────────────────────────────
    fetch_results = await fetch_all(all_plan_configs, delay=delay)

    changed = [(pid, url, html) for pid, url, html in fetch_results if html is not None]
    skipped = len(fetch_results) - len(changed)
    logger.info("Fetched: %d changed, %d skipped (304/error)", len(changed), skipped)

    if not changed:
        logger.info("No changes detected — exiting early")
        return

    # ─── 2. 現行プランデータ取得（比較用） ───────────────────────
    current_plans = fetch_current_plans()

    # ─── 3. 抽出 → 正規化 → バリデーション ─────────────────────
    plan_config_map = {p["plan_id"]: p for p in all_plan_configs}

    pending_count = 0
    blocked_count = 0
    summaries: list[str] = []

    for plan_id, url, html in changed:
        cfg = plan_config_map.get(plan_id, {})
        selector_config = cfg.get("selectors")
        hash_change = detect_content_hash_change(plan_id, url, html)
        if hash_change["text_length"] < 500:
            logger.warning(
                "Thin HTML text detected for %s (%d chars) — JS rendering fallback may be needed",
                plan_id,
                hash_change["text_length"],
            )

        # 3a. 抽出
        extracted = extract_plan_data(plan_id, html, selector_config)

        # 3b. 正規化
        before_plan = current_plans.get(plan_id)
        normalized = normalize_plan(plan_id, extracted, before_plan)
        if normalized is None:
            logger.warning("Skipping %s — normalization failed", plan_id)
            continue

        if hash_change["changed"]:
            normalized.setdefault("evidence", {})
            normalized["evidence"]["notes_hash"] = hash_change["new_hash"]
            normalized["scraper_observation"] = {
                "type": "content_hash_change",
                "source_url": url,
                "old_hash": hash_change["old_hash"],
                "new_hash": hash_change["new_hash"],
                "raw_texts": extracted.get("raw_texts", []),
                "text_excerpt": hash_change["text_excerpt"],
                "text_length": hash_change["text_length"],
            }

        # 3c. バリデーション
        vr = validate_plan(normalized, before_plan)
        if not vr.ok:
            logger.error("Validation failed for %s: %s", plan_id, vr.errors)
            continue

        if before_plan is not None and not get_changed_fields(before_plan, normalized):
            logger.info("No material changes for %s — skipping diff", plan_id)
            if not dry_run:
                persist_content_hash(plan_id, url, hash_change["new_hash"])
            continue

        if dry_run:
            logger.info("[dry-run] Would insert diff for %s", plan_id)
            logger.info("[dry-run]   anomalies=%d", len(vr.anomaly_flags))
            continue

        # 3d. 差分 INSERT
        diff_result = process_plan_diff(
            after_plan=normalized,
            before_plan=before_plan,
            anomaly_flags=vr.anomaly_flags,
        )

        if diff_result in {"inserted", "duplicate"}:
            persist_content_hash(plan_id, url, hash_change["new_hash"])

        if diff_result == "inserted":
            pending_count += 1
            if vr.anomaly_flags:
                blocked_count += 1
            # サマリー収集
            plan_name = normalized.get("plan_name", plan_id)
            fee = normalized.get("billing", {}).get("tiers", [{}])[0].get("monthly_fee_yen")
            if hash_change["changed"]:
                summaries.append(f"{plan_name}: 公式ページ内容の変化を検知（要目視確認）")
            else:
                summaries.append(
                    f"{plan_name}: ¥{fee:,}/月" if fee else plan_name
                )

    # ─── 4. 新サービス検知（並行実行） ──────────────────────────
    logger.info("Running new service detector…")
    try:
        signal_count = await run_detector(lookback_hours=25)
        logger.info("New service signals detected: %d", signal_count)
    except Exception as e:
        logger.error("New service detector failed: %s", e)

    # ─── 5. Slack 通知 ────────────────────────────────────────────
    if not dry_run:
        await notify_slack(
            pending_count=pending_count,
            blocked_count=blocked_count,
            plan_summaries=summaries,
            run_id=run_id,
        )

    logger.info(
        "=== Scraper run complete (run_id=%s) pending=%d blocked=%d ===",
        run_id, pending_count, blocked_count,
    )


# ─── CLI エントリーポイント ───────────────────────────────────────────

if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))
