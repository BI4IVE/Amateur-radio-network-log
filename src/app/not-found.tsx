// @version v2.0.3
"use client"

// 404 页面（未匹配到任何路由时展示，App Router 约定文件）。
//
// 设计说明：
// 1) 全站浅色 UI，零 dark: 类（见 globals.css —— 深色模式曾导致"白字白底"）。
// 2) 页脚为「随源码出厂」的固定文案（品牌 / 版权 / 反馈），刻意写死、不跟随版本号：
//    它与仓库 LICENSE（Copyright (c) 2026 BI4IVE, MIT）保持一致。
// 3) 「返回上一页」做了兜底：直接打开 404（无历史记录）时改为回首页，避免按钮点了没反应。
// 4) not-found.tsx 不支持导出 metadata，故在客户端设置标题，并在卸载时还原，
//    避免影响后续客户端导航（如跳回首页后标题仍停留在"页面不存在"）。

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    const prev = document.title
    document.title = "页面不存在 · 济南黄河业余无线电台-台网日志"
    return () => {
      document.title = prev
    }
  }, [])

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white px-4 py-16 overflow-hidden">
      {/* 顶部淡靛蓝光晕，与站内浅色页面同调 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-50 via-indigo-50/40 to-transparent" />

      <div className="relative w-full max-w-[520px] text-center">
        {/* 主视觉：天线塔 + 电波 + 呼号牌 */}
        <svg
          viewBox="0 0 240 180"
          fill="none"
          aria-hidden="true"
          className="mx-auto mb-1 h-[172px] w-[230px]"
        >
          <defs>
            <linearGradient id="nf-wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          <ellipse cx="120" cy="151" rx="48" ry="5" fill="#e5e7eb" />

          {/* 左右辐射的电波 */}
          <g stroke="url(#nf-wave)" strokeWidth="3" strokeLinecap="round">
            <path d="M104 42 Q94 30 104 18" />
            <path d="M94 50 Q78 30 94 10" />
            <path d="M84 58 Q62 30 84 2" />
            <path d="M136 42 Q146 30 136 18" />
            <path d="M146 50 Q162 30 146 10" />
            <path d="M156 58 Q178 30 156 2" />
          </g>

          {/* 天线塔塔身与地面 */}
          <g stroke="#4b5563" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M120 34 L96 150" />
            <path d="M120 34 L144 150" />
            <path d="M108 92 H132" />
            <path d="M102 121 H138" />
            <path d="M108 92 L132 121" />
            <path d="M132 92 L108 121" />
            <path d="M102 121 L144 150" />
            <path d="M138 121 L96 150" />
            <path d="M60 150 H180" />
          </g>

          {/* 塔顶红灯（呼吸闪烁） */}
          <circle cx="120" cy="32" r="4.5" fill="#ef4444" className="animate-pulse" />

          {/* 呼号牌 */}
          <rect x="85" y="156" width="70" height="19" rx="6" fill="#111827" />
          <text
            x="120"
            y="169.5"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
            letterSpacing="1.5"
            fill="#ffffff"
          >
            BR4IN
          </text>
        </svg>

        <div className="text-[92px] leading-none font-extrabold tracking-[2px] mb-3 bg-[linear-gradient(120deg,#4f46e5,#9333ea)] bg-clip-text text-transparent">
          404
        </div>

        <h1 className="text-[23px] font-bold text-black mb-3">页面不存在</h1>
        <p className="text-[15px] leading-7 text-gray-600 mb-2">
          你要访问的页面可能已被移除、改名，或链接有误。
        </p>
        <p className="text-[13px] text-gray-400 tracking-wide mb-8">
          该频点上没有检测到信号。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center px-[26px] py-3 rounded-xl text-[15px] font-semibold text-white bg-[linear-gradient(120deg,#4f46e5,#7c3aed)] shadow-lg shadow-indigo-500/30 hover:-translate-y-px transition-all"
          >
            返回首页
          </Link>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center px-[26px] py-3 rounded-xl text-[15px] font-semibold text-black bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            返回上一页
          </button>
        </div>

        {/* 随源码出厂的固定页脚（写死，不跟随版本号） */}
        <p className="mt-6 text-xs leading-[1.95] text-gray-400 tracking-wide">
          BY 济南黄河业余无线电中继台 · 台网日志系统 · BR4IN
          <br />
          © 2026 BI4IVE · MIT License ·{" "}
          <a
            href="https://github.com/BI4IVE/Amateur-radio-network-log"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            源码仓库
          </a>
          <br />
          问题反馈:{" "}
          <a
            href="https://forum.hamcq.cn/d/9199"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            https://forum.hamcq.cn/d/9199
          </a>
        </p>
      </div>
    </div>
  )
}
