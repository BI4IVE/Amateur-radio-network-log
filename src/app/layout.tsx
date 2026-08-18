// @version v1.5.11
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// [v1.5.11] 整个应用强制动态渲染，禁止静态预渲染。
// 否则 Next 会给页面固化 Cache-Control: s-maxage=31536000（缓存1年），
// 导致部署新代码后浏览器/CDN 仍展示旧页面（"缓存作怪"根因）。
// 动态渲染后页面不再预渲染，运行时由 middleware/next.config 统一下发 no-store。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "济南黄河业余无线电台-台网日志",
  description: "济南黄河业余无线电中继台台网日志系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
