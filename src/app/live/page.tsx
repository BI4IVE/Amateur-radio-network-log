// @version v1.5.11
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import ScheduleCountdown from "@/components/ScheduleCountdown"

interface SessionInfo {
  id: string
  title?: string | null
  theme?: string | null
  sessionTime?: string
  controllerId?: string
  controllerName?: string
  [key: string]: unknown
}

interface RecordItem {
  id: string
  callsign: string
  qth?: string | null
  equipment?: string | null
  antenna?: string | null
  power?: string | null
  signal?: string | null
  report?: string | null
  remarks?: string | null
  createdAt?: string
  sequence?: number
}

export default function LivePage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [connected, setConnected] = useState(false)
  const [liveError, setLiveError] = useState("")
  const esRef = useRef<EventSource | null>(null)

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" })
      const data = await res.json()
      setSessions(Array.isArray(data.sessions) ? data.sessions : [])
    } catch (e) {
      console.error(e)
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setConnected(false)
  }, [])

  const openStream = useCallback(async (sid: string) => {
    setLiveError("")
    // 初始拉取已有记录
    try {
      const res = await fetch(`/api/sessions/${sid}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        setLiveError(data.error || "无法加载会话")
        return
      }
      setSession(data.session || null)
      const recs = (data.records || []).slice().sort(
        (a: RecordItem, b: RecordItem) =>
          (a.sequence ?? 0) - (b.sequence ?? 0) ||
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
      )
      setRecords(recs)
    } catch (e) {
      console.error(e)
      setLiveError("加载会话数据失败")
      return
    }

    // 建立 SSE 实时流
    closeStream()
    const es = new EventSource(`/api/sse/session/${sid}/subscribe`)
    esRef.current = es
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (ev) => {
      let msg: { type?: string; record?: RecordItem; recordId?: string }
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.type === "connected") {
        setConnected(true)
        return
      }
      if (msg.type === "record_added" && msg.record) {
        setRecords((prev) => {
          if (prev.some((r) => r.id === msg.record!.id)) return prev
          return [...prev, msg.record!]
        })
      } else if (msg.type === "record_updated" && msg.record) {
        setRecords((prev) =>
          prev.map((r) => (r.id === msg.record!.id ? msg.record! : r))
        )
      } else if (msg.type === "record_deleted" && msg.recordId) {
        setRecords((prev) => prev.filter((r) => r.id !== msg.recordId))
      }
    }
  }, [closeStream])

  useEffect(() => {
    if (activeId) openStream(activeId)
    return () => closeStream()
  }, [activeId, openStream, closeStream])

  // 在网呼号（去重，按出现顺序）
  const onlineCallsigns = Array.from(
    records.reduce((m, r) => (m.has(r.callsign) ? m : m.set(r.callsign, r)), new Map<string, RecordItem>()).values()
  )

  if (activeId && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                setActiveId(null)
                setSession(null)
                setRecords([])
                closeStream()
              }}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700/60"
            >
              ← 返回
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white drop-shadow">
                {session.title || session.theme || "实况大屏"}
              </h1>
              <p className="truncate text-xs text-sky-300">
                {session.sessionTime
                  ? new Date(session.sessionTime).toLocaleString("zh-CN")
                  : ""}
                {session.controllerName ? ` · 主控 ${session.controllerName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                connected ? "bg-green-400 animate-pulse shadow-[0_0_8px_2px_rgba(74,222,128,0.7)]" : "bg-red-500"
              }`}
            />
            <span className={`text-xs font-medium ${connected ? "text-green-300" : "text-red-300"}`}>
              {connected ? "实时连接中" : "连接断开"}
            </span>
          </div>
        </header>

        {liveError && (
          <div className="mx-4 mt-4 rounded-md bg-red-900/40 border border-red-600 px-3 py-2 text-sm text-red-200">
            {liveError}
          </div>
        )}

        <main className="grid gap-4 p-4 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-cyan-300">
                实时记录流
              </h2>
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                {records.length} 条
              </span>
            </div>
            <ul className="space-y-2">
              {records.length === 0 && (
                <li className="text-sm text-slate-400">暂无记录</li>
              )}
              {records.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border-l-4 border-cyan-400 bg-slate-800/70 px-3 py-2"
                >
                  <span className="mt-0.5 shrink-0 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 px-2 py-0.5 font-mono text-sm font-bold text-white shadow">
                    {r.callsign}
                  </span>
                  <div className="min-w-0 text-sm">
                    <div className="font-medium text-white">
                      {[r.qth, r.report, r.signal].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {(r.equipment || r.remarks) && (
                      <div className="mt-0.5 truncate text-xs text-slate-300">
                        {[r.equipment, r.remarks].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <span className="ml-auto shrink-0 text-xs font-medium text-slate-300">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleTimeString("zh-CN")
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-bold text-emerald-300">
              在网呼号 ({onlineCallsigns.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {onlineCallsigns.length === 0 && (
                <span className="text-sm text-slate-400">暂无</span>
              )}
              {onlineCallsigns.map((r) => (
                <span
                  key={r.id}
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1 font-mono text-sm font-semibold text-emerald-200"
                >
                  {r.callsign}
                </span>
              ))}
            </div>
          </aside>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <header className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 to-indigo-900/40 px-4 py-5">
        <h1 className="text-2xl font-bold text-white">实况大屏</h1>
        <p className="mt-1 text-sm text-sky-300">
          选择一个进行中的台网，实时查看在网呼号与最新记录。
        </p>
      </header>
      <ScheduleCountdown />
      <main className="p-4">
        {sessionsLoading ? (
          <p className="text-sm text-slate-300">加载中…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-400">当前没有进行中的台网。</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 text-left transition hover:border-cyan-400/70 hover:bg-slate-800 hover:shadow-lg"
              >
                <div className="text-base font-bold text-white">{s.title || s.theme || "未命名台网"}</div>
                <div className="mt-1 text-xs text-cyan-300">
                  {s.sessionTime
                    ? new Date(s.sessionTime).toLocaleString("zh-CN")
                    : ""}
                </div>
                <div className="mt-2 text-xs font-medium text-slate-200">
                  {s.controllerName ? `主控 ${s.controllerName}` : "未指定主控"}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
