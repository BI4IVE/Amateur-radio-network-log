// @version v2.0.2
"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import AdminLayout from "@/components/AdminLayout"

/**
 * [个人中心] 后台用户详情
 *
 * 设备库点呼号进入：档案/执照可直接改，右侧看参与、绑定、推送与修改记录。
 */

type Participant = {
  id: string
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

type Detail = {
  callsign: string
  participant: Participant | null
  defaults?: { licenseIssuer: string }
  license: {
    state: "none" | "ok" | "soon" | "urgent" | "expired"
    label: string
    daysLeft: number | null
    issueDate: string | null
    expireDate: string | null
  }
  stats: {
    sessions: number
    yearSessions: number
    firstTime: string | null
    lastTime: string | null
    topSignal: string | null
    rank: number
    rankedTotal: number
  }
  bindings: {
    id: string
    openid: string
    status: string
    createdAt: string
    updatedAt: string
  }[]
  pushLogs: {
    id: string
    status: string
    errcode: number | null
    errmsg: string | null
    createdAt: string
  }[]
  auditLogs: {
    id: string
    action: string
    by: "member" | "admin"
    username: string | null
    changes: { field: string; label: string; from: string | null; to: string | null }[]
    detail: string | null
    createdAt: string
  }[]
}

type FormState = {
  memberNo: string
  name: string
  qth: string
  equipment: string
  antenna: string
  power: string
  licenseNo: string
  licenseType: string
  operatorClass: string
  licenseIssuer: string
  licenseIssueDate: string
  licenseExpireDate: string
}

const EMPTY_FORM: FormState = {
  memberNo: "",
  name: "",
  qth: "",
  equipment: "",
  antenna: "",
  power: "",
  licenseNo: "",
  licenseType: "",
  operatorClass: "",
  licenseIssuer: "",
  licenseIssueDate: "",
  licenseExpireDate: "",
}

function fmt(value: string | null | undefined) {
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

function fmtDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

function badgeClass(state: Detail["license"]["state"]) {
  if (state === "expired") return "bg-red-50 text-red-600"
  if (state === "soon" || state === "urgent") return "bg-amber-50 text-amber-700"
  if (state === "none") return "bg-gray-100 text-black/50"
  return "bg-emerald-50 text-emerald-700"
}

export default function AdminParticipantDetailPage() {
  const params = useParams<{ callsign: string }>()
  const callsign = decodeURIComponent(String(params?.callsign || "")).toUpperCase()

  const [data, setData] = useState<Detail | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!callsign) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/participants/${encodeURIComponent(callsign)}`, {
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "加载失败")
      setData(json)
      const p = json.participant as Participant | null
      setForm({
        memberNo: p?.memberNo ?? "",
        name: p?.name ?? "",
        qth: p?.qth ?? "",
        equipment: p?.equipment ?? "",
        antenna: p?.antenna ?? "",
        power: p?.power ?? "",
        licenseNo: p?.licenseNo ?? "",
        licenseType: p?.licenseType ?? "",
        operatorClass: p?.operatorClass ?? "",
        // 未填写时用后台配置的默认发证机关预填
        licenseIssuer: p?.licenseIssuer || (json.defaults?.licenseIssuer ?? ""),
        licenseIssueDate: p?.licenseIssueDate ?? "",
        licenseExpireDate: p?.licenseExpireDate ?? "",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [callsign])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/participants/${encodeURIComponent(callsign)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "保存失败")
      setSaveMsg(json.changed > 0 ? `已保存（${json.changed} 项变更）` : "没有变化")
      await load()
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  // [v1.5.29 会员中心] 绑定审核直接在这里做，不用跳去「微信绑定」页
  const reviewBinding = async (
    openid: string,
    action: "approve" | "reject" | "unbind"
  ) => {
    const label =
      action === "approve" ? "通过" : action === "reject" ? "拒绝" : "解绑"
    if (!confirm(`确认${label}该微信绑定？`)) return
    try {
      const res = await fetch("/api/admin/wechat/bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, openid }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "操作失败")
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "操作失败")
    }
  }

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const licenseState = data?.license.state ?? "none"

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/participants" className="text-sm text-black/50 hover:text-black">
            ← 会员档案
          </Link>
          <span className="text-black/20">/</span>
          <span className="text-sm font-semibold text-black">{callsign}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-black">加载中...</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-600">{error}</div>
        ) : !data ? null : (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold">
                {callsign.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-black tracking-wide">{callsign}</h2>
                  {form.memberNo ? (
                    <span className="text-xs font-semibold text-black/40">
                      编号 {form.memberNo}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-black mt-1">
                  {form.name || "未填写姓名"}
                  {form.qth ? ` · ${form.qth}` : ""}
                  {data.stats.firstTime ? ` · 加入 ${fmt(data.stats.firstTime)}` : ""}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${badgeClass(licenseState)}`}
              >
                {data.license.label}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {saveMsg ? <span className="text-xs text-black/50">{saveMsg}</span> : null}
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存档案"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
              {/* 左：档案 + 执照 */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-black">档案</h3>
                    <span className="text-xs text-black/45">用户可自助修改，管理员可覆盖</span>
                  </div>
                  <Row label="呼号" readonly value={callsign} />
                  <Row label="编号" value={form.memberNo} onChange={set("memberNo")} />
                  <Row label="姓名" value={form.name} onChange={set("name")} />
                  <Row label="所在地" value={form.qth} onChange={set("qth")} />
                  <Row label="常用设备" value={form.equipment} onChange={set("equipment")} />
                  <Row label="常用天线" value={form.antenna} onChange={set("antenna")} />
                  <Row label="发射功率" value={form.power} onChange={set("power")} />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-black">执照</h3>
                    <span className="text-xs text-black/45">
                      {data.license.daysLeft != null
                        ? data.license.daysLeft >= 0
                          ? `剩余 ${data.license.daysLeft} 天`
                          : "已过期"
                        : "未填写到期日期"}
                    </span>
                  </div>
                  <Row label="执照编号" value={form.licenseNo} onChange={set("licenseNo")} />
                  <Row label="电台类别" value={form.licenseType} onChange={set("licenseType")} />
                  <Row
                    label="操作证书"
                    value={form.operatorClass}
                    onChange={set("operatorClass")}
                  />
                  <Row
                    label="发证机关"
                    value={form.licenseIssuer}
                    onChange={set("licenseIssuer")}
                  />
                  <Row
                    label="发证日期"
                    type="date"
                    value={form.licenseIssueDate}
                    onChange={set("licenseIssueDate")}
                  />
                  <Row
                    label="到期日期"
                    type="date"
                    value={form.licenseExpireDate}
                    onChange={set("licenseExpireDate")}
                  />
                </div>
              </div>

              {/* 右：统计 + 绑定 + 修改记录 */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-black">参与情况</h3>
                    <span className="text-xs text-black/45">共 {data.stats.sessions} 场</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 p-3.5">
                    <Kpi value={data.stats.sessions} label="累计场次" />
                    <Kpi value={data.stats.yearSessions} label="本年度" />
                    <Kpi
                      value={data.stats.rank ? `#${data.stats.rank}` : "-"}
                      label="台网排名"
                    />
                  </div>
                  <Row label="最近参与" readonly value={fmt(data.stats.lastTime)} />
                  <Row label="最常信号" readonly value={data.stats.topSignal || "-"} />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-black">微信绑定</h3>
                    <span className="text-xs text-black/45">
                      {data.bindings.length} 条
                    </span>
                  </div>
                  {data.bindings.length === 0 ? (
                    <p className="px-4 py-6 text-xs text-black/45">未绑定</p>
                  ) : (
                    data.bindings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 last:border-0 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-black/60 truncate">
                            {b.openid.slice(0, 10)}…
                          </p>
                          <p className="text-black/40 mt-0.5">
                            {fmtDateTime(b.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {b.status === "pending" ? (
                            <>
                              <button
                                onClick={() => reviewBinding(b.openid, "approve")}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold"
                              >
                                通过
                              </button>
                              <button
                                onClick={() => reviewBinding(b.openid, "reject")}
                                className="px-2.5 py-1 rounded-md bg-gray-100 text-red-600 font-semibold"
                              >
                                拒绝
                              </button>
                            </>
                          ) : null}
                          {b.status === "active" ? (
                            <button
                              onClick={() => reviewBinding(b.openid, "unbind")}
                              className="px-2.5 py-1 rounded-md bg-gray-100 text-red-600 font-semibold"
                            >
                              解绑
                            </button>
                          ) : null}
                          <span
                            className={`font-bold ${
                              b.status === "active"
                                ? "text-emerald-600"
                                : b.status === "pending"
                                  ? "text-amber-600"
                                  : "text-black/45"
                            }`}
                          >
                            {b.status === "active"
                              ? "已生效"
                              : b.status === "pending"
                                ? "待审核"
                                : b.status === "rejected"
                                  ? "已拒绝"
                                  : "已失效"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="px-4 py-3 border-t border-gray-100">
                    <p className="text-xs text-black/45">
                      近 10 次推送：
                      {data.pushLogs.filter((l) => l.status === "success").length} 成功 /{" "}
                      {data.pushLogs.filter((l) => l.status !== "success").length} 失败
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-black">修改记录</h3>
                    <span className="text-xs text-black/45">
                      最近 {data.auditLogs.length} 条
                    </span>
                  </div>
                  {data.auditLogs.length === 0 ? (
                    <p className="px-4 py-6 text-xs text-black/45">暂无修改记录</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-black/45">
                          <th className="text-left font-semibold px-3 py-2">时间</th>
                          <th className="text-left font-semibold px-3 py-2">操作人</th>
                          <th className="text-left font-semibold px-3 py-2">变更</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.auditLogs.map((log) => (
                          <tr key={log.id} className="border-t border-gray-100 align-top">
                            <td className="px-3 py-2.5 text-black/60 whitespace-nowrap">
                              {fmtDateTime(log.createdAt)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  log.by === "admin"
                                    ? "bg-gray-100 text-black/60"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}
                              >
                                {log.by === "admin" ? "管理员" : "用户自助"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-black">
                              {log.changes.length === 0 ? (
                                <span className="text-black/40">-</span>
                              ) : (
                                log.changes.map((c, idx) => (
                                  <div key={idx} className="leading-5">
                                    <span className="text-black/55">{c.label}</span>
                                    <span className="text-black/35 line-through ml-1.5">
                                      {c.from || "（空）"}
                                    </span>
                                    <span className="text-black/35 mx-1">→</span>
                                    <span className="font-semibold">{c.to || "（空）"}</span>
                                  </div>
                                ))
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function Row({
  label,
  value,
  onChange,
  readonly,
  type = "text",
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  readonly?: boolean
  type?: "text" | "date"
}) {
  return (
    <div
      className={`flex items-center px-4 min-h-[44px] border-b border-gray-100 last:border-0 ${
        readonly ? "bg-[#fafbfd]" : ""
      }`}
    >
      <span className="w-[92px] shrink-0 text-xs text-black/55">{label}</span>
      {readonly ? (
        <span className="flex-1 text-right text-[13px] font-semibold text-black/45">
          {value || "-"}
        </span>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-right text-[13px] font-semibold text-black outline-none py-2.5"
        />
      )}
    </div>
  )
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-[#f7f8fb] rounded-lg px-3 py-2.5">
      <p className="text-lg font-extrabold text-black tabular-nums leading-none">{value}</p>
      <p className="text-[10.5px] text-black/50 mt-1.5">{label}</p>
    </div>
  )
}
