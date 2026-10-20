// @version v2.0.0
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "@/components/AdminLayout"

/**
 * [v2.0.0] 审计日志
 *
 * 覆盖：台网/记录的软删与恢复、用户档案修改（用户自助 / 管理员）、创建与更新。
 * 权限点 audit.view（默认只有超管）。
 */

type AuditLog = {
  id: string
  userId: string | null
  username: string | null
  action: string
  entityType: string
  entityId: string
  detail: string | null
  createdAt: string
}

const ACTION_LABEL: Record<string, string> = {
  SOFT_DELETE: "软删除",
  RESTORE: "恢复",
  CREATE: "创建",
  UPDATE: "更新",
  START: "开台",
  UPDATE_PROFILE: "用户改档案",
  UPDATE_PROFILE_ADMIN: "管理员改档案",
}

const ENTITY_LABEL: Record<string, string> = {
  session: "台网场次",
  record: "通联记录",
  participant: "会员档案",
}

function fmtDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d)
}

/** detail 可能是普通文本，也可能是 { by, callsign, changes: [...] } */
function renderDetail(detail: string | null) {
  if (!detail) return <span className="text-black/30">-</span>
  try {
    const parsed = JSON.parse(detail)
    if (parsed && Array.isArray(parsed.changes) && parsed.changes.length > 0) {
      return (
        <div className="space-y-0.5">
          {parsed.changes.map(
            (
              c: { label?: string; field?: string; from: string | null; to: string | null },
              idx: number
            ) => (
              <div key={idx} className="text-xs leading-5">
                <span className="text-black/55">{c.label || c.field}</span>
                <span className="text-black/35 line-through ml-1.5">
                  {c.from || "（空）"}
                </span>
                <span className="text-black/35 mx-1">→</span>
                <span className="font-semibold text-black">{c.to || "（空）"}</span>
              </div>
            )
          )}
        </div>
      )
    }
  } catch {
    // 非 JSON，按原文展示
  }
  return <span className="text-xs text-black/70 break-words">{detail}</span>
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/audit", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "加载失败")
      setLogs(json.logs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false
      if (!kw) return true
      return (
        (log.username || "").toLowerCase().includes(kw) ||
        (log.detail || "").toLowerCase().includes(kw) ||
        (log.entityId || "").toLowerCase().includes(kw)
      )
    })
  }, [logs, keyword, actionFilter])

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-black">审计日志</h1>
            <p className="text-sm text-black/55 mt-1">
              台网删除/恢复、会员档案修改等关键操作留痕，按时间倒序（最多 200 条）
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row gap-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索操作人、详情、对象 ID..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">全部动作</option>
            {Object.entries(ACTION_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <span className="self-center text-sm text-black/50 whitespace-nowrap">
            {filtered.length} / {logs.length} 条
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-black/50">加载中...</div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-black/50">暂无审计记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-black/50 whitespace-nowrap">
                      时间
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-black/50">
                      操作人
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-black/50">
                      动作
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-black/50">
                      对象
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-black/50">
                      详情
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-2.5 text-xs text-black/70 whitespace-nowrap tabular-nums">
                        {fmtDateTime(log.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-black">
                        {log.username || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${
                            log.action === "SOFT_DELETE"
                              ? "bg-red-50 text-red-600"
                              : log.action === "RESTORE"
                                ? "bg-emerald-50 text-emerald-700"
                                : log.action.startsWith("UPDATE_PROFILE")
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-gray-100 text-black/60"
                          }`}
                        >
                          {ACTION_LABEL[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-black/70 whitespace-nowrap">
                        <div>{ENTITY_LABEL[log.entityType] || log.entityType}</div>
                        <div className="text-[10px] text-black/35 font-mono mt-0.5">
                          {log.entityId.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{renderDetail(log.detail)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
