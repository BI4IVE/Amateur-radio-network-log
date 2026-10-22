// @version v2.0.2
"use client"

import Script from "next/script"

/**
 * [v2.0.0] 51LA 访问统计
 *
 * 只在后台「页面配置」填了 id + ck 时才加载；没填则完全不输出脚本。
 * 资源域名 sdk.51.la，微信内置浏览器可正常上报。
 *
 * 为什么不直接把整段 HTML 塞进去：
 * dangerouslySetInnerHTML 插入的 <script> 浏览器不会执行，
 * 必须用 next/script 并等 SDK onLoad 后再 init，否则 LA.init 会找不到对象。
 */
export default function Analytics({ id, ck }: { id: string; ck: string }) {
  if (!id || !ck) return null

  return (
    <Script
      id="la-collect"
      src="https://sdk.51.la/js-sdk-pro.min.js"
      charSet="UTF-8"
      strategy="afterInteractive"
      onLoad={() => {
        const w = window as unknown as {
          LA?: { init?: (options: { id: string; ck: string }) => void }
        }
        if (w.LA?.init) {
          w.LA.init({ id, ck })
        }
      }}
    />
  )
}
