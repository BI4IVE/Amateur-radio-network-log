// @version v2.0.4
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * [个人中心] /me
 *
 * 身份来自微信静默授权（服务端 90 天签名 Cookie），页面本身不接收任何身份参数。
 * [v2.0.6] 三个页签：首页（概览）/ 记录 / 我的（档案·执照·绑定·推送·证书·查询）。
 */

type Overview = {
  siteName: string
  bound: boolean
  binding: {
    status: "active" | "pending" | "rejected" | "inactive" | "none"
    callsign: string | null
    boundAt: string | null
  }
  profile?: Profile
  license?: License
  stats?: Stats
  /** 主控卡：没有任何主控记录时为 null */
  controller?: {
    sessions: number
    records: number
    lastTime: string | null
  } | null
  /** 台网规则（后台配置项 member_rules，换行分隔） */
  rules?: string
  /** 档案默认值（发证机关等，后台可配） */
  defaults?: { licenseIssuer: string }
}

type Profile = {
  callsign: string
  memberNo: string | null
  name: string | null
  qth: string | null
  equipment: string | null
  antenna: string | null
  power: string | null
  licenseNo: string | null
  licenseType: string | null
  operatorClass: string | null
  licenseIssuer: string | null
  licenseIssueDate: string | null
  licenseExpireDate: string | null
  updatedAt: string | null
}

type License = {
  state: "none" | "ok" | "soon" | "urgent" | "expired"
  label: string
  daysLeft: number | null
  progress: number | null
  issueDate: string | null
  expireDate: string | null
}

type Stats = {
  sessions: number
  yearSessions: number
  firstTime: string | null
  lastTime: string | null
  /** [v2.0.3] 连续参与天数（按开台场次计算） */
  streakDays: number
  /** 本月出席次数 */
  thisMonth: number
  /** [v2.0.3] 月度口径：本月/上月出席，本月/上月开台总场次 */
  monthSessions: number
  prevMonthSessions: number
  monthTotal: number
  prevMonthTotal: number
  rank: number
  /** 本月名次（用于名次变化），无数据为 null */
  rankCurrent: number | null
  /** 正数 = 较上月上升几位 */
  rankTrend: number | null
}

type RecordItem = {
  id: string
  qth: string | null
  equipment: string | null
  antenna: string | null
  power: string | null
  signal: string | null
  report: string | null
  remarks: string | null
  sessionId: string
  sessionTime: string
  sessionTitle: string | null
}

type PushLog = {
  id: string
  status: string
  errcode: number | null
  errmsg: string | null
  createdAt: string
}

type TabKey = "home" | "records" | "my"

/** [v2.0.6] 「我的」页内的子视图：功能列表 / 档案 / 执照 / 绑定 / 推送 */
type MyView = "menu" | "profile" | "license" | "bind" | "push"

