// @version v1.5.20
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

interface TrendPoint {
  sessionId: string
  date: string
  label: string
  recordCount: number
  controllerName: string
}

interface CallsignRank {
  callsign: string
  count: number
}

interface ControllerRank {
  controllerName: string
  sessionCount: number
  recordCount: number
}

interface WeekdayStat {
  weekday: number
  label: string
  sessionCount: number
  recordCount: number
}

interface AnalyticsData {
  summary: {
    totalSessions: number
    totalRecords: number
    uniqueCallsigns: number
    avgPerSession: number
  }
  trend: TrendPoint[]
  topCallsigns: CallsignRank[]
  controllerRanking: ControllerRank[]
  weekday: WeekdayStat[]
}

// 参与人数趋势：纯 SVG 折线 + 面积图（不引入任何图表库，避免 React 19 依赖冲突）
function TrendChart({
  data,
  onPick,
}: {
  data: TrendPoint[]
  onPick: (sessionId: string) => void
}) {
  const W = 760
  const H = 240
  const PL = 40
  const PR = 16
  const PT = 16
  const PB = 30
  const innerW = W - PL - PR
  const innerH = H - PT - PB
  const max = Math.max(1, ...data.map((d) => d.recordCount))

  const x = (i: number) =>
    data.length === 1 ? PL + innerW / 2 : PL + (i / (data.length - 1)) * innerW
  const y = (v: number) => PT + innerH - (v / max) * innerH

  const coords = data.map((d, i) => [x(i), y(d.recordCount)] as const)
  const linePts = coords.map(([cx, cy]) => `${cx},${cy}`).join(" ")
  const areaPts = `M ${PL},${PT + innerH} L ${coords
    .map(([cx, cy]) => `${cx},${cy}`)
    .join(" L ")} L ${x(data.length - 1)},${PT + innerH} Z`

  // x 轴标签抽稀，最多约 8 个，避免密集堆叠
  const step = Math.max(1, Math.ceil(data.length / 8))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const gy = PT + innerH - f * innerH
        return (
          <g key={f}>
            <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PL - 8} y={gy + 4} textAnchor="end" fontSize={11} fill="#9ca3af">
              {Math.round(max * f)}
            </text>
          </g>
        )
      })}

      <path d={areaPts} fill="url(#trendFill)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => (
        <circle
          key={d.sessionId}
          cx={x(i)}
          cy={y(d.recordCount)}
          r={4}
          fill="#ffffff"
          stroke="#6366f1"
          strokeWidth={2}
          className="cursor-pointer"
          onClick={() => onPick(d.sessionId)}
        >
          <title>{`${d.date} · ${d.recordCount} 人次 · 主控 ${d.controllerName}`}</title>
        </circle>
      ))}

      {data.map((d, i) =>
        i % step === 0 || i === data.length - 1 ? (
          <text
            key={`lbl-${d.sessionId}`}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#9ca3af"
          >
            {d.label}
          </text>
        ) : null
      )}
    </svg>
  )
}

