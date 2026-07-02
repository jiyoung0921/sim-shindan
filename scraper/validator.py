"""
validator.py — Pydantic v2 によるプランデータ検証モジュール

- 必須フィールドの型・範囲チェック
- monthly_fee_yen が 200〜30000 円の範囲内かチェック
- 異常変動検出: 前回値比 ±30% 超を anomaly_flags に記録
"""

import logging
from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

ANOMALY_THRESHOLD_PCT = 30.0  # ±30% で異常フラグ
NON_MONTHLY_TIER_LABEL_PATTERNS = (
    "6時間",
    "24時間",
    "7日",
    "90日",
    "180日",
    "365日",
    "回分",
)


# ─── Pydantic モデル定義 ──────────────────────────────────────────────

class PriceTier(BaseModel):
    up_to_gb: Optional[Union[float, str]] = None
    monthly_fee_yen: int = Field(ge=0, le=50000)
    label: Optional[str] = None

    @field_validator("label")
    @classmethod
    def label_must_fit_monthly_model(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        for pattern in NON_MONTHLY_TIER_LABEL_PATTERNS:
            if pattern in v:
                raise ValueError(
                    f"tier label={v!r} is not compatible with monthly comparison model"
                )
        return v


class Billing(BaseModel):
    tiers: list[PriceTier] = Field(min_length=1)

    @field_validator("tiers")
    @classmethod
    def tiers_must_have_fee(cls, v: list[PriceTier]) -> list[PriceTier]:
        for tier in v:
            if tier.monthly_fee_yen < 200:
                raise ValueError(f"monthly_fee_yen={tier.monthly_fee_yen} is too low (< 200)")
            if tier.monthly_fee_yen > 30000:
                raise ValueError(f"monthly_fee_yen={tier.monthly_fee_yen} is too high (> 30000)")
        return v


class Evidence(BaseModel):
    source_url: str
    fetched_at: str
    notes_hash: Optional[str] = None

    @field_validator("source_url")
    @classmethod
    def source_url_must_be_official_url(cls, v: str) -> str:
        if not v or not v.startswith(("https://", "http://")):
            raise ValueError("evidence.source_url must be an official HTTP(S) URL")
        return v


class PlanRecordValidated(BaseModel):
    id: str
    carrier_id: str
    plan_name: str
    plan_type: str
    billing: Billing
    evidence: Evidence
    plan_status: str = "unknown"

    @field_validator("plan_status")
    @classmethod
    def plan_status_must_be_known_value(cls, v: str) -> str:
        allowed = {"active", "ended", "existing_only", "unknown"}
        if v not in allowed:
            raise ValueError(f"plan_status must be one of {sorted(allowed)}")
        return v


# ─── 異常フラグ生成 ──────────────────────────────────────────────────

class AnomalyFlag(BaseModel):
    type: str
    field: str
    before: Optional[float] = None
    after: Optional[float] = None
    pct: Optional[float] = None


def detect_anomalies(
    plan_id: str,
    before: dict,
    after: dict,
    threshold_pct: float = ANOMALY_THRESHOLD_PCT,
) -> list[AnomalyFlag]:
    """
    before と after を比較して異常変動を検出する。
    """
    flags: list[AnomalyFlag] = []

    def compare_fee(label: str, b: Optional[int], a: Optional[int]) -> None:
        if b is None or a is None or b == 0:
            return
        pct = (a - b) / b * 100
        if abs(pct) >= threshold_pct:
            flags.append(
                AnomalyFlag(
                    type="price_anomaly",
                    field=label,
                    before=float(b),
                    after=float(a),
                    pct=round(pct, 2),
                )
            )
            logger.warning(
                "Anomaly detected: %s.%s %d→%d (%.1f%%)",
                plan_id, label, b, a, pct,
            )

    # billing.tiers の monthly_fee_yen を比較
    b_tiers = before.get("billing", {}).get("tiers", [])
    a_tiers = after.get("billing", {}).get("tiers", [])
    for i, (bt, at) in enumerate(zip(b_tiers, a_tiers)):
        compare_fee(
            f"billing.tiers[{i}].monthly_fee_yen",
            bt.get("monthly_fee_yen"),
            at.get("monthly_fee_yen"),
        )

    return flags


# ─── バリデーション実行 ─────────────────────────────────────────────

class ValidationResult(BaseModel):
    plan_id: str
    ok: bool
    errors: list[str] = Field(default_factory=list)
    anomaly_flags: list[AnomalyFlag] = Field(default_factory=list)
    validated_plan: Optional[dict] = None


def validate_plan(
    plan: dict,
    before_plan: Optional[dict] = None,
) -> ValidationResult:
    """
    1つのプランデータを検証する。

    - Pydantic で必須フィールド・型チェック
    - before_plan があれば異常変動チェックも実施
    """
    plan_id = plan.get("id", "unknown")
    errors: list[str] = []
    anomaly_flags: list[AnomalyFlag] = []

    try:
        validated = PlanRecordValidated(**plan)
        validated_dict = validated.model_dump()
    except Exception as e:
        errors.append(str(e))
        logger.error("Validation failed for %s: %s", plan_id, e)
        return ValidationResult(plan_id=plan_id, ok=False, errors=errors)

    # 異常変動チェック
    if before_plan:
        anomaly_flags = detect_anomalies(plan_id, before_plan, plan)

    return ValidationResult(
        plan_id=plan_id,
        ok=True,
        errors=errors,
        anomaly_flags=anomaly_flags,
        validated_plan=validated_dict,
    )


def validate_all(
    plans: list[dict],
    before_map: Optional[dict[str, dict]] = None,
) -> list[ValidationResult]:
    """
    複数プランを一括バリデーション。

    before_map: {plan_id: before_plan_dict}
    """
    results = []
    for plan in plans:
        plan_id = plan.get("id", "")
        before = before_map.get(plan_id) if before_map else None
        results.append(validate_plan(plan, before))
    return results
