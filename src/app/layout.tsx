// @version v2.0.2
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { pageConfigManager } from "@/storage/database";

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

/**
 * [v2.0.0] 51LA 统计配置
 *
 * 存 page_configs：analytics_51la_id / analytics_51la_ck。
 * 加 60 秒内存缓存，避免每个请求（含大屏轮询）都多打两次库。
 * 读库失败时返回空值 —— 统计挂了不能影响整站渲染。
 */
let analyticsCache: { id: string; ck: string; at: number } | null = null;

async function getAnalyticsConfig(): Promise<{ id: string; ck: string }> {
  if (analyticsCache && Date.now() - analyticsCache.at < 60_000) {
    return { id: analyticsCache.id, ck: analyticsCache.ck };
  }
  try {
    const [idConfig, ckConfig] = await Promise.all([
      pageConfigManager.getConfigByKey("analytics_51la_id"),
      pageConfigManager.getConfigByKey("analytics_51la_ck"),
    ]);
    const value = {
      id: idConfig?.value?.trim() || "",
      ck: ckConfig?.value?.trim() || "",
    };
    analyticsCache = { ...value, at: Date.now() };
    return value;
  } catch (error) {
    console.error("[layout] 读取 51LA 统计配置失败:", error);
    return { id: "", ck: "" };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // [v1.5.26] 静态资源自愈守卫
  //
  // 背景：部署新版本后，.next/static 下的 chunk 文件名（内容哈希）会变化，旧 chunk 被删除。
  // 若客户端此刻仍持有旧 HTML（长时间未关的标签页 / bfcache / 部署瞬间打开），
  // 就会去请求已不存在的 chunk → 404 → 样式表加载不到（页面"裸奔"）、脚本失效。
  //
  // 修复要点（相比旧版的两处改进）：
  // 1) 旧版脚本放在 <body>，而失败的 async 脚本位于 <head>，常在守卫注册前就已失败，
  //    导致监听不到。现在把守卫放在 <head> 最前面，早于所有资源脚本注册。
  // 2) 旧版只监听 SCRIPT，不监听 LINK，所以样式表 404 永远不会自愈。
  //    现在同时捕获 SCRIPT 与 LINK（样式表）的加载失败。
  //
  // 行为：任一 /_next/static/ 资源加载失败时，用带时间戳的地址自动刷新一次（仅一次）。
  const reloadScript = `(function(){
    try {
      var done = false;
      function go(){
        if (done) return;
        done = true;
        setTimeout(function(){
          location.href = location.origin + location.pathname + "?cb=" + Date.now();
        }, 800);
      }
      window.addEventListener('error', function(e){
        var t = e && e.target;
        if (!t) return;
        var isAsset = (t.tagName === 'SCRIPT') || (t.tagName === 'LINK');
        var url = t.src || t.href || '';
        if (isAsset && url.indexOf('/_next/static/') > -1) {
          console.warn('[Cache] 静态资源加载失败，自动刷新:', url);
          go();
        }
      }, true);
    } catch (e) {}
  })();`

  const analytics = await getAnalyticsConfig();

  return (
    <html lang="zh-CN">
      <head>
        {/* 必须置于 <head> 最前，早于后续 async 资源脚本，才能捕获它们的加载失败 */}
        <script dangerouslySetInnerHTML={{ __html: reloadScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* 51LA 统计：未填 id/ck 时不渲染任何脚本 */}
        <Analytics id={analytics.id} ck={analytics.ck} />
      </body>
    </html>
  );
}
