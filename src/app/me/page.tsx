// @version v2.0.0
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

/**
 * [个人中心] /me
 *
 * 身份来自微信静默授权（服务端 90 天签名 Cookie），页面本身不接收任何身份参数。
 * 三个 tab：我的记录 / 档案（可编辑） / 推送。
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
  topSignal: string | null
  rank: number
  rankedTotal: number
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

type TabKey = "log" | "profile" | "push"

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

/** 发证日期 + 5 年（YYYY-MM-DD） */
function plusFiveYears(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const d = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ""
  d.setUTCFullYear(d.getUTCFullYear() + 5)
  return d.toISOString().slice(0, 10)
}

export default function MePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Overview | null>(null)
  const [tab, setTab] = useState<TabKey>("log")

  const [records, setRecords] = useState<RecordItem[]>([])
  const [recordTotal, setRecordTotal] = useState(0)
  const [recordsLoading, setRecordsLoading] = useState(false)

  const [pushLogs, setPushLogs] = useState<PushLog[]>([])
  const [pushLoading, setPushLoading] = useState(false)

  const [form, setForm] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

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
      if (json.profile) setForm({ ...json.profile })
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const loadRecords = useCallback(async (offset = 0) => {
    setRecordsLoading(true)
    try {
      const res = await fetch(`/api/me/records?limit=50&offset=${offset}`, {
        cache: "no-store",
      })
      if (!res.ok) return
      const json = await res.json()
      setRecords((prev) => (offset === 0 ? json.items || [] : [...prev, ...(json.items || [])]))
      setRecordTotal(json.total || 0)
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
    if (tab === "log" && records.length === 0) loadRecords(0)
    if (tab === "push" && pushLogs.length === 0) loadPushLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.bound, tab])

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

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-md mx-auto bg-[#f7f8fb] min-h-screen">
        {/* 顶部 */}
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-800 px-5 pt-7 pb-16 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-10 w-48 h-48 rounded-full bg-white/5" />
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
          <StatCell
            value={data.stats?.sessions ?? 0}
            unit="场"
            label="累计参与"
            note={data.stats?.firstTime ? `首次 ${fmtDate(data.stats.firstTime)}` : "暂无记录"}
            border
          />
          <StatCell
            value={data.stats?.yearSessions ?? 0}
            unit="场"
            label="本年度"
            note="按北京时间切年"
            border
          />
          <StatCell
            value={data.stats?.topSignal ?? "-"}
            label="最常信号"
            note={data.stats?.lastTime ? `最近 ${fmtDate(data.stats.lastTime)}` : "暂无记录"}
          />
          <StatCell
            value={data.stats?.rank ? `${data.stats.rank}` : "-"}
            unit="位"
            label="台网排名"
            note={`共 ${data.stats?.rankedTotal ?? 0} 位活跃`}
          />
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

          <p className="mt-3 text-lg font-extrabold tracking-wide text-black">
            {data.profile?.licenseNo || "未填写执照编号"}
          </p>
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
              在「档案」里填写执照信息后，这里会显示到期倒计时。
            </p>
          )}
        </div>

        {/* tabs */}
        <div className="flex gap-6 px-5 pt-5 pb-2">
          {(
            [
              ["log", "我的记录"],
              ["profile", "档案"],
              ["push", "推送"],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 text-sm relative ${
                tab === key ? "font-extrabold text-black" : "font-semibold text-black/50"
              }`}
            >
              {label}
              {tab === key ? (
                <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded bg-indigo-600" />
              ) : null}
            </button>
          ))}
        </div>

        {/* 记录 */}
        {tab === "log" ? (
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

            {records.length < recordTotal ? (
              <button
                onClick={() => loadRecords(records.length)}
                disabled={recordsLoading}
                className="mt-3 w-full h-11 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-black disabled:opacity-50"
              >
                {recordsLoading ? "加载中..." : `加载更多（${records.length}/${recordTotal}）`}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* 档案 */}
        {tab === "profile" && form ? (
          <div className="px-4 pb-6">
            <div className="bg-indigo-50 rounded-xl px-3.5 py-3 text-[11.5px] leading-6 text-indigo-900">
              档案由你自行维护，保存后立即生效；每次修改都会留痕，管理员可查看修改记录。
            </div>

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

            <p className="text-xs font-extrabold text-black/55 mt-5 mb-2 pl-1">执照信息</p>
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
              <DateRow
                label="发证日期"
                value={form.licenseIssueDate ?? ""}
                onChange={(v) => {
                  const auto = v ? plusFiveYears(v) : ""
                  setForm({
                    ...form,
                    licenseIssueDate: v,
                    // 选发证日期后到期日期自动 +5 年，用户仍可手改
                    licenseExpireDate: auto || form.licenseExpireDate,
                  })
                }}
              />
              <DateRow
                label="到期日期"
                value={form.licenseExpireDate ?? ""}
                note="+5 年"
                onChange={(v) => setForm({ ...form, licenseExpireDate: v })}
              />
            </div>

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

            <p className="text-[11px] text-black/45 leading-6 mt-3 px-1">
              呼号是身份标识，如需更改请提交申请由管理员处理。
              <br />
              设备与 QTH 会作为主控台录入你记录时的默认值。
            </p>
          </div>
        ) : null}

        {/* 推送 */}
        {tab === "push" ? (
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
  note: string
  border?: boolean
}) {
  return (
    <div
      className={`px-3.5 py-3.5 border-b border-gray-100 ${
        border ? "border-r" : ""
      }`}
    >
      <p className="text-[22px] font-extrabold text-black leading-none tabular-nums">
        {value}
        {unit ? <span className="text-xs font-bold text-black/50 ml-0.5">{unit}</span> : null}
      </p>
      <p className="text-[11px] text-black/55 mt-1.5">{label}</p>
      <p className="text-[10px] text-black/40 mt-1">{note}</p>
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
