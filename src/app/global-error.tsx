"use client"

// @version v1.5.13
// 全局错误边界：当客户端因「旧构建资源(chunk)被删除」导致渲染崩溃时，
// 自动刷新到最新页面，避免用户卡在 bfcache 恢复的旧页面报错页。
// 根因：Next.js 哈希文件名 chunk，部署后旧 chunk 被清；浏览器前进/后退 bfcache
// 恢复旧页引用已删除的 chunk → 404 → 崩溃。no-store 无法阻止 bfcache，故用此兜底。

import { useEffect, useState } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [refreshed, setRefreshed] = useState(false)

  useEffect(() => {
    // 记录错误
    console.error("[GlobalError]", error?.message || "未知错误", error)
  }, [error])

  const handleReload = () => {
    // 强制从服务器拉取最新页面，并携带时间戳避开 bfcache 恢复
    window.location.href = window.location.origin + window.location.pathname + "?cb=" + Date.now()
  }

  // 自动刷新兜底：首次进入错误边界时自动重载一次（避开 bfcache 旧页），
  // 若重载后仍报错（真业务错误）则交给用户点按钮。
  useEffect(() => {
    if (refreshed) return
    setRefreshed(true)
    const t = setTimeout(handleReload, 1200)
    return () => clearTimeout(t)
  }, [refreshed])

  return (
    <html lang="zh-CN">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "#e2e8f0",
            fontFamily: "system-ui, sans-serif",
            padding: "24px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>···</div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
              页面资源已更新，正在自动刷新…
            </h1>
            <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 20px" }}>
              检测到加载了旧版本页面，正在跳转最新版本。
            </p>
            <button
              onClick={handleReload}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "10px 24px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              立即刷新
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
