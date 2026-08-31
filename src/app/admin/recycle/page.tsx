// @version v1.5.19
"use client"

import { useState, useEffect, useCallback } from "react"
import AdminLayout from "@/components/AdminLayout"
import type { AuditLog, LogSession } from "@/storage/database/shared/schema"

interface DeletedItem {
  session: LogSession
  deletedRecordCount: number
}

export default function RecyclePage() {
  const [items, setItems] = useState<DeletedItem[]>([])
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")
  const [tab, setTab] = useState<"recycle" | "audit">("recycle")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/admin/recycle", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/audit", { cache: "no-store" }).then((r) => r.json()),
      ])
      if (r1.success) setItems(r1.items || [])
      if (r2.success) setAudit(r2.logs || [])
    } catch {
      setMsg("加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const restoreSession = async (id: string) => {
    if (!confirm("确定恢复该台网会话吗？恢复后将在历史中重新可见。")) return
    setMsg("")
    const res = await fetch(`/api/admin/sessions/${id}/restore`, { method: "POST" }).then((r) => r.json())
    if (res.message) { setMsg("已恢复：" + (res.message || "")); load() }
    else setMsg(res.error || "恢复失败")
  }

  const restoreRecord = async (sessionId: string, recordId: string) => {
    const res = await fetch(`/api/admin/sessions/${sessionId}/records/${recordId}/restore`, { method: "POST" }).then((r) => r.json())
    if (res.message) { setMsg("记录已恢复"); load() }
    else setMsg(res.error || "恢复失败")
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">回收站与审计日志</h1>
        <p className="text-sm text-gray-500 mb-4">删除的台网会话可在此恢复；所有删除/恢复操作均被记录以便追溯。</p>

        {msg && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">{msg}</div>
        )}

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("recycle")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "recycle" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}
          >
            回收站（{items.length}）
          </button>
          <button
            onClick={() => setTab("audit")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "audit" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}
          >
            审计日志（{audit.length}）
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">加载中…</div>
        ) : tab === "recycle" ? (
          items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-400">
              回收站为空，没有已删除的台网会话。
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.session.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{it.session.title || it.session.controllerName}</p>
                      <p className="text-sm text-gray-500">
                        {it.session.sessionTime ? new Date(it.session.sessionTime).toLocaleString("zh-CN") : ""}
                        {" · 主控 "}{it.session.controllerName}
                        {" · 软删记录 "}{it.deletedRecordCount}{" 条"}
                      </p>
                    </div>
                    <button
                      onClick={() => restoreSession(it.session.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                    >
                      恢复会话
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {audit.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-400">
                暂无审计记录。
              </div>
            ) : (
              <div className="relative pl-6 border-l border-gray-200 space-y-4">
                {audit.map((log) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white"></span>
                    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          log.action === "RESTORE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}>{log.action}</span>
                        <span className="text-xs text-gray-400">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN") : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{log.detail}</p>
                      <p className="text-xs text-gray-400">
                        {log.username || "未知用户"} · {log.entityType}:{log.entityId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
