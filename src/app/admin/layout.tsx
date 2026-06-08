import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ADMIN_AUTH_COOKIE, getAdminSecretToken, isAdminTokenValid } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "管理画面",
  robots: { index: false, follow: false },
};

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* 管理画面ナビ */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-white">🛠️ 管理画面</span>
        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="text-slate-300 hover:text-white transition-colors">
            ダッシュボード
          </Link>
          <Link href="/admin/diffs" className="text-slate-300 hover:text-white transition-colors">
            差分キュー
          </Link>
          <Link href="/admin/plans" className="text-slate-300 hover:text-white transition-colors">
            プラン管理
          </Link>
          <Link href="/admin/signals" className="text-slate-300 hover:text-white transition-colors">
            新サービス検知
          </Link>
        </div>
        <div className="ml-auto">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
            ← サイトへ戻る
          </Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}

function AdminLogin({ disabled }: { disabled: boolean }) {
  return (
    <div className="min-h-screen bg-slate-900 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-6">
        <h1 className="text-lg font-bold text-white">管理画面ログイン</h1>
        {disabled ? (
          <p className="mt-4 text-sm leading-relaxed text-red-300">
            ADMIN_SECRET_TOKEN が未設定のため、管理画面は無効です。
          </p>
        ) : (
          <form action="/api/admin/login" method="post" className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-400">Admin token</span>
              <input
                type="password"
                name="token"
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              ログイン
            </button>
          </form>
        )}
        <Link href="/" className="mt-5 inline-block text-xs text-slate-400 hover:text-slate-200">
          サイトへ戻る
        </Link>
      </div>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const expectedToken = getAdminSecretToken();
  const cookieToken = (await cookies()).get(ADMIN_AUTH_COOKIE)?.value;

  if (!isAdminTokenValid(cookieToken)) {
    return <AdminLogin disabled={!expectedToken} />;
  }

  return <AdminShell>{children}</AdminShell>;
}
