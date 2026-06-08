import type { Metadata } from "next";

// 診断結果はユーザー個別ページなのでインデックス不要
export const metadata: Metadata = {
  title: "診断結果",
  robots: { index: false, follow: false },
};

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
