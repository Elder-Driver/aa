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
    title: "一起AA｜旅行分账，轻松算清",
    description: "无须注册的多人旅行 AA 记账工具。",
    applicationName: "一起AA",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "一起AA", statusBarStyle: "default" },
    icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
    openGraph: { title: "一起AA", description: "旅途尽兴，分钱不费心。", images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "一起AA", description: "旅途尽兴，分钱不费心。", images: ["/og.png"] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f3ea",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
