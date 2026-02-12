"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatTime, formatDate, formatDateTime } from "@/utils/dateFormat"
import AdminLayout from "@/components/AdminLayout"

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
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // 获取当前用户
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      setCurrentUser(user)
    }
    loadStats()
  }, [startDate, endDate])

  const loadStats = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      // 如果不是管理员，只显示自己作为主控的会话
      if (currentUser && currentUser.role !== "admin") {
        params.append("controllerId", currentUser.id)
      }

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
      const date = formatDate(record.createdAt)
      const time = formatTime(record.createdAt)

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
      `导出时间: ${formatDateTime(new Date().toISOString())}`,
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
    link.download = `台网统计_${formatDate(new Date().toISOString())}.csv`
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">台网信息统计</h2>
            <p className="text-sm text-gray-500 mt-1">
              {startDate && endDate
                ? `${startDate} 至 ${endDate} 的数据`
                : "全部历史数据"}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={!statsData || statsData.sessions.length === 0}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出CSV
          </button>
        </div>

        {/* Stats Overview Cards */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">总会话数</p>
                  <p className="text-3xl font-bold mt-2">{statsData.stats.totalSessions}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">总记录数</p>
                  <p className="text-3xl font-bold mt-2">{statsData.stats.totalRecords}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm font-medium">唯一呼号数</p>
                  <p className="text-3xl font-bold mt-2">{statsData.stats.totalUniqueCallsigns}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setStartDate("")
                setEndDate("")
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              清除筛选
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                概览
              </button>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "sessions"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                会话列表 ({statsData?.sessions.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("callsigns")}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "callsigns"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                呼号统计 ({statsData?.callsignStats.length || 0})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && statsData && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">最近会话</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">主控</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">记录数</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statsData.sessions.slice(0, 5).map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(session.sessionTime)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {session.controllerName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {session.recordCount}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => router.push(`/admin/stats/session/${session.id}`)}
                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                              >
                                查看
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">活跃呼号（前10）</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {statsData.callsignStats.slice(0, 10).map((stat, index) => (
                      <div
                        key={stat.callsign}
                        className="bg-gray-50 rounded-lg p-4 text-center"
                      >
                        <div className="text-2xl font-bold text-indigo-600">
                          #{index + 1}
                        </div>
                        <div className="text-lg font-semibold text-gray-900 mt-1">
                          {stat.callsign}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stat.count} 次呼叫
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <div>
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索主控名称或QTH..."
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">主控</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QTH</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">记录数</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(session.sessionTime)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {session.controllerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {session.controllerEquipment || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {session.controllerQth || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {session.recordCount}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => router.push(`/admin/stats/session/${session.id}`)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Callsigns Tab */}
            {activeTab === "callsigns" && (
              <div>
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索呼号..."
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">呼号</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">呼叫次数</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCallsigns.map((stat, index) => (
                        <tr key={stat.callsign} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              index === 0 ? "bg-yellow-100 text-yellow-800" :
                              index === 1 ? "bg-gray-100 text-gray-800" :
                              index === 2 ? "bg-orange-100 text-orange-800" :
                              "bg-gray-50 text-gray-600"
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {stat.callsign}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {stat.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