const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** 只显示月-日，如 10-18（北京时间） */
function fmtMonthDay(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** 「4 天前」这类相对时间，超过 60 天直接显示日期 */
function daysAgoText(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const now = Date.now()
  const diffDays = Math.floor((now - d.getTime()) / 86400000)
  if (diffDays <= 0) return "今天"
  if (diffDays === 1) return "昨天"
  if (diffDays <= 60) return `${diffDays} 天前`
  return fmtMonthDay(value)
}

/** 预告时间显示为「10-23 20:30」（北京时间） */
function fmtScheduleTime(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(", ", " ")
}

function fmtWeekday(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  // 取北京时间的星期几
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(d)
  const map: Record<string, string> = {
    Sun: "周日",
    Mon: "周一",
    Tue: "周二",
    Wed: "周三",
    Thu: "周四",
    Fri: "周五",
    Sat: "周六",
  }
  return map[label] ?? WEEKDAY[d.getDay()] ?? ""
}

function licenseTone(state: License["state"]) {
  if (state === "expired") {
    return {
      bar: "bg-red-500",
      badge: "bg-red-50 text-red-600",
      edge: "bg-red-500",
      dot: "bg-red-500",
    }
  }
  if (state === "soon" || state === "urgent") {
    return {
      bar: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700",
      edge: "bg-amber-500",
      dot: "bg-amber-500",
    }
  }
  return {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    edge: "bg-emerald-500",
    dot: "bg-emerald-500",
  }
}

/**
 * [v2.0.2] 台网排名勋章：按名次给颜色，50 名以后不显示
 *
 * 不给人人发勋章，否则失去意义；分档做目标感。
 */
function rankMedalColor(rank: number): string | null {
  if (!rank || rank <= 0) return null
  if (rank === 1) return "#fbbf24" // 金
  if (rank <= 3) return "#e2e8f0" // 银
  if (rank <= 10) return "#fb923c" // 铜
  if (rank <= 50) return "rgba(255,255,255,0.72)" // 淡白
  return null
}

/** 执照编号脱敏：保留前 3 位与后 3 位，中间用圆点代替 */
function maskLicenseNo(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 6) return trimmed
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-3)}`
}

/** [v2.0.6] 发证日期 + N 年（YYYY-MM-DD） */
function plusYears(value: string, years: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const d = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ""
  d.setUTCFullYear(d.getUTCFullYear() + years)
  return d.toISOString().slice(0, 10)
}

export default function MePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Overview | null>(null)
  const [tab, setTab] = useState<TabKey>("home")
  const [myView, setMyView] = useState<MyView>("menu")

  // [v2.0.6] 三个页面各自独立，切页回到顶部（首页概览较长，避免停留在页面中部）
  const contentRef = useRef<HTMLDivElement>(null)
  const contentFirstRender = useRef(true)

  // [v2.0.6] 「我的」子页压一条浏览历史，手机返回键即可回到功能列表（而不是直接退出页面）
  const openMyView = useCallback((view: MyView) => {
    window.history.pushState({ meSubView: view }, "")
    setMyView(view)
  }, [])
  const backToMenu = useCallback(() => {
    if (window.history.state?.meSubView) {
      window.history.back()
    } else {
      setMyView("menu")
    }
  }, [])
  useEffect(() => {
    const onPop = () => setMyView("menu")
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])
  useEffect(() => {
    if (contentFirstRender.current) {
      contentFirstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [tab, myView])

  const [records, setRecords] = useState<RecordItem[]>([])
  const [recordTotal, setRecordTotal] = useState(0)
  const [recordsLoading, setRecordsLoading] = useState(false)

  const [pushLogs, setPushLogs] = useState<PushLog[]>([])
  const [pushLoading, setPushLoading] = useState(false)

  const [form, setForm] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // [v2.0.6] 执照有效期年数：默认 5 年，可选 3 年
  const [licenseYears, setLicenseYears] = useState(5)
  const [unbinding, setUnbinding] = useState(false)
  // 执照编号默认脱敏，点小眼睛才显示完整
  const [showLicenseNo, setShowLicenseNo] = useState(false)
  // [v2.0.2] 台网规则：首次自动弹（localStorage 记住），之后靠「更多服务」下方入口
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rulesFull, setRulesFull] = useState(false)
  // [v2.0.2] 下一场台网预告
  const [nextSchedule, setNextSchedule] = useState<string | null>(null)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/me/overview", { cache: "no-store" })
      if (res.status === 401) {
        window.location.href = "/api/me/authorize"
        return
      }
      const json = (await res.json()) as Overview & { error?: string }
      if (!res.ok) throw new Error(json.error || "加载失败")
      setData(json)
      if (json.profile) {
        const next = { ...json.profile }
        // [v2.0.0] 发证机关为空时用后台配置的默认值预填，用户仍可改
        if (!next.licenseIssuer && json.defaults?.licenseIssuer) {
          next.licenseIssuer = json.defaults.licenseIssuer
        }
        setForm(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // [v2.0.2] 下一场台网预告（公开接口，失败静默）
  useEffect(() => {
    let cancelled = false
    fetch("/api/schedules", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        const schedule = json?.schedule
        if (schedule?.scheduledTime) setNextSchedule(schedule.scheduledTime)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // 台网规则：本机第一次进入时自动弹一次（换设备会再弹）
  useEffect(() => {
    if (!data?.bound || typeof window === "undefined") return
    if (localStorage.getItem("me_rules_seen_v1")) return
    setRulesFull(false)
    setRulesOpen(true)
  }, [data?.bound])

  const ruleLines = useMemo(
    () =>
      (data?.rules || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [data?.rules]
  )

  // [v2.0.0] 我的记录每页 5 条，其余翻页查看
  const RECORD_PAGE_SIZE = 5
  const [recordPage, setRecordPage] = useState(0)

  const loadRecords = useCallback(async (pageIndex = 0) => {
    setRecordsLoading(true)
    try {
      const res = await fetch(
        `/api/me/records?limit=${RECORD_PAGE_SIZE}&offset=${pageIndex * RECORD_PAGE_SIZE}`,
        { cache: "no-store" }
      )
      if (!res.ok) return
      const json = await res.json()
      setRecords(json.items || [])
      setRecordTotal(json.total || 0)
      setRecordPage(pageIndex)
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  const loadPushLogs = useCallback(async () => {
    setPushLoading(true)
    try {
      const res = await fetch("/api/me/push-logs?limit=20", { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      setPushLogs(json.logs || [])
    } finally {
      setPushLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!data?.bound) return
    if (tab === "records" && records.length === 0) loadRecords(0)
    if (tab === "my" && myView === "push" && pushLogs.length === 0) loadPushLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.bound, tab, myView])

  const license = data?.license
  const tone = useMemo(() => licenseTone(license?.state ?? "none"), [license?.state])

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setSaveError(null)
    setSaveMsg(null)
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNo: form.memberNo,
          name: form.name,
          qth: form.qth,
          equipment: form.equipment,
          antenna: form.antenna,
          power: form.power,
          licenseNo: form.licenseNo,
          licenseType: form.licenseType,
          operatorClass: form.operatorClass,
          licenseIssuer: form.licenseIssuer,
          licenseIssueDate: form.licenseIssueDate,
          licenseExpireDate: form.licenseExpireDate,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "保存失败")
      setSaveMsg(json.changed > 0 ? "已保存" : "没有需要保存的改动")
      await loadOverview()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  // 关闭规则抽屉并记住已读（换设备会再弹一次）
  const closeRules = () => {
    setRulesOpen(false)
    if (typeof window !== "undefined") {
      localStorage.setItem("me_rules_seen_v1", "1")
    }
  }

  // [v2.0.0] 个人中心内自助解绑（身份取自会话，不再依赖前端传 openid）
  const handleUnbind = async () => {
    if (!confirm("确认解除微信绑定？解绑后将不再收到台网回执。")) return
    setUnbinding(true)
    try {
      const res = await fetch("/api/wechat/unbind", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "解绑失败")
      alert("已解除绑定")
      await loadOverview()
    } catch (e) {
      alert(e instanceof Error ? e.message : "解绑失败")
    } finally {
      setUnbinding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-black">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-black">{error}</p>
        <button
          onClick={loadOverview}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
        >
          重新加载
        </button>
      </div>
    )
  }

  if (!data) return null

  // 未绑定 / 待审核 / 已失效
  if (!data.bound) {
    const status = data.binding.status
    const text =
      status === "pending"
        ? "绑定申请正在审核，通过后即可查看你的通联记录。"
        : status === "rejected"
          ? "绑定申请未通过，请重新提交或联系管理员。"
          : status === "inactive"
            ? "绑定已失效（可能取消了关注公众号），请重新绑定。"
            : "还没有绑定呼号，绑定后即可查看自己的通联记录与执照信息。"
    return (
      <div className="min-h-screen bg-gray-50 px-5 py-10">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-black">{data.siteName || "个人中心"}</h1>
          <p className="text-sm text-black mt-3 leading-7">{text}</p>
          <a
            href="/wechat/bind"
            className="mt-6 block text-center h-12 leading-[48px] rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            去绑定呼号
          </a>
        </div>
      </div>
    )
  }

  // 排名勋章颜色（50 名以后为 null，不显示）；[v2.0.3] 徽章显示本月排名，勋章分级随之改用月度名次
  const medalColor = rankMedalColor(data.stats?.rankCurrent ?? 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-md mx-auto bg-[#f7f8fb] min-h-screen pb-24">
        {/* [v2.0.6] 首页：概览（Hero / 四格 / 下一场 / 执照 / 主控） */}
        {tab === "home" ? (
          <>
        {/* 顶部 */}
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-800 px-5 pt-7 pb-16 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-10 w-48 h-48 rounded-full bg-white/5" />

          {/* [v2.0.3] 全部改月度口径：徽章显示本月排名，累计排名留到年度报告 */}
          {/* 本月排名徽章：标签左对齐、数字右对齐，避免右对齐时「上短下长」的台阶感 */}
          {data.stats?.rankCurrent ? (
            <div className="absolute right-4 top-3.5 bg-white/15 border border-white/25 rounded-2xl px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[12px] tracking-[0.5px] text-white/80">
                本月排名
                {medalColor ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[22px] h-[22px] fill-none"
                    stroke={medalColor}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="9" r="5" />
                    <path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5" />
                  </svg>
                ) : null}
              </span>
              <span className="flex items-baseline justify-end gap-1 mt-0.5">
                <b className="text-[32px] font-extrabold leading-none tabular-nums">
                  {data.stats.rankCurrent}
                </b>
                <i className="not-italic text-sm font-semibold text-white/75">位</i>
                {data.stats.rankTrend !== null && data.stats.rankTrend !== 0 ? (
                  <em
                    className={`not-italic text-xs font-extrabold ml-1 ${
                      data.stats.rankTrend > 0 ? "text-emerald-200" : "text-rose-200"
                    }`}
                  >
                    {data.stats.rankTrend > 0 ? "↑" : "↓"}
                    {Math.abs(data.stats.rankTrend)}
                  </em>
                ) : data.stats.rankTrend === 0 ? (
                  <em className="not-italic text-xs font-extrabold ml-1 text-white/50">—</em>
                ) : null}
              </span>
            </div>
          ) : null}

          <p className="text-[10.5px] tracking-[2px] text-white/70">
            BR4IN · {data.siteName}
          </p>
          <h1 className="text-[34px] font-extrabold tracking-wider mt-2 leading-none">
            {data.binding.callsign}
          </h1>
          <div className="flex items-center gap-2 mt-3 text-xs text-white/90">
            {data.profile?.memberNo ? (
              <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
                编号 {data.profile.memberNo}
              </span>
            ) : null}
            <span>
              已生效{data.binding.boundAt ? ` · ${fmtDate(data.binding.boundAt)} 绑定` : ""}
            </span>
          </div>
        </div>

        {/* 四格 */}
        <div className="mx-4 -mt-10 bg-white rounded-2xl shadow-[0_12px_30px_rgba(24,24,60,0.12)] grid grid-cols-2 overflow-hidden relative z-10">
          {/* [v2.0.3] 累计次数不再上首页，改成本月排名；累计数据只在年度报告里出现 */}
          <StatCell
            value={data.stats?.rankCurrent ?? "-"}
            unit={data.stats?.rankCurrent ? "位" : undefined}
            label="本月排名"
            note={
              data.stats?.rankTrend != null
                ? `较上月 ${data.stats.rankTrend > 0 ? "↑" : "↓"}${Math.abs(data.stats.rankTrend)} 位`
                : "本月暂无排名"
            }
            border
          />
          {/* [v2.0.3] 台网每日开台、数据自 7 月下旬起才完整，年度对比无意义，改月度口径 */}
          <StatCell
            value={data.stats?.monthSessions ?? 0}
            unit={`/ ${data.stats?.monthTotal ?? 0} 场`}
            label="本月台网"
            note={
              data.stats?.monthTotal
                ? `台网率 ${Math.round(
                    ((data.stats.monthSessions ?? 0) / data.stats.monthTotal) * 100
                  )}%`
                : "本月还没开台"
            }
            border
          />
          {/* [v2.0.2] 最近一次与连续参与拆开；台网排名已移到顶部呼号右侧 */}
          <StatCell
            value={data.stats?.lastTime ? fmtMonthDay(data.stats.lastTime) : "-"}
            label="最近一次"
            note={data.stats?.lastTime ? daysAgoText(data.stats.lastTime) : "暂无记录"}
          />
          <StatCell
            value={data.stats?.streakDays ?? 0}
            unit="天"
            label="连续参与"
            note={
              data.stats
                ? `较上月 ${(data.stats.monthSessions ?? 0) - (data.stats.prevMonthSessions ?? 0) >= 0 ? "+" : ""}${
                    (data.stats.monthSessions ?? 0) - (data.stats.prevMonthSessions ?? 0)
                  } 场`
                : "暂无对比"
            }
          />
        </div>

        {/* [v2.0.6] 下一场台网提示条：合并原「更多服务」里的台网预告与规则入口 */}
        <div className="mx-4 mt-3.5">
          <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 border border-indigo-100 px-3.5 py-3">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 stroke-indigo-600 fill-none shrink-0"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 11h18" />
            </svg>
            <span className="text-[12px] text-indigo-900">
              下一场台网：<b>{nextSchedule ? fmtScheduleTime(nextSchedule) : "暂无预告"}</b>
            </span>
            <button
              type="button"
              onClick={() => {
                setRulesFull(true)
                setRulesOpen(true)
              }}
              className="ml-auto text-[11px] font-extrabold text-indigo-600 shrink-0"
            >
              规则 ›
            </button>
          </div>
        </div>

        {/* 执照 */}
        <div className="mx-4 mt-3.5 bg-white rounded-2xl p-4 relative overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)]">
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.edge}`} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-black">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-black/40 fill-none" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 9h10M7 13h6" />
              </svg>
              电台执照
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${tone.badge}`}>
              <i className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              {license?.state === "none" ? "未填写" : license?.label}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <p className="text-lg font-extrabold tracking-wide text-black">
              {data.profile?.licenseNo
                ? showLicenseNo
                  ? data.profile.licenseNo
                  : maskLicenseNo(data.profile.licenseNo)
                : "未填写执照编号"}
            </p>
            {data.profile?.licenseNo ? (
              <button
                type="button"
                onClick={() => setShowLicenseNo((v) => !v)}
                aria-label={showLicenseNo ? "隐藏执照编号" : "显示完整执照编号"}
                className="p-1 text-black/35 hover:text-black/60"
              >
                {showLicenseNo ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[18px] h-[18px] stroke-current fill-none"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <path d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[18px] h-[18px] stroke-current fill-none"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>
          <p className="text-[10px] font-semibold text-black/45 mt-1">
            {data.profile?.licenseType || "未填写类别"}
            {data.profile?.operatorClass ? ` · ${data.profile.operatorClass}` : ""}
          </p>

          <div className="flex gap-2.5 mt-3">
            <div className="flex-1 bg-[#f7f8fb] rounded-xl px-3 py-2">
              <p className="text-[10px] text-black/45">发证机关</p>
              <p className="text-xs font-bold text-black mt-1 truncate">
                {data.profile?.licenseIssuer || "-"}
              </p>
            </div>
            <div className="flex-1 bg-[#f7f8fb] rounded-xl px-3 py-2">
              <p className="text-[10px] text-black/45">有效期至</p>
              <p className="text-xs font-bold text-black mt-1">
                {license?.expireDate || "-"}
              </p>
            </div>
          </div>

          {license?.state !== "none" ? (
            <>
              <div className="h-1.5 rounded-full bg-[#eceef4] mt-3.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${tone.bar}`}
                  style={{ width: `${license?.progress ?? 0}%` }}
                />
              </div>
              <p className="text-[10.5px] text-black/45 mt-2">
                {license?.daysLeft != null && license.daysLeft >= 0
                  ? `剩余 ${license.daysLeft} 天`
                  : "已过期"}
                {license?.issueDate ? ` · 发证 ${license.issueDate}` : ""}
              </p>
            </>
          ) : (
            <p className="text-[10.5px] text-black/45 mt-3">
              在「我的 · 执照信息」里填写后，这里会显示到期倒计时。
            </p>
          )}
        </div>

        {/* [v2.0.2] 主控卡：只对主控过场次的账号显示 */}
        {data.controller ? (
          <div className="mx-4 mt-3 rounded-2xl px-3.5 py-3.5 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(124,58,237,0.12)]">
              <svg
                viewBox="0 0 24 24"
                className="w-[17px] h-[17px] stroke-violet-600 fill-none"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="M12 12a2 2 0 1 0 0 .01" />
                <path d="M16.5 7.5a6.36 6.36 0 0 1 0 9" />
                <path d="M7.5 7.5a6.36 6.36 0 0 0 0 9" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-violet-900">
                我主控过 {data.controller.sessions} 场台网
              </p>
              <p className="text-[11px] text-violet-700/80 mt-0.5 truncate">
                最近一场 {fmtMonthDay(data.controller.lastTime)} · 累计录入{" "}
                {data.controller.records} 条记录
              </p>
            </div>
            <a
              href="/admin/stats"
              className="text-[11px] font-extrabold text-violet-700 shrink-0"
            >
              运营中心 ›
            </a>
          </div>
        ) : null}

          </>
        ) : null}

        {/* [v2.0.6] 页签在底部悬浮导航（首页 / 记录 / 我的） */}

        <div ref={contentRef}>
        {/* 记录：页头 */}
        {tab === "records" ? (
          <div className="px-5 pt-8 pb-1">
            <p className="text-[10.5px] tracking-[2px] text-black/40">BR4IN · {data.siteName}</p>
            <h1 className="text-2xl font-extrabold text-black mt-2 leading-none">我的记录</h1>
          </div>
        ) : null}

        {/* 我的：页头 + 功能列表（子页显示返回） */}
        {tab === "my" ? (
          <>
            <div className="bg-gradient-to-b from-indigo-600 to-indigo-800 px-5 pt-7 pb-6 text-white">
              <p className="text-[10.5px] tracking-[2px] text-white/70">BR4IN · {data.siteName}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-lg font-extrabold">
                  {(data.binding.callsign || "?").slice(0, 2)}
                </span>
                <div>
                  <p className="text-xl font-extrabold leading-none">{data.binding.callsign}</p>
                  <p className="text-[11px] text-white/80 mt-1.5">
                    {data.profile?.memberNo ? `编号 ${data.profile.memberNo} · ` : ""}
                    {data.stats?.rankCurrent ? `本月第 ${data.stats.rankCurrent} 位` : "本月暂无排名"}
                  </p>
                </div>
              </div>
            </div>

            {myView === "menu" ? (
              <div className="px-4 pt-3.5 pb-6">
                <div className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)]">
                  <button
                    type="button"
                    onClick={() => openMyView("profile")}
                    className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 text-left"
                  >
                    <span className="flex-1 text-[13.5px] font-bold text-black">我的档案</span>
                    <span className="text-[11px] text-black/35">›</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMyView("license")}
                    className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 text-left"
                  >
                    <span className="flex-1 text-[13.5px] font-bold text-black">执照信息</span>
                    <span className="text-[11px] text-black/40 mr-1.5">
                      {data.profile?.licenseNo ? maskLicenseNo(data.profile.licenseNo) : "未填写"}
                    </span>
                    <span className="text-[11px] text-black/35">›</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMyView("bind")}
                    className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 text-left"
                  >
                    <span className="flex-1 text-[13.5px] font-bold text-black">微信绑定</span>
                    <span className="text-[11px] text-emerald-600 font-bold mr-1.5">
                      {data.binding.status === "active" ? "已绑定" : "未绑定"}
                    </span>
                    <span className="text-[11px] text-black/35">›</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMyView("push")}
                    className="w-full flex items-center px-4 py-3.5 text-left"
                  >
                    <span className="flex-1 text-[13.5px] font-bold text-black">推送记录</span>
                    <span className="text-[11px] text-black/35">›</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)] mt-3">
                  <a
                    href={`/query?callsign=${encodeURIComponent(data.binding.callsign || "")}`}
                    className="flex items-center px-4 py-3.5 border-b border-gray-100"
                  >
                    <span className="flex-1 text-[13.5px] font-bold text-black">我的证书</span>
                    <span className="text-[11px] text-black/35">›</span>
                  </a>
                  <a href="/query" className="flex items-center px-4 py-3.5">
                    <span className="flex-1 text-[13.5px] font-bold text-black">台网查询</span>
                    <span className="text-[11px] text-black/35">›</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="px-4 pt-3">
                <button
                  type="button"
                  onClick={() => setMyView("menu")}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-black/55"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 stroke-current fill-none"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  返回我的
                </button>
              </div>
            )}
          </>
        ) : null}

        {/* 记录 */}
        {tab === "records" ? (
          <div className="px-4 pb-6">
            {records.length === 0 ? (
              <p className="text-xs text-black/45 py-10 text-center">
                {recordsLoading ? "加载中..." : "还没有通联记录"}
              </p>
            ) : (
              <div className="relative pl-5">
                <span className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-[#e3e4ec]" />
                {records.map((r) => (
                  <div key={r.id} className="relative py-3">
                    <span className="absolute -left-5 top-5 w-2.5 h-2.5 rounded-full bg-white border-[2.5px] border-indigo-600" />
                    <p className="text-[11px] text-black/50">
                      {fmtDate(r.sessionTime)} {fmtWeekday(r.sessionTime)}
                      {r.sessionTitle ? ` · ${r.sessionTitle}` : ""}
                    </p>
                    <p className="text-sm font-bold text-black mt-1">
                      收 {r.signal || "-"} ／ 报 {r.report || "-"}
                      <span className="ml-1.5 font-extrabold text-indigo-600">
                        {r.signal || ""}
                      </span>
                    </p>
                    <p className="text-[11px] text-black/50 mt-1.5 leading-5">
                      {[r.qth, r.equipment, r.antenna].filter(Boolean).join(" · ") || "-"}
                    </p>
                    {r.remarks ? (
                      <p className="text-[11px] text-black/40 mt-1">{r.remarks}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {recordTotal > RECORD_PAGE_SIZE ? (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-black/45">
                  共 {recordTotal} 条 · 每页 {RECORD_PAGE_SIZE} 条
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadRecords(recordPage - 1)}
                    disabled={recordPage <= 0 || recordsLoading}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-black disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-black/60 tabular-nums">
                    {recordPage + 1} / {Math.max(1, Math.ceil(recordTotal / RECORD_PAGE_SIZE))}
                  </span>
                  <button
                    onClick={() => loadRecords(recordPage + 1)}
                    disabled={
                      recordsLoading ||
                      recordPage + 1 >= Math.ceil(recordTotal / RECORD_PAGE_SIZE)
                    }
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-black disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 档案 */}
        {tab === "my" && (myView === "profile" || myView === "license") && form ? (
          <div className="px-4 pb-6">
            <div className="bg-indigo-50 rounded-xl px-3.5 py-3 text-[11.5px] leading-6 text-indigo-900">
              {myView === "license"
                ? "执照信息可随时更新，保存后立即生效；到期倒计时按到期日期计算。"
                : "档案由你自行维护，保存后立即生效；每次修改都会留痕，管理员可查看修改记录。"}
            </div>

            {myView === "profile" ? (
            <>
            <p className="text-xs font-extrabold text-black/55 mt-4 mb-2 pl-1">基本信息</p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)]">
              <ReadonlyRow label="呼号" value={form.callsign} note="不可改" />
              <FieldRow
                label="编号"
                value={form.memberNo ?? ""}
                placeholder="1–5 位数字"
                inputMode="numeric"
                maxLength={5}
                note={`${(form.memberNo ?? "").length}/5`}
                onChange={(v) => setForm({ ...form, memberNo: v.replace(/\D/g, "") })}
              />
              <FieldRow
                label="姓名"
                value={form.name ?? ""}
                placeholder="真实姓名"
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <FieldRow
                label="所在地"
                value={form.qth ?? ""}
                placeholder="QTH"
                onChange={(v) => setForm({ ...form, qth: v })}
              />
              <FieldRow
                label="常用设备"
                value={form.equipment ?? ""}
                placeholder="电台型号"
                onChange={(v) => setForm({ ...form, equipment: v })}
              />
              <FieldRow
                label="常用天线"
                value={form.antenna ?? ""}
                placeholder="天线形式"
                onChange={(v) => setForm({ ...form, antenna: v })}
              />
              <FieldRow
                label="发射功率"
                value={form.power ?? ""}
                placeholder="如 100W"
                onChange={(v) => setForm({ ...form, power: v })}
              />
            </div>
            </>
            ) : null}

            {myView === "license" ? (
            <>
            <p className="text-xs font-extrabold text-black/55 mt-4 mb-2 pl-1">执照信息</p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)]">
              <FieldRow
                label="执照编号"
                value={form.licenseNo ?? ""}
                placeholder="执照上的编号"
                onChange={(v) => setForm({ ...form, licenseNo: v })}
              />
              <FieldRow
                label="电台类别"
                value={form.licenseType ?? ""}
                placeholder="个人电台 / 集体电台"
                onChange={(v) => setForm({ ...form, licenseType: v })}
              />
              <FieldRow
                label="操作证书"
                value={form.operatorClass ?? ""}
                placeholder="A 类 / B 类 / C 类"
                onChange={(v) => setForm({ ...form, operatorClass: v })}
              />
              <FieldRow
                label="发证机关"
                value={form.licenseIssuer ?? ""}
                placeholder="发证机关"
                onChange={(v) => setForm({ ...form, licenseIssuer: v })}
              />
              <div className="flex items-center justify-between px-4 min-h-[50px] border-b border-gray-100">
                <span className="text-[13px] text-black/60">有效期</span>
                <span className="flex items-center gap-1.5">
                  {[5, 3].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setLicenseYears(y)
                        // 已填发证日期时，切到几年就按几年重算到期日期
                        if (form.licenseIssueDate) {
                          setForm({
                            ...form,
                            licenseExpireDate: plusYears(form.licenseIssueDate, y),
                          })
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-bold transition ${
                        licenseYears === y
                          ? "bg-indigo-600 text-white"
                          : "bg-black/5 text-black/50"
                      }`}
                    >
                      +{y} 年
                    </button>
                  ))}
                </span>
              </div>
              <DateRow
                label="发证日期"
                value={form.licenseIssueDate ?? ""}
                onChange={(v) => {
                  const auto = v ? plusYears(v, licenseYears) : ""
                  setForm({
                    ...form,
                    licenseIssueDate: v,
                    // 选发证日期后到期日期按所选年数自动填，用户仍可手改
                    licenseExpireDate: auto || form.licenseExpireDate,
                  })
                }}
              />
              <DateRow
                label="到期日期"
                value={form.licenseExpireDate ?? ""}
                onChange={(v) => setForm({ ...form, licenseExpireDate: v })}
              />
            </div>
            </>
            ) : null}

            {saveError ? (
              <p className="text-xs text-red-600 mt-3 px-1">{saveError}</p>
            ) : null}
            {saveMsg ? (
              <p className="text-xs text-emerald-600 mt-3 px-1">{saveMsg}</p>
            ) : null}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full h-12 rounded-xl bg-indigo-600 text-white text-[15px] font-bold disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>

            {myView === "profile" ? (
              <p className="text-[11px] text-black/45 leading-6 mt-3 px-1">
                呼号是身份标识，如需更改请提交申请由管理员处理。
                <br />
                设备与 QTH 会作为主控台录入你记录时的默认值。
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 绑定 */}
        {tab === "my" && myView === "bind" ? (
          <div className="px-4 pb-6">
            <p className="text-xs font-extrabold text-black/55 mb-2 pl-1">微信绑定</p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)]">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <span className="text-[13px] text-black/60">绑定状态</span>
                <span className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-600">
                  <i className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  已生效
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <span className="text-[13px] text-black/60">绑定呼号</span>
                <span className="text-sm font-bold text-black">
                  {data.binding.callsign || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-[13px] text-black/60">绑定时间</span>
                <span className="text-sm font-bold text-black">
                  {fmtDate(data.binding.boundAt)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-black/45 leading-6 mt-3 px-1">
              绑定后，主控提交你的参与记录时会自动收到微信回执。解绑后不再接收，可随时重新绑定。
            </p>

            <button
              onClick={handleUnbind}
              disabled={unbinding}
              className="mt-4 w-full h-12 rounded-xl border border-red-200 bg-white text-red-600 text-[15px] font-bold disabled:opacity-60"
            >
              {unbinding ? "解绑中..." : "解除绑定"}
            </button>
            <a
              href="/wechat/bind"
              className="mt-3 block text-center h-12 leading-[48px] rounded-xl bg-indigo-600 text-white text-[15px] font-bold"
            >
              重新绑定 / 更换呼号
            </a>
          </div>
        ) : null}

        {/* 推送 */}
        {tab === "my" && myView === "push" ? (
          <div className="px-4 pb-6">
            <p className="text-xs font-extrabold text-black/55 mb-2 pl-1">近 20 条推送</p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(24,24,60,0.06)]">
              {pushLogs.length === 0 ? (
                <p className="text-xs text-black/45 py-10 text-center">
                  {pushLoading ? "加载中..." : "暂无推送记录"}
                </p>
              ) : (
                pushLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-[13px] text-black">
                      {fmtDate(log.createdAt)}{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Asia/Shanghai",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(log.createdAt))}
                    </span>
                    <span
                      className={`text-[11px] font-bold flex items-center gap-1.5 ${
                        log.status === "success" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      <i
                        className={`w-1.5 h-1.5 rounded-full ${
                          log.status === "success" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {log.status === "success" ? "已送达" : "未送达"}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-black/45 leading-6 mt-3 px-1">
              未送达多为未关注公众号或消息被折叠；若持续失败请联系管理员。
            </p>
          </div>
        ) : null}
        </div>
      </div>

      {/* [v2.0.5] 底部悬浮导航：记录 / 绑定 / 推送 / 我的 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-28px)] max-w-[420px] z-40">
        <nav className="bg-white/90 backdrop-blur-xl border border-white/70 rounded-[26px] shadow-[0_16px_38px_rgba(24,24,60,0.22)] flex px-1.5 py-2">
          {(
            [
              { key: "home", label: "首页" },
              { key: "records", label: "记录" },
              { key: "my", label: "我的" },
            ] as { key: TabKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                // 离开「我的」子页时清掉那条伪造历史，避免返回键空转
                if (key !== "my" && window.history.state?.meSubView) {
                  window.history.back()
                }
                setTab(key)
                if (key === "my") setMyView("menu")
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-[18px] transition ${
                tab === key
                  ? "bg-indigo-600/10 text-indigo-600 font-extrabold"
                  : "text-gray-400 font-semibold"
              }`}
            >
              {key === "home" ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[23px] h-[23px]"
                >
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                </svg>
              ) : key === "records" ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  className="w-[23px] h-[23px]"
                >
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[23px] h-[23px]"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* [v2.0.2] 台网规则抽屉：首次自动弹（只显示前 3 条），点底部入口看全部 */}
      {rulesOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end"
          onClick={closeRules}
        >
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl px-5 pt-2 pb-6 max-h-[78vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mt-1.5 mb-4" />
            <p className="text-[17px] font-extrabold text-black">台网规则</p>
            <p className="text-[11px] text-black/40 mt-1 mb-3.5">
              {rulesFull ? "如需修改请联系管理员" : "第一次来，先花 30 秒了解一下"}
            </p>

            <ol className="space-y-2">
              {(rulesFull ? ruleLines : ruleLines.slice(0, 3)).map((line, index) => (
                <li
                  key={index}
                  className="flex gap-2 text-[12.5px] leading-6 text-black/75"
                >
                  <span className="text-black/30 font-bold tabular-nums">
                    {index + 1}.
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={closeRules}
              className="mt-5 w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              我知道了
            </button>

            {!rulesFull && ruleLines.length > 3 ? (
              <button
                onClick={() => setRulesFull(true)}
                className="mt-2.5 w-full h-11 rounded-xl border border-gray-200 text-black/70 text-[13.5px] font-semibold"
              >
                查看完整规则
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatCell({
  value,
  unit,
  label,
  note,
  border,
}: {
  value: string | number
  unit?: string
  label: string
  note?: string
  border?: boolean
}) {
  return (
    <div
      className={`px-4 py-[18px] border-b border-gray-100 ${
        border ? "border-r" : ""
      }`}
    >
      <p className="text-[30px] font-extrabold text-black leading-none tabular-nums">
        {value}
        {unit ? (
          <span className="text-[14px] font-bold text-black/50 ml-1">{unit}</span>
        ) : null}
      </p>
      <p className="text-[14px] font-medium text-black/60 mt-2.5">{label}</p>
      {note ? <p className="text-[11.5px] text-black/45 mt-1.5">{note}</p> : null}
    </div>
  )
}

function ReadonlyRow({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div className="flex items-center px-4 min-h-[50px] bg-[#fafbfd] border-b border-gray-100">
      <span className="w-[86px] shrink-0 text-[13px] text-black/45">{label}</span>
      <span className="flex-1 text-right text-sm font-bold text-black/45">{value}</span>
      {note ? <span className="text-[10px] text-black/35 font-semibold ml-2">{note}</span> : null}
    </div>
  )
}

function FieldRow({
  label,
  value,
  placeholder,
  note,
  inputMode,
  maxLength,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  note?: string
  inputMode?: "text" | "numeric"
  maxLength?: number
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center px-4 min-h-[50px] border-b border-gray-100 last:border-0">
      <span className="w-[86px] shrink-0 text-[13px] text-black/60">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-right text-sm font-bold text-black outline-none py-3 placeholder:font-normal placeholder:text-black/25"
      />
      {note ? <span className="text-[10px] text-black/35 font-semibold ml-2">{note}</span> : null}
    </div>
  )
}

function DateRow({
  label,
  value,
  note,
  onChange,
}: {
  label: string
  value: string
  note?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center px-4 min-h-[50px] border-b border-gray-100 last:border-0">
      <span className="w-[86px] shrink-0 text-[13px] text-black/60">{label}</span>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-right text-sm font-bold text-black outline-none py-3"
      />
      {note ? <span className="text-[10px] text-black/35 font-semibold ml-2">{note}</span> : null}
    </div>
  )
}
