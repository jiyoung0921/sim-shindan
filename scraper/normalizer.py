"""
normalizer.py — 抽出した生データを PlanRecord 形式に正規化するモジュール

- 既存の plans.json / Supabase の plans テーブルからベースラインを読み込む
- 抽出データでベースラインの billing.tiers[0].monthly_fee_yen を上書きする
- 正規化後のデータは validator.py に渡す
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

PLANS_JSON_PATH = os.path.join(
    os.path.dirname(__file__), "..", "public", "data", "plans.json"
)


def load_baseline_plans() -> dict[str, dict]:
    """
    plans.json からプランデータを辞書で読み込む。
    {plan_id: plan_dict} の形式で返す。
    """
    try:
        with open(PLANS_JSON_PATH, encoding="utf-8") as f:
            plans = json.load(f)
        return {p["id"]: p for p in plans}
    except Exception as e:
        logger.error("Failed to load plans.json: %s", e)
        return {}


def now_jst_iso() -> str:
    """JST の現在時刻を ISO 8601 で返す（Zulu 表記）。"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+09:00")


def normalize_plan(
    plan_id: str,
    extracted: dict,
    baseline: Optional[dict] = None,
) -> Optional[dict]:
    """
    抽出データ + ベースラインから正規化済みプランデータを生成する。

    baseline が None の場合は plans.json から読む。
    返り値が None の場合は正規化不可（ベースラインが存在しない）。
    """
    baselines = load_baseline_plans() if baseline is None else {}
    plan = baseline or baselines.get(plan_id)

    if not plan:
        logger.warning("No baseline found for plan_id=%s — skipping normalization", plan_id)
        return None

    # ディープコピーしてベースラインを保護
    import copy
    normalized = copy.deepcopy(plan)

    # billing.tiers[0].monthly_fee_yen を更新
    new_fee = extracted.get("base_fee_yen")
    if new_fee and normalized.get("billing", {}).get("tiers"):
        normalized["billing"]["tiers"][0]["monthly_fee_yen"] = new_fee
        normalized["billing"]["base_fee_yen"] = new_fee
        logger.info("Normalized %s: ¥%d", plan_id, new_fee)

    # data_gb_limit を更新（取得できた場合のみ）
    new_gb = extracted.get("data_gb_limit")
    if new_gb and normalized.get("billing", {}).get("tiers"):
        tiers = normalized["billing"]["tiers"]
        # 同一容量の tier を更新（最初の tier を対象）
        if tiers[0].get("up_to_gb") != new_gb:
            tiers[0]["up_to_gb"] = new_gb

    # evidence を更新
    normalized.setdefault("evidence", {})
    normalized["evidence"]["fetched_at"] = now_jst_iso()

    return normalized


def normalize_all(
    extracted_list: list[dict],
    baselines: Optional[dict[str, dict]] = None,
) -> list[dict]:
    """
    複数プランを一括正規化。
    baselines が None の場合は plans.json を参照。
    """
    if baselines is None:
        baselines = load_baseline_plans()

    results = []
    for extracted in extracted_list:
        plan_id = extracted.get("plan_id", "")
        normalized = normalize_plan(plan_id, extracted, baselines.get(plan_id))
        if normalized:
            results.append(normalized)
    return results
