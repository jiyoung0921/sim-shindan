import type { NextRequest } from "next/server";

export const ADMIN_AUTH_COOKIE = "sim_shindan_admin_token";

export function getAdminSecretToken(): string | undefined {
  const token = process.env.ADMIN_SECRET_TOKEN?.trim();
  return token ? token : undefined;
}

export function isAdminTokenValid(token: string | null | undefined): boolean {
  const expected = getAdminSecretToken();
  return !!expected && token === expected;
}

export function verifyAdminRequest(req: NextRequest): boolean {
  const headerToken = req.headers.get("x-admin-token");
  const cookieToken = req.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  const token = headerToken?.trim() ? headerToken : cookieToken;
  return isAdminTokenValid(token);
}
