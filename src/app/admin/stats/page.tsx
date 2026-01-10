"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Session {
  id: string
  controllerName: string
  controllerEquipment: string
  controllerAntenna: string
  controllerQth: string
  sessionTime: string
  recordCount: number
}

interface CallsignStat {
  callsign: string
  count: number
}

interface StatsResponse {
  stats: {
    totalSessions: number
    totalRecords: number
    totalUniqueCallsigns: number
  }
  sessions: Session[]
  callsignStats: CallsignStat[]
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [statsData, setStatsData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "callsigns">("overview")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadStats()
  }, [startDate, endDate])

  const loadStats = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const url = `/api/admin/stats${params.toString() ? `?${params.toString()}` : ""}`
      const response = await fetch(url)
      const data = await response.json()
      setStatsData(data)
    } catch (error) {
      console.error("加载统计信息失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!statsData || statsData.sessions.length === 0) {
      alert("没有可导出的数据")
      return
    }

    // 获取所有会话的详细记录
    const allRecords: any[] = []
    for (const session of statsData.sessions) {
      try {
        const response = await fetch(`/api/admin/stats/session/${session.id}`)
        const data = await response.json()
        const records = data.records || []
        allRecords.push(...records)
      } catch (error) {
        console.error(`Failed to get records for session ${session.id}:`, error)
      }
    }

    // 按时间正序排列（旧到新）
    const sortedRecords = allRecords.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // 创建CSV内容
    const headers = ["序号", "日期", "时间", "呼号", "QTH", "设备", "天线", "功率", "信号", "报告", "备注"]
    const rows = sortedRecords.map((record, index) => {
      const date = record.createdAt ? new Date(record.createdAt).toLocaleDateString("zh-CN") : ""
      const time = record.createdAt ? new Date(record.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) : ""

      return [
        index + 1,
        date,
        time,
        record.callsign,
        record.qth || "",
        record.equipment || "",
        record.antenna || "",
        record.power || "",
        record.signal || "",
        record.report || "",
        record.remarks || "",
      ].map(cell => `"${cell}"`).join(",")
    })

    const csvContent = [
      "台网统计导出",
      `导出时间: ${new Date().toLocaleString("zh-CN")}`,
      `总会话数: ${statsData.stats.totalSessions}`,
      `总记录数: ${sortedRecords.length}`,
      `唯一呼号数: ${statsData.stats.totalUniqueCallsigns}`,
      "",
      ...headers.map(h => `"${h}"`),
      ...rows,
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `台网统计_${new Date().toLocaleDateString("zh-CN")}.csv`
    link.click()
  }

  const filteredSessions = statsData?.sessions.filter(
    (session) =>
      session.controllerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.controllerQth?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredCallsigns = statsData?.callsignStats.filter((stat) =>
    stat.callsign.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">台网信息统计</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回首页
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              导出CSV
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-black mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-black mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={() => {
                setStartDate("")
                setEndDate("")
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              清除筛选
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "overview"
                ? "bg-blue-600 text-white"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "sessions"
                ? "bg-blue-600 text-white"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            台网会话
          </button>
          <button
            onClick={() => setActiveTab("callsigns")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "callsigns"
                ? "bg-blue-600 text-white"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            呼号统计
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-black">加载中...</div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && statsData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-black mb-2">总台网次数</h3>
                  <p className="text-4xl font-bold text-blue-600">
                    {statsData.stats.totalSessions}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-black mb-2">总记录数</h3>
                  <p className="text-4xl font-bold text-green-600">
                    {statsData.stats.totalRecords}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-black mb-2">唯一呼号数</h3>
                  <p className="text-4xl font-bold text-purple-600">
                    {statsData.stats.totalUniqueCallsigns}
                  </p>
                </div>

                {/* Recent Sessions */}
                <div className="bg-white rounded-lg shadow p-6 md:col-span-3">
                  <h3 className="text-lg font-semibold text-black mb-4">最近台网会话</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                            序号
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                            日期
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                            主控
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                            QTH
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                            记录数
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {statsData.sessions.slice(0, 5).map((session, index) => (
                          <tr
                            key={session.id}
                            onClick={() => router.push(`/admin/stats/session/${session.id}`)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-4 py-3 text-sm text-black">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-black">
                              {new Date(session.sessionTime).toLocaleDateString("zh-CN")}
                            </td>
                            <td className="px-4 py-3 text-sm text-black">{session.controllerName}</td>
                            <td className="px-4 py-3 text-sm text-black">{session.controllerQth || "-"}</td>
                            <td className="px-4 py-3 text-sm text-black">{session.recordCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && statsData && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="搜索主控姓名或QTH..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          序号
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          日期
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          主控姓名
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          QTH
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          设备
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          天线
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          记录数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSessions.map((session, index) => (
                        <tr
                          key={session.id}
                          onClick={() => router.push(`/admin/stats/session/${session.id}`)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3 text-sm text-black">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-black">
                            {new Date(session.sessionTime).toLocaleDateString("zh-CN")}
                          </td>
                          <td className="px-4 py-3 text-sm text-black">{session.controllerName}</td>
                          <td className="px-4 py-3 text-sm text-black">{session.controllerQth || "-"}</td>
                          <td className="px-4 py-3 text-sm text-black">{session.controllerEquipment || "-"}</td>
                          <td className="px-4 py-3 text-sm text-black">{session.controllerAntenna || "-"}</td>
                          <td className="px-4 py-3 text-sm text-black">{session.recordCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredSessions.length === 0 && (
                    <div className="text-center py-8 text-black">没有找到匹配的台网会话</div>
                  )}
                </div>
              </div>
            )}

            {/* Callsigns Tab */}
            {activeTab === "callsigns" && statsData && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="搜索呼号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          排名
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          呼号
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                          参与次数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCallsigns.map((stat, index) => (
                        <tr key={stat.callsign} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-black">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-black">{stat.callsign}</td>
                          <td className="px-4 py-3 text-sm text-black">{stat.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCallsigns.length === 0 && (
                    <div className="text-center py-8 text-black">没有找到匹配的呼号</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
