"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

interface UpgradeInfo {
  ok: boolean
  checked: boolean
  manifestAvailable: boolean
  currentVersion: string
  versionSource: "database" | "fallback"
  latestVersion?: string
  hasUpdate?: boolean
  title?: string
  summary?: string
  releaseDate?: string | null
  changelog?: string[]
  downloadUrl?: string | null
  detailUrl?: string | null
  minRequired?: string | null
  autoUpdated?: boolean
  message?: string
  manifestError?: string | null
}

export default function UpgradePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [info, setUpgradeInfo] = useState<UpgradeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    setCurrentUser(user)
    if (user.role !== "admin") {
      alert("无权访问此页面")
      router.push("/")
      return
    }
    // 进入页面自动检测一次
    checkUpgrade()
  }, [router])

  const checkUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/upgrade/check")
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "检测失败")
      }
      setUpgradeInfo(data)
    } catch (err: any) {
      setError(err.message || "检测更新时发生错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">版本更新</h2>
            <p className="text-sm text-gray-500 mt-1">
              检测当前程序是否有新版本，并查看更新内容
            </p>
          </div>
          <button
            onClick={checkUpgrade}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {loading ? "检测中..." : "立即检测"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!loading && info && (
          <div className="space-y-4">
            {/* 当前版本状态卡片 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-gray-500">当前版本</p>
                  <p className="text-xl font-bold text-gray-900">v{info.currentVersion}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    来源：{info.versionSource === "database" ? "数据库配置" : "兜底默认值（数据库读取失败）"}
                  </p>
                </div>
                <div className="flex items-center">
                  {info.manifestAvailable && info.latestVersion ? (
                    info.autoUpdated ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        已自动同步版本号
                      </span>
                    ) : info.hasUpdate ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        有新版本可用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        已是最新
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
                      暂无可比对的版本信息
                    </span>
                  )}
                </div>
                {info.manifestAvailable && info.latestVersion && (
                  <div>
                    <p className="text-xs text-gray-500">最新版本</p>
                    <p className="text-xl font-bold text-indigo-600">v{info.latestVersion}</p>
                  </div>
                )}
              </div>

              {info.manifestAvailable && info.latestVersion && info.releaseDate && (
                <p className="text-xs text-gray-400 mt-3">发布日期：{info.releaseDate}</p>
              )}
            </div>

            {/* 新版本详情 */}
            {info.manifestAvailable && info.hasUpdate && (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{info.title}</h3>
                  {info.summary && <p className="text-sm text-gray-600 mt-2">{info.summary}</p>}
                </div>

                {info.changelog && info.changelog.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">更新内容</h4>
                    <ul className="space-y-1.5">
                      {info.changelog.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  {info.downloadUrl && (
                    <a
                      href={info.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                      前往下载 / 查看更新
                    </a>
                  )}
                  {info.detailUrl && info.detailUrl !== info.downloadUrl && (
                    <a
                      href={info.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      查看详细说明
                    </a>
                  )}
                </div>

                <p className="text-xs text-gray-400 pt-1">
                  提示：当前为检测提示模式。如需后台一键在线升级，请在独立服务器（如宝塔 + pm2）环境部署升级脚本后开启。
                </p>
              </div>
            )}

            {/* 已是最新 / 无版本信息 提示 */}
            {(!info.manifestAvailable || !info.hasUpdate) && (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600">
                  {info.message || "当前已是最新版本，无需更新。"}
                </p>
                {info.manifestError && (
                  <p className="text-xs text-gray-400 mt-2">{info.manifestError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 text-sm">正在检测新版本...</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
