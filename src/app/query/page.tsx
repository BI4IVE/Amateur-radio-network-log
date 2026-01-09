"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ParticipationRecord {
  time: string
  sessionId: string
  controllerCallsign: string
}

export default function QueryPage() {
  const router = useRouter()
  const [callsign, setCallsign] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{
    callsign: string
    totalParticipations: number
    participationTimes: ParticipationRecord[]
  } | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResult(null)
    setCurrentPage(1)
    setLoading(true)

    try {
      const response = await fetch(`/api/records/callsign-stats?callsign=${encodeURIComponent(callsign)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "查询失败")
        setLoading(false)
        return
      }

      setResult(data)
    } catch (err) {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const handleBack = () => {
    router.push("/")
  }

  // Calculate pagination
  const totalPages = result ? Math.ceil(result.participationTimes.length / itemsPerPage) : 0
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRecords = result ? result.participationTimes.slice(startIndex, endIndex) : []

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            呼号参与查询
          </h1>
          <button
            onClick={handleBack}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            返回
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">查询呼号参与记录</h2>
          <form onSubmit={handleQuery} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
                placeholder="请输入呼号，例如: BI4KABC"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "查询中..." : "查询"}
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Query Result */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                查询结果：{result.callsign}
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-900 mb-1">
                  {result.totalParticipations}
                </div>
                <div className="text-sm text-blue-700">
                  1年内参与总次数
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                参与时间记录
              </h3>
              {result.participationTimes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无参与记录
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {currentRecords.map((record, index) => (
                      <div
                        key={record.sessionId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {result.totalParticipations - startIndex - index}
                          </div>
                          <div className="flex flex-col">
                            <div className="text-sm text-black">
                              {formatDate(record.time)}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              主控呼号: <span className="font-medium">{record.controllerCallsign}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          会话ID: {record.sessionId.slice(0, 8)}...
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        上一页
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-700">
                          第 {currentPage} / {totalPages} 页
                        </span>
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
