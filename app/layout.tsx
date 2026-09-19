import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "星语岛｜少儿口才能力十二维 AI 评测",
  description: "用 12 个互动挑战，开启孩子的口才成长冒险。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
