// @version v1.5.25
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"
import { formatDateTimeCN } from "@/utils/dateFormat"

type BindCode = {
  id: string
  callsign: string
  code: string
  status: string
  expiresAt: string | null
  usedBy: string | null
  usedAt: string | null
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  active: "未使用",
  used: "已使用",
  disabled: "已作废",
}

/**
 * [v1.5.21 微信推送] 一次性绑定码管理
 * 仅当「绑定认证方式 = 一次性绑定码」时使用。
 * 生成后需把呼号与码一起告知用户，用户在绑定页填写完成绑定。
 */
export default function WechatBindCodesPage() {
  const router = useRouter()
  const [items, setItems] = useState<BindCode[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [callsigns, setCallsigns] = useState("")
  const [generating, setGenerating] = useState(false)
  const [created, setCreated] = useState<BindCode[]>([])
  const [filterCallsign, setFilterCallsign] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

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
      if (filterCallsign.trim()) qs.set("callsign", filterCallsign.trim())
      if (filterStatus) qs.set("status", filterStatus)
      const res = await fetch(`/api/admin/wechat/bind-codes?${qs.toString()}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Load bind codes error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    // 支持逗号、空格、换行分隔
    const list = callsigns
      .split(/[,，\s\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)

    if (list.length === 0) {
      alert("请输入呼号（多个可用逗号或换行分隔）")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/admin/wechat/bind-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callsigns: list }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      setCreated(data.items || [])
      setCallsigns("")
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : "生成失败")
    } finally {
      setGenerating(false)
    }
  }

  const handleDisable = async (id: string) => {
    if (!confirm("确定作废该绑定码吗？")) return
    const res = await fetch(`/api/admin/wechat/bind-codes?id=${id}`, {
      method: "DELETE",
    })
    const data = await res.json()
    if (!res.ok || !data.ok) alert(data.error || "操作失败")
    load()
  }

  const copyAll = () => {
    if (created.length === 0) return
    const text = created.map((c) => `${c.callsign}\t${c.code}`).join("\n")
    navigator.clipboard?.writeText(text)
    alert("已复制「呼号 + 绑定码」清单")
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-black">绑定码管理</h2>
          <p className="text-sm text-black mt-1">
            为呼号生成一次性绑定码，用户凭「呼号 + 绑定码」完成绑定（码的长度与有效期在配置页设置）
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <label className="block text-sm font-medium text-black">
            批量生成（多个呼号用逗号、空格或换行分隔）
          </label>
          <textarea
            value={callsigns}
            onChange={(e) => setCallsigns(e.target.value)}
            rows={3}
            placeholder={"BI4IVE\nBG4JWL, BD4JN"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? "生成中..." : "生成绑定码"}
          </button>

          {created.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">
                  已生成 {created.length} 个绑定码（请记录后发给用户）
                </span>
                <button onClick={copyAll} className="text-xs text-green-700 underline">
                  复制清单
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {created.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium">{c.callsign}</span>
                    <span className="ml-2 font-mono text-green-700">{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-black mb-1">呼号</label>
            <input
              value={filterCallsign}
              onChange={(e) => setFilterCallsign(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-black mb-1">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            >
              <option value="">全部</option>
              <option value="active">未使用</option>
              <option value="used">已使用</option>
              <option value="disabled">已作废</option>
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
            <div className="p-8 text-center text-black text-sm">暂无绑定码</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-black">
                <tr>
                  <th className="px-4 py-3 text-left">呼号</th>
                  <th className="px-4 py-3 text-left">绑定码</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">有效期至</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.callsign}</td>
                    <td className="px-4 py-3 font-mono">{item.code}</td>
                    <td className="px-4 py-3">
                      {STATUS_LABEL[item.status] || item.status}
                    </td>
                    <td className="px-4 py-3 text-black">
                      {item.expiresAt
                        ? formatDateTimeCN(item.expiresAt)
                        : "长期有效"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "active" && (
                        <button
                          onClick={() => handleDisable(item.id)}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded"
                        >
                          作废
                        </button>
                      )}
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
