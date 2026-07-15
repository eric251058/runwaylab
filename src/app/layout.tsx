import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthNav } from "@/components/layout/AuthNav";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "RunwayLab｜AI 时尚设计孵化平台",
    template: "%s｜RunwayLab"
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "RunwayLab｜AI 时尚设计孵化平台",
    description: SITE_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: "RunwayLab｜AI 时尚设计孵化平台",
    description: SITE_DESCRIPTION
  },
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: SITE_URL
  },
  appleWebApp: {
    capable: true,
    title: "RunwayLab",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#111111"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthNav />
        <main className="min-h-dvh pb-20 md:pb-0">{children}</main>
        <SiteFooter />
        <BottomTabBar />
      </body>
    </html>
  );
}
