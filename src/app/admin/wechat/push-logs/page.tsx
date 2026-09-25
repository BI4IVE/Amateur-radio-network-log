// @version v1.5.25
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"
import { formatDateTimeCN } from "@/utils/dateFormat"

type PushLog = {
  id: string
  callsign: string | null
  openid: string | null
  status: string
  errcode: number | null
  errmsg: string | null
  msgid: string | null
  createdAt: string
}

/** 推送留痕查询：用于排查「为什么用户没收到」 */
export default function WechatPushLogsPage() {
  const router = useRouter()
  const [items, setItems] = useState<PushLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [callsign, setCallsign] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    if (user.role !== "admin") {
      alert("无权访问此页面")
      router.push("/")
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (callsign.trim()) qs.set("callsign", callsign.trim())
      if (status) qs.set("status", status)
      const res = await fetch(`/api/admin/wechat/push-logs?${qs.toString()}`)
      const data = await res.json()
      setItems(data.logs || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Load push logs error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-black">推送日志</h2>
          <p className="text-sm text-black mt-1">
            查看模板消息发送记录与失败原因（失败多为取关或拒收，不会自动重试）
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-black mb-1">呼号</label>
            <input
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-black mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            >
              <option value="">全部</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </div>
          <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
            查询
          </button>
          <span className="text-sm text-black ml-auto">共 {total} 条</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-black text-sm">加载中...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-black text-sm">暂无推送记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-black">
                <tr>
                  <th className="px-4 py-3 text-left">时间</th>
                  <th className="px-4 py-3 text-left">呼号</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">结果</th>
                  <th className="px-4 py-3 text-left">消息ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-black">
                      {formatDateTimeCN(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.callsign || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          log.status === "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.status === "success" ? "成功" : "失败"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-black">
                      {log.status === "success"
                        ? "-"
                        : `${log.errcode ?? ""} ${log.errmsg || ""}`}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-black">
                      {log.msgid || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
