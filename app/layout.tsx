import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: "分账搭子 SplitPack",
    description: "多人旅行分账工具。创建账本、邀请朋友、记录支出，并生成最少转账方案。",
    applicationName: "分账搭子",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "分账搭子", statusBarStyle: "default" },
    icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
    openGraph: { title: "分账搭子 SplitPack", description: "旅行分账，不绕弯。" },
    twitter: { card: "summary", title: "分账搭子 SplitPack", description: "旅行分账，不绕弯。" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f4ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
