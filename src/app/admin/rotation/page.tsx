"use client"

// @version v1.5.18
import { useEffect, useState } from "react"
import AdminLayout from "@/components/AdminLayout"

interface RotationRow {
  controllerId: string | null
  controllerName: string
  sessionCount: number
  lastSessionAt: string | null
  orphan: boolean
}

interface RotationData {
  ranking: RotationRow[]
  totalSessions: number
  orphanCount: number
}

export default function RotationPage() {
  const [data, setData] = useState<RotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/rotation")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data)
        } else {
          setError(res.message || "加载失败")
        }
      })
      .catch((e) => setError("网络错误: " + e.message))
      .finally(() => setLoading(false))
  }, [])

  const maxCount = data?.ranking.reduce((m, r) => Math.max(m, r.sessionCount), 0) || 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">主控轮值表</h1>
          <p className="mt-1 text-sm text-gray-500">
            按主控聚合台网场次，鼓励轮值。标 <span className="text-amber-600">⚠</span> 表示主控账号已不存在（历史数据孤儿）。
          </p>
        </div>

        {loading && <p className="text-gray-500">加载中…</p>}
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label="台网总场次" value={data.totalSessions} />
              <StatCard label="主控人数" value={data.ranking.length} />
              <StatCard label="孤儿场次" value={data.orphanCount} highlight={data.orphanCount > 0} />
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">排名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">主控</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">场次</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">最近主持</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">分布</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.ranking.map((row, idx) => (
                    <tr key={row.controllerId || `orphan-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="font-medium">{row.controllerName}</span>
                        {row.orphan && <span className="ml-1 text-amber-600" title="主控账号已不存在">⚠</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.sessionCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {row.lastSessionAt ? new Date(row.lastSessionAt).toLocaleString("zh-CN") : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-40 rounded bg-gray-100">
                            <div
                              className="h-2.5 rounded bg-blue-500"
                              style={{ width: `${maxCount ? (row.sessionCount / maxCount) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{maxCount ? Math.round((row.sessionCount / maxCount) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.ranking.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">暂无台网记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-amber-600" : "text-gray-900"}`}>{value}</p>
    </div>
  )
}
