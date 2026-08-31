// @version v1.5.19
"use client"

// [v1.5.10] 强制动态渲染，避免静态预渲染被 CDN/浏览器强缓存导致后台配置修改后证书不更新
export const dynamic = "force-dynamic"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { formatDateTime } from "@/utils/dateFormat"
import { useCertConfig } from "./certConfig"

interface ParticipationRecord {
  time: string
  sessionId: string
  controllerCallsign: string
}

// [新增] 证书绘制为图片的 canvas 辅助函数（不依赖第三方库，规避 Tailwind v4 oklch 与 html2canvas 的兼容问题）
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: string) {
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerR)
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerR
    let y = cy + Math.sin(rot) * outerR
    ctx.lineTo(x, y); rot += step
    x = cx + Math.cos(rot) * innerR
    y = cy + Math.sin(rot) * innerR
    ctx.lineTo(x, y); rot += step
  }
  ctx.lineTo(cx, cy - outerR)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawDivider(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
}

function drawField(ctx: CanvasRenderingContext2D, centerX: number, label: string, value: string, cjk: string) {
  ctx.textAlign = "center"
  ctx.fillStyle = "#374151"
  ctx.font = `bold 20px ${cjk}`
  ctx.fillText(label, centerX, 1060)
  const bw = 240, bh = 64, bx = centerX - bw / 2, by = 1080
  roundRect(ctx, bx, by, bw, bh, 12)
  ctx.fillStyle = "#fffbeb"; ctx.fill()
  ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = "#78350f"; ctx.font = `bold 18px ${cjk}`
  const v = value.length > 16 ? value.slice(0, 15) + "…" : value
  ctx.fillText(v, centerX, by + 40)
}

