import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Lock, OpenNewWindow } from "iconoir-react";
import { ADMIN_AUTH_COOKIE, getAdminSecretToken, isAdminTokenValid } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "管理画面",
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/diffs", label: "差分キュー" },
  { href: "/admin/plans", label: "プラン" },
  { href: "/admin/signals", label: "検知シグナル" },
];

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-950">スマホ料金診断</span>
            <span className="rounded-md bg-zinc-950 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              管理
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            target="_blank"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
          >
            サイトを表示
            <OpenNewWindow className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function AdminLogin({ disabled }: { disabled: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-zinc-950">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
            <Lock className="h-5 w-5 text-zinc-600" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-zinc-950">管理画面</h1>
          {disabled ? (
            <p className="mt-3 text-sm leading-6 text-red-600">
              ADMIN_SECRET_TOKEN が未設定のため、管理画面は無効です。
            </p>
          ) : (
            <form action="/api/admin/login" method="post" className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">管理トークン</span>
                <input
                  type="password"
                  name="token"
                  autoComplete="current-password"
                  required
                  className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-950"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                ログイン
              </button>
            </form>
          )}
        </div>
        <Link
          href="/"
          className="mt-4 inline-block text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
        >
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
