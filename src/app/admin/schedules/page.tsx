"use client"

// @version v1.5.15
import { useEffect, useState } from "react"
import AdminLayout from "@/components/AdminLayout"

interface Schedule {
  id: string
  title: string | null
  scheduledTime: string | null
  sessionTime: string
  controllerName: string | null
  controllerId: string
  status: string
}

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export default function SchedulesPage() {
  const [list, setList] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [title, setTitle] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [controllerName, setControllerName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/schedules")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setList(res.schedules)
        else setError(res.error || "加载失败")
      })
      .catch((e) => setError("网络错误: " + e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const reset = () => {
    setTitle(""); setScheduledTime(""); setControllerName(""); setEditingId(null)
  }

  const submit = () => {
    if (!title.trim()) { setError("标题不能为空"); return }
    if (!scheduledTime) { setError("请选择预告时间"); return }
    const body = { title: title.trim(), scheduledTime, controllerName: controllerName.trim() || "待定" }
    const url = editingId ? `/api/admin/schedules/${editingId}` : "/api/admin/schedules"
    const method = editingId ? "PUT" : "POST"
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...body, controllerName: body.controllerName } : body),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) { reset(); load() }
        else setError(res.error || "保存失败")
      })
      .catch((e) => setError("网络错误: " + e.message))
  }

  const edit = (s: Schedule) => {
    setEditingId(s.id)
    setTitle(s.title || "")
    setScheduledTime(s.scheduledTime ? toLocalInput(new Date(s.scheduledTime)) : "")
    setControllerName(s.controllerName || "")
  }

  const del = (id: string) => {
    if (!confirm("确认删除该预告？")) return
    fetch(`/api/admin/schedules/${id}`, { method: "DELETE" })
      .then((r) => r.json())
      .then((res) => { if (res.success) load(); else setError(res.error || "删除失败") })
      .catch((e) => setError("网络错误: " + e.message))
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">台网预告 / 排期</h1>
          <p className="mt-1 text-sm text-gray-700">新建未来台网预告，首页与实况大屏将自动显示倒计时。</p>
        </div>

        {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{editingId ? "编辑预告" : "新建预告"}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="台网主题（如：周五晚间台网）" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            <input className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="主控（可选，默认待定）" value={controllerName} onChange={(e) => setControllerName(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editingId ? "保存修改" : "添加预告"}</button>
            {editingId && <button onClick={reset} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50">取消</button>}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-900">主题</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-900">预告时间</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-900">主控</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-900">加载中…</td></tr>}
              {!loading && list.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{s.title || "未命名台网"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{s.scheduledTime ? new Date(s.scheduledTime).toLocaleString("zh-CN") : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{s.controllerName || "待定"}</td>
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => edit(s)} className="mr-3 font-medium text-blue-600 hover:underline">编辑</button>
                    <button onClick={() => del(s.id)} className="font-medium text-red-600 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
              {!loading && list.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-900">暂无预告</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
