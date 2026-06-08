import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, isAdminTokenValid } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);

  if (isAdminTokenValid(token)) {
    res.cookies.set(ADMIN_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  return res;
}
