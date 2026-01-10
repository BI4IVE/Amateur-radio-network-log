"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

interface Session {
  id: string
  controllerId: string
  controllerName: string
  controllerEquipment: string | null
  controllerAntenna: string | null
  controllerQth: string | null
  sessionTime: string
  createdAt: string
}

interface LogRecord {
  id: string
  callsign: string
  qth: string | null
  equipment: string | null
  antenna: string | null
  power: string | null
  signal: string | null
  report: string | null
  remarks: string | null
  createdAt: string
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [records, setRecords] = useState<LogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // 获取当前用户
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      setCurrentUser(user)
    }
    loadSessionDetails()
  }, [sessionId])

  const loadSessionDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/stats/session/${sessionId}`)
      if (!response.ok) {
        throw new Error("获取会话详情失败")
      }
      const data = await response.json()
      setSession(data.session)
      setRecords(data.records || [])

      // 权限检查：如果不是管理员，检查会话是否属于当前用户
      if (currentUser && currentUser.role !== "admin") {
        if (data.session && data.session.controllerId && data.session.controllerId !== currentUser.id) {
          alert("无权访问此会话详情")
          router.back()
          return
        }
      }
    } catch (error) {
      console.error("Load session details error:", error)
      alert("加载会话详情失败")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!session || records.length === 0) {
      alert("没有可导出的数据")
      return
    }

    // 按时间正序排列（旧到新）
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const headers = ["序号", "呼号", "QTH", "设备", "天馈", "功率", "信号", "报告", "备注", "时间"]
    const rows = sortedRecords.map((record, index) => [
      index + 1,
      record.callsign,
      record.qth || "",
      record.equipment || "",
      record.antenna || "",
      record.power || "",
      record.signal || "",
      record.report || "",
      record.remarks || "",
      record.createdAt ? new Date(record.createdAt).toLocaleString("zh-CN") : "",
    ])

    const csvContent = [
      `台网会话详情 - ${session.controllerName}`,
      `会话时间: ${new Date(session.sessionTime).toLocaleString("zh-CN")}`,
      `QTH: ${session.controllerQth || "-"}`,
      `设备: ${session.controllerEquipment || "-"}`,
      `天线: ${session.controllerAntenna || "-"}`,
      "",
      ...headers.map(h => `"${h}"`),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `台网记录_${session.controllerName}_${new Date(session.sessionTime).toLocaleDateString("zh-CN")}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-black">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">台网会话详情</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              导出CSV
            </button>
          </div>
        </div>

        {session && (
          <>
            {/* Session Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-black">会话信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    主控
                  </label>
                  <div className="text-black font-medium">{session.controllerName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    会话时间
                  </label>
                  <div className="text-black">
                    {new Date(session.sessionTime).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    QTH
                  </label>
                  <div className="text-black">{session.controllerQth || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    设备
                  </label>
                  <div className="text-black">{session.controllerEquipment || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    天线
                  </label>
                  <div className="text-black">{session.controllerAntenna || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    记录数
                  </label>
                  <div className="text-black font-medium">{records.length} 条</div>
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-indigo-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-black">
                  台网记录列表 ({records.length}条)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        序号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        呼号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        时间
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        QTH
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        设备
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        天馈
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        功率
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        信号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        报告
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">
                        备注
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-black">
                          暂无记录
                        </td>
                      </tr>
                    ) : (
                      [...records].reverse().map((record, index) => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {records.length - index}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-black">
                            {record.callsign}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.createdAt
                              ? new Date(record.createdAt).toLocaleTimeString("zh-CN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.qth || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.equipment || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.antenna || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.power || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-black">
                            {record.signal || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-black max-w-xs truncate">
                            {record.report || "-"}
                          </td>
                          <td className="px-4 py-2 text-sm text-black max-w-xs truncate">
                            {record.remarks || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
