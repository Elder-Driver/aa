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
    title: "AA",
    description: "Split trip expenses with friends and settle up with fewer transfers.",
    applicationName: "AA",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "AA", statusBarStyle: "default" },
    icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
    openGraph: { title: "AA", description: "Split trip expenses with friends." },
    twitter: { card: "summary", title: "AA", description: "Split trip expenses with friends." },
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