export default function QueryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serverCert = useCertConfig()

  // [v1.5.10] 优先用服务端直读的配置初始化，再用客户端 fetch 兜底覆盖，避免客户端 JS 缓存导致配置不生效
  const [certSignUnit, setCertSignUnit] = useState(serverCert.certSignUnit)
  const [certSignOrg, setCertSignOrg] = useState(serverCert.certSignOrg)

  const [callsign, setCallsign] = useState("BR4IN")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{
    callsign: string
    totalParticipations: number
    participationTimes: ParticipationRecord[]
  } | null>(null)
  const [showCertificate, setShowCertificate] = useState(false)

  useEffect(() => {
    const loadCertConfig = async () => {
      try {
        // [v1.5.10] 加时间戳 + no-store，避免浏览器/中间层缓存导致后台配置修改后证书不更新
        const res = await fetch(`/api/page-configs?t=${Date.now()}`, { cache: "no-store" })
        const data = await res.json()
        const map = (data.configs as Record<string, string>) || {}
        if (map.cert_sign_unit) setCertSignUnit(map.cert_sign_unit)
        if (map.cert_sign_org) setCertSignOrg(map.cert_sign_org)
      } catch {
        // 忽略：使用兜底默认值
      }
    }
    loadCertConfig()
  }, [])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const certificateRef = useRef<HTMLDivElement>(null)

  // 显式传入呼号，供表单提交与外部跳转（数据看板排行点击）复用，
  // 避免依赖 setState 后的 state（异步更新会读到旧值）
  const runQuery = async (cs: string) => {
    const target = (cs || "").trim().toUpperCase()
    if (!target) return
    setError("")
    setResult(null)
    setCurrentPage(1)
    setLoading(true)

    try {
      const response = await fetch(`/api/records/callsign-stats?callsign=${encodeURIComponent(target)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "查询失败")
        setLoading(false)
        return
      }

      // [v1.5.10] 参与记录按日期降序（最近参与在前）
      if (Array.isArray(data.participationTimes)) {
        data.participationTimes.sort(
          (a: ParticipationRecord, b: ParticipationRecord) =>
            new Date(b.time).getTime() - new Date(a.time).getTime()
        )
      }

      setResult(data)
    } catch (err) {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    await runQuery(callsign)
  }

  // 支持 /query?callsign=XXX 直达（数据看板「呼号活跃排行」点击跳转），进入即自动查询
  useEffect(() => {
    const cs = searchParams.get("callsign")
    if (!cs) return
    const target = cs.trim().toUpperCase()
    setCallsign(target)
    runQuery(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // [新增] 将证书绘制为 PNG 图片并下载（纯 canvas，无需第三方库）
  const saveCertificateAsImage = () => {
    if (!result) return
    const callsignText = result.callsign.toUpperCase()
    const W = 1000
    const H = 1414
    const scale = 2
    const canvas = document.createElement("canvas")
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(scale, scale)

    const cjk = '"Microsoft YaHei", "SimHei", "SimSun", sans-serif'
    const serifCJK = 'Georgia, "Microsoft YaHei", "SimSun", serif'

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, "#fffbeb")
    grad.addColorStop(0.5, "#fefce8")
    grad.addColorStop(1, "#ffedd5")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // 背景装饰圆圈
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.strokeStyle = "#92400e"
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(W * 0.25, H * 0.25, 160, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(W * 0.75, H * 0.75, 120, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()

    // 外双线边框
    ctx.strokeStyle = "#b45309"
    ctx.lineWidth = 10
    ctx.strokeRect(10, 10, W - 20, H - 20)
    ctx.lineWidth = 2
    ctx.strokeRect(24, 24, W - 48, H - 48)

    // 四角装饰 L 形
    ctx.strokeStyle = "#b45309"
    ctx.lineWidth = 4
    const m = 30, L = 90
    ctx.beginPath(); ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W - m - L, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + L); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(m, H - m - L); ctx.lineTo(m, H - m); ctx.lineTo(m + L, H - m); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W - m - L, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - L); ctx.stroke()

    ctx.textAlign = "center"

    // 星星图标
    drawStar(ctx, W / 2, 150, 5, 34, 16, "#b45309")

    // 标题
    ctx.fillStyle = "#78350f"
    ctx.font = `bold 64px ${serifCJK}`
    ctx.fillText("参与证书", W / 2, 262)

    // 分隔线 + 圆点
    drawDivider(ctx, W / 2 - 130, 302, W / 2 + 130, "#b45309")
    ctx.fillStyle = "#b45309"
    ctx.beginPath(); ctx.arc(W / 2, 302, 6, 0, Math.PI * 2); ctx.fill()

    // 英文副标题
    ctx.fillStyle = "#b45309"
    ctx.font = `24px ${cjk}`
    ctx.fillText("CERTIFICATE OF PARTICIPATION", W / 2, 342)

    // 正文
    ctx.fillStyle = "#374151"
    ctx.font = `24px ${cjk}`
    ctx.fillText("特此证明", W / 2, 422)

    // 呼号框
    const boxW = 520, boxH = 120, boxX = (W - boxW) / 2, boxY = 452
    roundRect(ctx, boxX, boxY, boxW, boxH, 16)
    ctx.fillStyle = "#ffffff"; ctx.fill()
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.stroke()
    ctx.fillStyle = "#78350f"
    ctx.font = `bold 58px ${serifCJK}`
    ctx.fillText(callsignText, W / 2, boxY + 78)

    // 参与单位
    ctx.fillStyle = "#374151"; ctx.font = `22px ${cjk}`
    ctx.fillText("在过去一年中积极参与", W / 2, 642)
    ctx.fillStyle = "#78350f"; ctx.font = `bold 30px ${cjk}`
    ctx.fillText(certSignUnit, W / 2, 690)

    // 大次数
    ctx.strokeStyle = "#b45309"
    ctx.lineWidth = 2
    ctx.fillRect(W / 2 - 130, 732, 2, 86)
    ctx.fillRect(W / 2 + 128, 732, 2, 86)
    ctx.fillStyle = "#78350f"
    ctx.font = `bold 100px ${serifCJK}`
    const numStr = String(result.totalParticipations)
    const numW = ctx.measureText(numStr).width
    ctx.fillText(numStr, W / 2, 820)
    ctx.fillStyle = "#374151"; ctx.font = `bold 34px ${cjk}`
    ctx.fillText("次", W / 2 + numW / 2 + 45, 820)

    // 底部分隔
    drawDivider(ctx, W / 2 - 130, 982, W / 2 + 130, "#b45309")
    ctx.fillStyle = "#b45309"
    ctx.beginPath(); ctx.arc(W / 2, 982, 6, 0, Math.PI * 2); ctx.fill()

    // 页脚两栏
    drawField(ctx, W / 2 - 200, "签发机构", certSignOrg, cjk)
    drawField(ctx, W / 2 + 200, "签发日期", formatDateTime(new Date().toISOString()), cjk)

    // 导出下载
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `参与证书_${callsignText}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, "image/png")
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
                              {formatDateTime(record.time)}
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
                          {certSignUnit}
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
                            <p className="text-yellow-900 font-semibold text-base">{certSignOrg}</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-700 font-bold text-lg mb-3 tracking-wide">签发日期</p>
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                            <p className="text-yellow-900 font-semibold text-base">
                              {formatDateTime(new Date().toISOString())}
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
                    onClick={saveCertificateAsImage}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    保存证书
                  </button>
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
