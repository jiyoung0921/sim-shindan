"""
fetcher.py — HTTPキャッシュ対応のページ取得モジュール

- Conditional GET (ETag / Last-Modified) でリクエストを最小化
- Supabase の fetch_states テーブルで ETag を永続管理
- tenacity でリトライ（指数バックオフ）
- 429 / 503 を受けたら最大 60 秒待機して再試行
"""

import asyncio
import hashlib
import logging
import os
import re
import ssl
from datetime import datetime, timezone
from typing import Optional, TypedDict

from bs4 import BeautifulSoup
import certifi
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
    "Mozilla/5.0 (compatible; SimShindanBot/1.0; +https://sumahoshindan.com/bot)",
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


class HashChange(TypedDict):
    changed: bool
    old_hash: Optional[str]
    new_hash: str
    text_excerpt: str
    text_length: int


def normalize_html_text(html: str) -> str:
    """HTMLから監視用の安定した本文テキストを作る。"""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    text = soup.get_text(" ")
    return re.sub(r"\s+", " ", text).strip()


def calculate_content_hash(html: str) -> tuple[str, str]:
    normalized = normalize_html_text(html)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return digest, normalized


def _load_fetch_state(url: str) -> dict:
    sb = get_supabase()
    if not sb:
        return _memory_store.get(url, {})
    try:
        res = sb.table("fetch_states").select("*").eq("url", url).single().execute()
        return res.data or {}
    except Exception:
        return {}


def _save_fetch_state(
    plan_id: str,
    url: str,
    etag: Optional[str],
    last_modified: Optional[str],
    last_status: int,
    success: bool,
    last_hash: Optional[str] = None,
) -> None:
    previous = _load_fetch_state(url)
    consecutive_errors = 0 if success else int(previous.get("consecutive_errors") or 0) + 1
    state = {
        "url": url,
        "plan_id": plan_id,
        "etag": etag if etag is not None else previous.get("etag"),
        "last_modified": last_modified if last_modified is not None else previous.get("last_modified"),
        "last_hash": last_hash if last_hash is not None else previous.get("last_hash"),
        "last_status": last_status,
        "consecutive_errors": consecutive_errors,
        "last_fetched_at": datetime.now(timezone.utc).isoformat(),
    }

    sb = get_supabase()
    if not sb:
        _memory_store[url] = state
        return
    try:
        sb.table("fetch_states").upsert(state, on_conflict="url").execute()
    except Exception as e:
        logger.warning("fetch_state save failed: %s", e)


def detect_content_hash_change(plan_id: str, url: str, html: str) -> HashChange:
    """
    取得HTMLの本文hashを計算し、前回から変化したかを返す。

    ここでは保存しない。dry-runやdiff INSERT失敗で変化シグナルを消費しないため。
    初回は changed=False。
    """
    previous = _load_fetch_state(url)
    old_hash = previous.get("last_hash")
    new_hash, normalized_text = calculate_content_hash(html)

    logger.debug(
        "content hash checked for %s old=%s new=%s text_len=%d",
        plan_id,
        old_hash[:12] if old_hash else None,
        new_hash[:12],
        len(normalized_text),
    )

    return {
        "changed": old_hash is not None and old_hash != new_hash,
        "old_hash": old_hash,
        "new_hash": new_hash,
        "text_excerpt": normalized_text[:2000],
        "text_length": len(normalized_text),
    }


def persist_content_hash(plan_id: str, url: str, content_hash: str) -> None:
    """検証またはdiff登録が済んだHTML hashだけをfetch_statesへ保存する。"""
    previous = _load_fetch_state(url)
    _save_fetch_state(
        plan_id=plan_id,
        url=url,
        etag=previous.get("etag"),
        last_modified=previous.get("last_modified"),
        last_status=int(previous.get("last_status") or 200),
        success=True,
        last_hash=content_hash,
    )


def update_content_hash(plan_id: str, url: str, html: str) -> HashChange:
    """後方互換用。新規コードでは detect → persist を分けて使う。"""
    result = detect_content_hash_change(plan_id, url, html)
    persist_content_hash(plan_id, url, result["new_hash"])
    return result


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
    state = _load_fetch_state(url)
    headers: dict[str, str] = {"User-Agent": USER_AGENT}
    if state.get("etag"):
        headers["If-None-Match"] = state["etag"]
    if state.get("last_modified"):
        headers["If-Modified-Since"] = state["last_modified"]

    logger.info("GET %s (plan=%s)", url, plan_id)
    resp = await client.get(url, headers=headers, follow_redirects=True, timeout=20)

    if resp.status_code == 304:
        logger.info("304 Not Modified: %s", plan_id)
        _save_fetch_state(
            plan_id,
            url,
            resp.headers.get("etag"),
            resp.headers.get("last-modified"),
            304,
            True,
        )
        raise NotModifiedError(plan_id)

    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "30"))
        logger.warning("429 Too Many Requests — sleeping %ds", retry_after)
        _save_fetch_state(
            plan_id,
            url,
            resp.headers.get("etag"),
            resp.headers.get("last-modified"),
            429,
            False,
        )
        await asyncio.sleep(retry_after)
        raise FetchError(f"429 for {url}")

    if resp.status_code >= 400:
        _save_fetch_state(
            plan_id,
            url,
            resp.headers.get("etag"),
            resp.headers.get("last-modified"),
            resp.status_code,
            False,
        )
        raise FetchError(f"HTTP {resp.status_code} for {url}")

    # ETag / Last-Modified を保存
    _save_fetch_state(
        plan_id,
        url,
        resp.headers.get("etag"),
        resp.headers.get("last-modified"),
        resp.status_code,
        True,
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
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    ssl_context.options |= getattr(ssl, "OP_LEGACY_SERVER_CONNECT", 0x4)
    ssl_context.set_ciphers("DEFAULT:@SECLEVEL=1")
    async with httpx.AsyncClient(limits=limits, http2=True, verify=ssl_context) as client:
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