// 排行榜横向条形（CSS 实现，响应式，无需 SVG 计算）
function RankBars({
  rows,
  onRowClick,
}: {
  rows: { key: string; label: string; value: number; hint?: string; clickable?: boolean }[]
  onRowClick?: (key: string) => void
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div
          key={r.key}
          onClick={() => r.clickable && onRowClick?.(r.key)}
          className={`flex items-center gap-3 ${r.clickable ? "cursor-pointer group" : ""}`}
        >
          <div
            className="w-28 shrink-0 text-sm font-medium text-gray-800 truncate text-right"
            title={r.label}
          >
            {r.label}
          </div>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full rounded bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all group-hover:from-indigo-600 group-hover:to-indigo-500"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <div className="w-24 shrink-0 text-xs text-right">
            <span className="font-semibold text-gray-800">{r.value}</span>
            {r.hint ? <span className="ml-1 text-gray-500">{r.hint}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

// 周几分布纵向柱状
function WeekdayBars({ data }: { data: WeekdayStat[] }) {
  const max = Math.max(1, ...data.map((d) => d.recordCount))
  return (
    <div className="flex items-end justify-between gap-2 h-52">
      {data.map((d) => (
        <div key={d.weekday} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-xs font-semibold text-gray-700">{d.recordCount}</div>
          <div className="w-full flex-1 flex items-end bg-gray-50 rounded">
            <div
              className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-emerald-300"
              style={{
                height: `${(d.recordCount / max) * 100}%`,
                minHeight: d.recordCount > 0 ? 4 : 0,
              }}
              title={`${d.label}：${d.recordCount} 人次 / ${d.sessionCount} 场`}
            />
          </div>
          <div className="text-xs text-gray-600">{d.label}</div>
          <div className="text-[10px] text-gray-400">{d.sessionCount} 场</div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string | number
  unit?: string
  tone: string
}) {
  return (
    <div className={`rounded-lg shadow p-5 text-white bg-gradient-to-br ${tone}`}>
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="text-3xl font-bold mt-1">
        {value}
        {unit ? <span className="text-base font-medium ml-1">{unit}</span> : null}
      </p>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const url = `/api/admin/analytics${params.toString() ? `?${params.toString()}` : ""}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "加载看板数据失败")
        setData(null)
      } else {
        setData(json as AnalyticsData)
      }
    } catch (e) {
      console.error("加载看板数据失败:", e)
      setError("加载看板数据失败")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const hasTrend = !!data && data.trend.length > 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">数据看板</h2>
            <p className="text-sm text-gray-500 mt-1">
              {startDate && endDate
                ? `${startDate} 至 ${endDate} 的数据`
                : startDate
                  ? `${startDate} 起的数据`
                  : endDate
                    ? `截至 ${endDate} 的数据`
                    : "全部历史数据"}
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/stats")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            返回台网统计
          </button>
        </div>

        {/* 日期筛选 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setStartDate("")
                setEndDate("")
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              清除筛选
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-72 bg-white rounded-lg shadow">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              重试
            </button>
          </div>
        ) : !data || data.summary.totalSessions === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-gray-500">当前筛选范围内没有台网数据</p>
            <p className="text-sm text-gray-400 mt-2">
              提示：台网预告（未开台网）不计入统计
            </p>
          </div>
        ) : (
          <>
            {/* KPI 卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard
                label="台网场次"
                value={data.summary.totalSessions}
                unit="场"
                tone="from-blue-500 to-blue-600"
              />
              <KpiCard
                label="参与记录"
                value={data.summary.totalRecords}
                unit="条"
                tone="from-purple-500 to-purple-600"
              />
              <KpiCard
                label="参与呼号"
                value={data.summary.uniqueCallsigns}
                unit="个"
                tone="from-pink-500 to-pink-600"
              />
              <KpiCard
                label="场均参与"
                value={data.summary.avgPerSession}
                unit="人/场"
                tone="from-emerald-500 to-emerald-600"
              />
            </div>

            {/* 趋势 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">每场台网参与人数趋势</h3>
                <span className="text-xs text-gray-400">点击圆点可查看该场详情</span>
              </div>
              {hasTrend ? (
                <TrendChart
                  data={data.trend}
                  onPick={(sessionId) => router.push(`/admin/stats/session/${sessionId}`)}
                />
              ) : (
                <p className="text-gray-500 text-sm">暂无趋势数据</p>
              )}
            </div>

            {/* 排行 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">呼号活跃排行 Top 10</h3>
                  <span className="text-xs text-gray-400">点击查看该呼号</span>
                </div>
                {data.topCallsigns.length > 0 ? (
                  <RankBars
                    rows={data.topCallsigns.map((c) => ({
                      key: c.callsign,
                      label: c.callsign,
                      value: c.count,
                      hint: "次",
                      clickable: true,
                    }))}
                    onRowClick={(callsign) =>
                      router.push(`/query?callsign=${encodeURIComponent(callsign)}`)
                    }
                  />
                ) : (
                  <p className="text-gray-500 text-sm">暂无数据</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">主控场次排行 Top 10</h3>
                {data.controllerRanking.length > 0 ? (
                  <RankBars
                    rows={data.controllerRanking.map((c) => ({
                      key: c.controllerName,
                      label: c.controllerName,
                      value: c.sessionCount,
                      hint: `场 / ${c.recordCount} 条`,
                    }))}
                  />
                ) : (
                  <p className="text-gray-500 text-sm">暂无数据</p>
                )}
              </div>
            </div>

            {/* 周几分布 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">按周几活跃分布</h3>
              <WeekdayBars data={data.weekday} />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
