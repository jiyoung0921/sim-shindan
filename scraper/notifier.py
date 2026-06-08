"""
notifier.py — Slack 通知モジュール

環境変数 SLACK_WEBHOOK_URL が設定されている場合のみ通知を送る。
未設定の場合はコンソールに出力して終了（本番前でも動作保証）。
"""

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")


def _build_blocks(
    pending_count: int,
    blocked_count: int,
    plan_summaries: list[str],
    run_id: Optional[str] = None,
) -> list[dict]:
    """Slack Block Kit ブロックを組み立てる。"""
    emoji = "🚨" if blocked_count > 0 else "📋"
    title = f"{emoji} スマホ料金診断 — スクレイパー完了"

    header = {
        "type": "header",
        "text": {"type": "plain_text", "text": title},
    }

    stats_text = (
        f"*承認待ち:* {pending_count}件　"
        f"*異常ブロック:* {blocked_count}件"
    )
    stats_block = {
        "type": "section",
        "text": {"type": "mrkdwn", "text": stats_text},
    }

    blocks = [header, {"type": "divider"}, stats_block]

    if plan_summaries:
        items = "\n".join(f"• {s}" for s in plan_summaries[:10])
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*変更内容:*\n{items}"},
        })

    if blocked_count > 0:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "⚠️ *異常検知あり* — 管理画面で内容を確認してから承認してください。",
            },
        })

    admin_url = os.getenv("ADMIN_BASE_URL", "http://localhost:3000") + "/admin/diffs"
    blocks.append({
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {"type": "plain_text", "text": "差分を確認する →"},
                "url": admin_url,
                "style": "primary" if blocked_count == 0 else "danger",
            }
        ],
    })

    if run_id:
        blocks.append({
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"Run ID: `{run_id}`"}],
        })

    return blocks


async def notify_slack(
    pending_count: int,
    blocked_count: int,
    plan_summaries: list[str],
    run_id: Optional[str] = None,
) -> None:
    """
    Slack Webhook で通知を送信する。
    SLACK_WEBHOOK_URL が未設定の場合は logger.info で代替。
    """
    if not SLACK_WEBHOOK_URL:
        logger.info(
            "[notify] Slack not configured. pending=%d blocked=%d summaries=%s",
            pending_count, blocked_count, plan_summaries,
        )
        return

    if pending_count == 0 and blocked_count == 0:
        logger.info("[notify] No changes — skipping Slack notification")
        return

    payload = {
        "blocks": _build_blocks(pending_count, blocked_count, plan_summaries, run_id),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                SLACK_WEBHOOK_URL,
                content=json.dumps(payload),
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                logger.info("[notify] Slack notification sent (pending=%d blocked=%d)", pending_count, blocked_count)
            else:
                logger.warning("[notify] Slack responded %d: %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("[notify] Failed to send Slack notification: %s", e)
