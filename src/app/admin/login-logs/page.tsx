// @version v1.5.19
"use client"

import { useCallback, useEffect, useState } from "react"
import AdminLayout from "@/components/AdminLayout"
import { formatDateTime } from "@/utils/dateFormat"
import { describeUserAgent } from "@/lib/userAgent"

interface LoginLogItem {
  id: string
  userId: string | null
  username: string | null
  success: boolean
  reason: string | null
  ip: string | null
  userAgent: string | null
  location: string | null
  createdAt: string
}

const REASON_LABEL: Record<string, string> = {
  NO_SUCH_USER: "账号不存在",
  WRONG_PASSWORD: "密码错误",
  LOCKED: "账号已锁定",
}

// IP 属个人信息：列表默认打码，需要时才展开完整值
function maskIp(ip: string | null): string {
  if (!ip || ip === "unknown") return ip || "-"
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) return `${v4[1]}.${v4[2]}.*.*`
  const parts = ip.split(":")
  if (parts.length > 2) return `${parts.slice(0, 2).join(":")}:****`
  return ip
}

const PAGE_SIZE = 50

export default function AdminLoginLogsPage() {
  const [logs, setLogs] = useState<LoginLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "success" | "fail">("all")
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const [showFullIp, setShowFullIp] = useState(false)
  const [purging, setPurging] = useState(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.append("limit", String(PAGE_SIZE))
      params.append("offset", String(offset))
      if (filter !== "all") params.append("success", filter === "success" ? "true" : "false")
      const res = await fetch(`/api/admin/login-logs?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "加载登录日志失败")
        setLogs([])
        setTotal(0)
      } else {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error("加载登录日志失败:", e)
      setError("加载登录日志失败")
    } finally {
      setLoading(false)
    }
  }, [filter, offset])

  useEffect(() => {
    // 用 setTimeout 把数据加载移出 effect 同步阶段，避免 react-hooks/set-state-in-effect 报错
    const timer = setTimeout(() => {
      loadLogs()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadLogs])

  // 切换筛选条件时回到第一页
  const handleFilterChange = (next: "all" | "success" | "fail") => {
    setFilter(next)
    setOffset(0)
  }

  const handlePurge = async () => {
    if (!window.confirm("确定清理 90 天前的登录日志吗？该操作不可恢复。")) return
    setPurging(true)
    try {
      const res = await fetch("/api/admin/login-logs?days=90", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "清理失败")
      } else {
        alert(`已清理 ${data.deleted} 条记录`)
        await loadLogs()
      }
    } catch {
      alert("清理失败")
    } finally {
      setPurging(false)
    }
  }

  const filtered = logs.filter((l) =>
    search ? (l.username || "").toLowerCase().includes(search.toLowerCase()) : true
  )
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const statusBadge = (l: LoginLogItem) => {
    if (l.success) {
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">成功</span>
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        {l.reason ? REASON_LABEL[l.reason] || l.reason : "失败"}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">登录日志</h1>
            <p className="text-sm text-gray-500 mt-1">
              记录所有登录尝试（含失败），用于识别异常登录与爆破行为。IP 默认打码，属个人信息请妥善保管。
            </p>
          </div>
          <button
            onClick={handlePurge}
            disabled={purging}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            {purging ? "清理中..." : "清理 90 天前"}
          </button>
        </div>

        {/* 筛选与搜索 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(["all", "success", "fail"] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "全部" : f === "success" ? "成功" : "失败"}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户名..."
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showFullIp}
              onChange={(e) => setShowFullIp(e.target.checked)}
              className="rounded"
            />
            显示完整 IP
          </label>
          <span className="text-sm text-gray-500">共 {total} 条</span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {/* 表格 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-left">
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">用户名</th>
                <th className="px-4 py-3 font-medium">结果</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">设备</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    暂无登录日志
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {l.username || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">{statusBadge(l)}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {showFullIp ? (l.ip || "-") : maskIp(l.ip)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {describeUserAgent(l.userAgent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页
            </span>
            <button
              onClick={() => setOffset(Math.min((totalPages - 1) * PAGE_SIZE, offset + PAGE_SIZE))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
