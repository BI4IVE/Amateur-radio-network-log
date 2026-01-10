"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface ParticipationRecord {
  time: string
  sessionId: string
  controllerCallsign: string
}

export default function QueryPage() {
  const router = useRouter()
  const [callsign, setCallsign] = useState("BR4IN")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{
    callsign: string
    totalParticipations: number
    participationTimes: ParticipationRecord[]
  } | null>(null)
  const [showCertificate, setShowCertificate] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const certificateRef = useRef<HTMLDivElement>(null)

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

  const handleGenerateCertificate = async () => {
    if (!result || result.totalParticipations === 0) {
      setError("请先查询呼号记录")
      return
    }
    setShowCertificate(true)
  }

  const downloadCertificate = () => {
    if (!certificateRef.current) return

    // 使用 html2canvas 或直接截图功能
    // 这里使用简单的 window.print() 打印证书
    const originalTitle = document.title
    document.title = `参与证书_${callsign}`
    window.print()
    document.title = originalTitle
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
          <h2 className="text-lg font-semibold mb-4 text-black">查询呼号参与记录</h2>
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
            {result && result.totalParticipations > 0 && (
              <button
                type="button"
                onClick={handleGenerateCertificate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                生成证书
              </button>
            )}
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
              <h3 className="text-lg font-semibold mb-2 text-black">
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
              <h3 className="text-lg font-semibold mb-4 text-black">
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
                              当值主控: <span className="font-medium">{record.controllerCallsign}</span>
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

              {/* Disclaimer */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  以上记录仅供参考如有遗漏实属正常
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Modal */}
        {showCertificate && result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-screen overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-black">参与证书</h3>
                  <button
                    onClick={() => setShowCertificate(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Certificate */}
                <div
                  ref={certificateRef}
                  className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative overflow-hidden"
                  style={{
                    border: "12px double #b45309",
                    borderRadius: "16px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Decorative Corner Borders */}
                  <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-yellow-700 rounded-tl-2xl"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-yellow-700 rounded-tr-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-yellow-700 rounded-bl-2xl"></div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-yellow-700 rounded-br-2xl"></div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 border-4 border-yellow-800 rounded-full"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border-4 border-yellow-800 rounded-full"></div>
                  </div>

                  <div className="relative p-12 text-center">
                    {/* Header */}
                    <div className="space-y-3 mb-8">
                      {/* Icon */}
                      <div className="flex justify-center mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-16 h-16 text-yellow-700"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-5xl font-bold text-yellow-900 tracking-widest" style={{ fontFamily: "Georgia, serif" }}>
                        参与证书
                      </h2>
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-1 bg-yellow-700 w-32"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-700"></div>
                        <div className="h-1 bg-yellow-700 w-32"></div>
                      </div>
                      <p className="text-yellow-800 text-lg tracking-wide">CERTIFICATE OF PARTICIPATION</p>
                    </div>

                    {/* Content */}
                    <div className="space-y-6 mb-8">
                      <p className="text-gray-800 text-xl tracking-wide">
                        特此证明
                      </p>

                      <div
                        className="bg-white rounded-xl shadow-lg p-8 mx-auto max-w-lg border-2 border-yellow-200"
                        style={{
                          boxShadow: "0 8px 32px rgba(180, 83, 9, 0.2)",
                        }}
                      >
                        <h3 className="text-6xl font-bold text-yellow-900 tracking-wider" style={{ fontFamily: "Georgia, serif" }}>
                          {result.callsign.toUpperCase()}
                        </h3>
                      </div>

                      <div className="space-y-3">
                        <p className="text-gray-800 text-lg leading-relaxed">
                          在过去一年中积极参与
                        </p>
                        <p className="text-yellow-900 text-2xl font-semibold tracking-wide">
                          济南黄河业余无线电台网活动
                        </p>
                        <div className="flex items-center justify-center gap-6 py-6">
                          <div className="w-1 h-20 bg-gradient-to-b from-transparent via-yellow-700 to-transparent"></div>
                          <p className="text-8xl font-bold text-yellow-900 tracking-wider" style={{ fontFamily: "Georgia, serif" }}>
                            {result.totalParticipations}
                          </p>
                          <div className="w-1 h-20 bg-gradient-to-b from-transparent via-yellow-700 to-transparent"></div>
                          <p className="text-3xl text-gray-700 font-semibold">次</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-1 bg-yellow-700 w-32"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-700"></div>
                        <div className="h-1 bg-yellow-700 w-32"></div>
                      </div>
                      <div className="flex justify-center items-end gap-16 pt-4">
                        <div className="text-center">
                          <p className="text-gray-700 font-bold text-lg mb-3 tracking-wide">签发机构</p>
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                            <p className="text-yellow-900 font-semibold text-base">济南黄河业余无线电中继台</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-700 font-bold text-lg mb-3 tracking-wide">签发日期</p>
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                            <p className="text-yellow-900 font-semibold text-base">
                              {new Date().toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-4 justify-center">
                  <button
                    onClick={downloadCertificate}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    打印证书
                  </button>
                  <button
                    onClick={() => setShowCertificate(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
