import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthNav } from "@/components/layout/AuthNav";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

export const metadata: Metadata = {
  title: "设计上岸 RunwayLab",
  description: "新人设计挑战社区 + 作品孵化池",
  manifest: "/manifest.json",
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
        <BottomTabBar />
      </body>
    </html>
  );
}
