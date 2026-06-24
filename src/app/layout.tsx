import type { Metadata } from "next";
import "./globals.css";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

export const metadata: Metadata = {
  title: "设计上岸 RunwayLab",
  description: "新人设计挑战社区 + 作品孵化池"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="min-h-dvh pb-20 md:pb-0">{children}</main>
        <BottomTabBar />
      </body>
    </html>
  );
}
