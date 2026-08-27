// @version v1.5.17
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
  // [v1.5.13] 内联脚本：监听脚本/资源加载失败与未捕获异常，自动刷新一次避开 bfcache 旧页。
  // 仅对 "_next/static"（哈希 chunk）加载失败自动刷新；普通业务异常交给错误边界。
  const reloadScript = `(function(){
    try {
      var done = false;
      function go(){ if(done) return; done = true; setTimeout(function(){ location.href = location.origin + location.pathname + "?cb=" + Date.now(); }, 800); }
      window.addEventListener('error', function(e){
        if(e && e.target && e.target.tagName === 'SCRIPT' && e.target.src && e.target.src.indexOf('/_next/static/') > -1){
          console.warn('[Cache] chunk加载失败，自动刷新:', e.target.src);
          go();
        }
      }, true);
    } catch(e){}
  })();`
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: reloadScript }} />
        {children}
      </body>
    </html>
  );
}
