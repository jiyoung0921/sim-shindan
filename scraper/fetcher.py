"""
fetcher.py — HTTPキャッシュ対応のページ取得モジュール

- Conditional GET (ETag / Last-Modified) でリクエストを最小化
- Supabase の fetch_states テーブルで ETag を永続管理
- tenacity でリトライ（指数バックオフ）
- 429 / 503 を受けたら最大 60 秒待機して再試行
"""

import asyncio
import logging
import os
from typing import Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)
from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
USER_AGENT = os.getenv(
    "SCRAPER_UA",
    "Mozilla/5.0 (compatible; SimShindanBot/1.0; +https://sim-shindan.example.com/bot)",
)

_supabase: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    global _supabase
    if _supabase:
        return _supabase
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase


# ─── ETag ストア（Supabase がなければメモリ） ───────────────────────

_memory_store: dict[str, dict] = {}


def _load_fetch_state(plan_id: str) -> dict:
    sb = get_supabase()
    if not sb:
        return _memory_store.get(plan_id, {})
    try:
        res = sb.table("fetch_states").select("*").eq("plan_id", plan_id).single().execute()
        return res.data or {}
    except Exception:
        return {}


def _save_fetch_state(plan_id: str, etag: Optional[str], last_modified: Optional[str]) -> None:
    sb = get_supabase()
    if not sb:
        _memory_store[plan_id] = {"etag": etag, "last_modified": last_modified}
        return
    try:
        sb.table("fetch_states").upsert(
            {
                "plan_id": plan_id,
                "etag": etag,
                "last_modified": last_modified,
                "last_fetched_at": "now()",
            },
            on_conflict="plan_id",
        ).execute()
    except Exception as e:
        logger.warning("fetch_state save failed: %s", e)


# ─── リトライ付き GET ────────────────────────────────────────────────

class NotModifiedError(Exception):
    """304 Not Modified — コンテンツ変化なし"""


class FetchError(Exception):
    """取得失敗（4xx/5xx）"""


@retry(
    retry=retry_if_exception_type(FetchError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=4, max=60),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def fetch_page(client: httpx.AsyncClient, plan_id: str, url: str) -> str:
    """
    指定URLのHTMLを取得して返す。

    - 304 → NotModifiedError を送出（呼び出し元がスキップ判断）
    - 4xx/5xx → FetchError（リトライ対象）
    """
    state = _load_fetch_state(plan_id)
    headers: dict[str, str] = {"User-Agent": USER_AGENT}
    if state.get("etag"):
        headers["If-None-Match"] = state["etag"]
    if state.get("last_modified"):
        headers["If-Modified-Since"] = state["last_modified"]

    logger.info("GET %s (plan=%s)", url, plan_id)
    resp = await client.get(url, headers=headers, follow_redirects=True, timeout=20)

    if resp.status_code == 304:
        logger.info("304 Not Modified: %s", plan_id)
        raise NotModifiedError(plan_id)

    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "30"))
        logger.warning("429 Too Many Requests — sleeping %ds", retry_after)
        await asyncio.sleep(retry_after)
        raise FetchError(f"429 for {url}")

    if resp.status_code >= 400:
        raise FetchError(f"HTTP {resp.status_code} for {url}")

    # ETag / Last-Modified を保存
    _save_fetch_state(
        plan_id,
        resp.headers.get("etag"),
        resp.headers.get("last-modified"),
    )

    return resp.text


async def fetch_all(
    plans: list[dict], delay: float = 2.0
) -> list[tuple[str, str, Optional[str]]]:
    """
    plans: [{"plan_id": ..., "url": ..., ...}, ...]
    Returns: [(plan_id, url, html_or_None), ...]
      html_or_None が None なら変化なし（304）
    """
    results = []
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    async with httpx.AsyncClient(limits=limits, http2=True) as client:
        for plan in plans:
            plan_id = plan["plan_id"]
            url = plan["url"]
            try:
                html = await fetch_page(client, plan_id, url)
                results.append((plan_id, url, html))
            except NotModifiedError:
                results.append((plan_id, url, None))
            except FetchError as e:
                logger.error("Fetch failed for %s: %s", plan_id, e)
                results.append((plan_id, url, None))
            except Exception as e:
                logger.error("Unexpected error for %s: %s", plan_id, e)
                results.append((plan_id, url, None))
            await asyncio.sleep(delay)
    return results
