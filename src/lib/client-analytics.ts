"use client";

const SESSION_KEY = "sim_shindan_session_id";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxx-xxxx-xxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return createSessionId();

  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const sessionId = createSessionId();
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

export function trackClientEvent(input: {
  event_name: string;
  session_token?: string;
  step_index?: number;
  verdict?: string;
  plan_id?: string;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;

  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    // 計測失敗で診断体験を止めない。
  });
}
