"use client"

// @version v1.5.16
import { useEffect, useState } from "react"

interface Upcoming {
  id: string
  title: string | null
  scheduledTime: string | null
  controllerName: string | null
}

export default function ScheduleCountdown() {
  const [up, setUp] = useState<Upcoming | null>(null)
  const [now, setNow] = useState(Date.now())
  const [isAdmin, setIsAdmin] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let active = true
    const load = () =>
      fetch("/api/schedules", { cache: "no-store" })
        .then((r) => r.json())
        .then((res) => { if (active && res.success) setUp(res.schedule || null) })
        .catch(() => {})
    const checkAdmin = () =>
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((res) => { if (active && res.authenticated && res.role) setIsAdmin(true) })
        .catch(() => {})
    load()
    checkAdmin()
    const t = setInterval(() => { setNow(Date.now()); load() }, 30000)
    return () => { active = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!up || !up.scheduledTime) return null
  const target = new Date(up.scheduledTime).getTime()
  const diff = target - now
  const started = diff <= 0
  const abs = Math.max(0, diff)
  const d = Math.floor(abs / 86400000)
  const h = Math.floor((abs % 86400000) / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      const res = await fetch(`/api/admin/schedules/${up.id}/start`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        window.location.href = "/live"
      } else {
        alert(data.error || "开始台网失败")
      }
    } catch {
      alert("网络错误，开始台网失败")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">下次台网预告</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{up.title || "未命名台网"}</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date(up.scheduledTime).toLocaleString("zh-CN")}
            {up.controllerName ? ` · 主控 ${up.controllerName}` : " · 主控待定"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {started ? (
            <div className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              台网时间已到
            </div>
          ) : (
            <div className="flex items-end gap-2 text-center">
              {[["天", d], ["时", h], ["分", m], ["秒", s]].map(([label, val]) => (
                <div key={label as string} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="text-2xl font-bold tabular-nums text-indigo-600">
                    {String(val as number).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-gray-400">{label as string}</div>
                </div>
              ))}
            </div>
          )}
          {started && isAdmin && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? "正在开始…" : "开始台网"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
