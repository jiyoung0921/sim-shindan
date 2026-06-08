"""
extractor.py — HTML からプラン料金データを抽出するモジュール

各キャリアページの構造は微妙に異なるため、
config.json の selectors を試し → 複数候補からパターンマッチで正規化する。

返却値はすべて生の文字列・数値 (正規化前)。
"""

import re
import logging
from typing import Optional

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# 価格テキストから数値を抽出するパターン
_PRICE_RE = re.compile(r"[\d,]+(?:\.\d+)?(?=\s*円|/月|/m|\s*税込|\s*税抜)")
_PRICE_CLEAN = re.compile(r"[^\d]")

# データ容量の抽出パターン
_DATA_GB_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:GB|ギガ)", re.IGNORECASE)

# 通話に関するキーワード
_CALL_KEYWORDS = re.compile(
    r"(5分|10分|完全かけ放題|かけ放題|無制限|通話定額|3分)",
    re.IGNORECASE,
)


def extract_price_yen(text: str) -> Optional[int]:
    """テキストから価格（円）を抽出する。失敗したら None。"""
    # "2,970円" "2970円/月" "2970" など
    m = _PRICE_RE.search(text)
    if m:
        raw = _PRICE_CLEAN.sub("", m.group())
        try:
            return int(raw)
        except ValueError:
            pass
    # fallback: 連続した数字を探す
    nums = re.findall(r"\d{3,6}", text)
    candidates = [int(n) for n in nums if 500 <= int(n) <= 30000]
    return candidates[0] if candidates else None


def extract_data_gb(text: str) -> Optional[float]:
    """テキストからデータ容量(GB)を抽出する。"""
    m = _DATA_GB_RE.search(text)
    if m:
        return float(m.group(1))
    return None


def _try_selectors(soup: BeautifulSoup, selectors: list[str]) -> list[str]:
    """複数の CSS セレクタを順に試し、マッチした要素のテキストを返す。"""
    for sel in selectors:
        try:
            els = soup.select(sel)
            texts = [el.get_text(strip=True) for el in els if el.get_text(strip=True)]
            if texts:
                return texts
        except Exception:
            continue
    return []


def extract_plan_data(
    plan_id: str,
    html: str,
    selector_config: Optional[dict] = None,
) -> dict:
    """
    HTML + セレクタ設定からプランデータを抽出する。

    Returns: {
      "plan_id": str,
      "base_fee_yen": int | None,
      "data_gb_limit": float | None,
      "call_option_hint": str | None,
      "raw_texts": list[str],        # デバッグ用
    }
    """
    soup = BeautifulSoup(html, "lxml")
    result: dict = {
        "plan_id": plan_id,
        "base_fee_yen": None,
        "data_gb_limit": None,
        "call_option_hint": None,
        "raw_texts": [],
    }

    # セレクタ候補（config + 汎用フォールバック）
    price_selectors = []
    if selector_config and selector_config.get("base_fee"):
        price_selectors.append(selector_config["base_fee"])
    price_selectors += [
        ".price-main", ".plan-price", ".charge-price", ".price-num",
        "[class*='price'] strong", "[class*='charge'] strong",
        "td.price", ".fee-amount", ".monthly-fee",
    ]

    price_texts = _try_selectors(soup, price_selectors)
    result["raw_texts"] = price_texts[:10]

    # 最初の有効な価格を採用
    for text in price_texts:
        fee = extract_price_yen(text)
        if fee and 500 <= fee <= 30000:
            result["base_fee_yen"] = fee
            break

    # データ容量（ページ全体から探す）
    page_text = soup.get_text(" ")
    result["data_gb_limit"] = extract_data_gb(page_text)

    # 通話オプションのヒント
    m = _CALL_KEYWORDS.search(page_text)
    if m:
        result["call_option_hint"] = m.group(0)

    if result["base_fee_yen"]:
        logger.info(
            "Extracted %s: ¥%d, %sGB",
            plan_id,
            result["base_fee_yen"],
            result["data_gb_limit"] or "?",
        )
    else:
        logger.warning("Could not extract price for %s. Raw texts: %s", plan_id, price_texts[:3])

    return result
