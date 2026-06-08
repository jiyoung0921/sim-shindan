"""
new_service_detector.py — 新規キャリア・新プランの検知スクリプト

2 系統のシグナルソースを監視:
  1. PR TIMES RSS — 通信キャリア関連の企業プレスリリース
  2. JPRS WHOIS   — 新規取得ドメイン (.jp) のキャリア系キーワードチェック

検知したシグナルは Supabase の new_service_signals テーブルに INSERT する。
"""

import asyncio
import logging
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

import feedparser
import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ─── キーワード定義 ───────────────────────────────────────────────────

POSITIVE_KEYWORDS = [
    "MVNO", "仮想移動体通信事業者",
    "格安SIM", "格安スマホ", "スマートフォン",
    "5G", "新料金プラン", "月額", "ギガ", "データ通信",
    "SIMフリー", "音声通話", "通信サービス",
    "MNP", "携帯電話", "モバイル",
]

NEGATIVE_KEYWORDS = [
    "企業向け", "法人", "IoT", "M2M", "衛星",
    "固定回線", "光回線", "CATV",
    "採用", "展示会", "セミナー", "IR情報", "決算",
]

CARRIER_DOMAIN_KEYWORDS = [
    "mobile", "simcard", "mvno", "gsm", "lte", "5g",
    "ketai", "sumaho", "sim", "smartphone",
]

# PR TIMES — 通信カテゴリ RSS
PRTIMES_RSS_URLS = [
    "https://prtimes.jp/rss/all.rss",  # 全件（フィルタリング前）
    "https://prtimes.jp/rss/tag/%E6%A0%BC%E5%AE%89SIM.rss",  # 格安SIM タグ
    "https://prtimes.jp/rss/tag/MVNO.rss",
]

# JPRS 新規登録ドメイン一覧 (公開ゾーンデータ, サンプル)
JPRS_ZONE_DATA_URL = "https://jprs.jp/about/dom-search/jprs-db/"


def score_text(text: str) -> tuple[float, list[str], bool]:
    """
    テキストにキーワードスコアリングを行う。

    Returns:
      (confidence: 0.0-1.0, matched_keywords: list, has_negative: bool)
    """
    text_lower = text.lower()
    matched = [kw for kw in POSITIVE_KEYWORDS if kw.lower() in text_lower]
    negatives = [kw for kw in NEGATIVE_KEYWORDS if kw.lower() in text_lower]

    # 基本スコア: マッチキーワード数 / 必要最低数(3)
    raw_score = min(len(matched) / 3.0, 1.0)
    # ネガティブキーワードでペナルティ
    penalty = min(len(negatives) * 0.2, 0.6)
    confidence = max(0.0, raw_score - penalty)

    return confidence, matched, len(negatives) > 0


# ─── PR TIMES RSS スキャン ─────────────────────────────────────────────

async def scan_prtimes_rss(
    lookback_hours: int = 25,
) -> list[dict]:
    """
    PR TIMES RSS から直近 lookback_hours 時間以内の記事を取得し、
    通信系キーワードにマッチするものをシグナルとして返す。
    """
    signals = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    for rss_url in PRTIMES_RSS_URLS:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(rss_url)
                feed = feedparser.parse(resp.text)
        except Exception as e:
            logger.warning("Failed to fetch RSS %s: %s", rss_url, e)
            continue

        for entry in feed.entries:
            try:
                # 日付パース
                published = entry.get("published_parsed")
                if published:
                    pub_dt = datetime(*published[:6], tzinfo=timezone.utc)
                    if pub_dt < cutoff:
                        continue

                title = entry.get("title", "")
                summary = entry.get("summary", "")
                url = entry.get("link", "")
                combined = f"{title} {summary}"

                confidence, matched, has_negative = score_text(combined)

                if confidence < 0.2:
                    continue  # スコアが低すぎる → スキップ

                signals.append({
                    "source": "prtimes_rss",
                    "title": title[:500],
                    "url": url,
                    "raw_content": summary[:1000],
                    "signal_type": "pr_times",
                    "confidence": round(confidence, 3),
                    "matched_keywords": matched,
                    "negative_match": has_negative,
                })
                logger.info("Signal detected: %s (conf=%.2f)", title[:60], confidence)

            except Exception as e:
                logger.warning("Error processing RSS entry: %s", e)

    return signals


# ─── JPRS ドメイン監視 ──────────────────────────────────────────────────

async def scan_jprs_new_domains() -> list[dict]:
    """
    JPRS の新規登録ドメイン一覧ページを取得して
    キャリア系ドメインを検知する。

    実際には JPRS のゾーンデータ取得には申請が必要なため、
    ここでは公開 RSS や別途 WHOIS API を使う簡易版を実装。
    """
    signals = []
    # TODO: JPRS 正式なゾーンデータへのアクセス権取得後に実装
    # 現状はサンプルとして whois.domaintools.com の公開APIを参照する形を想定
    logger.info("JPRS domain scan: skipped (requires zone data access)")
    return signals


# ─── シグナル INSERT ──────────────────────────────────────────────────

def insert_signals(signals: list[dict]) -> int:
    """
    検知したシグナルを Supabase に INSERT する。
    Supabase 未設定の場合はコンソール出力。
    """
    if not signals:
        return 0

    if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
        for s in signals:
            logger.info("[signal][dry-run] %s — conf=%.2f", s["title"][:60], s.get("confidence", 0))
        return len(signals)

    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        sb.table("new_service_signals").insert(signals).execute()
        logger.info("Inserted %d signals", len(signals))
        return len(signals)
    except Exception as e:
        logger.error("Failed to insert signals: %s", e)
        return 0


# ─── メイン ──────────────────────────────────────────────────────────

async def run_detector(lookback_hours: int = 25) -> int:
    """新サービス検知を実行してシグナル数を返す。"""
    logger.info("Starting new service detector (lookback=%dh)", lookback_hours)

    rss_signals = await scan_prtimes_rss(lookback_hours)
    jprs_signals = await scan_jprs_new_domains()
    all_signals = rss_signals + jprs_signals

    count = insert_signals(all_signals)
    logger.info("Detector finished: %d signals", count)
    return count


if __name__ == "__main__":
    import sys
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    hours = int(sys.argv[1]) if len(sys.argv) > 1 else 25
    asyncio.run(run_detector(hours))
