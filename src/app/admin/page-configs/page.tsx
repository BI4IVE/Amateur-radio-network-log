"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

interface PageConfig {
  id: string
  key: string
  value: string
  category: string
  description: string
  updatedAt: string
}

export default function PageConfigsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [configs, setConfigs] = useState<PageConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string>("general")

  // 编辑状态
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    // 检查权限
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

    loadConfigs()
  }, [router])

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/page-configs")
      const data = await response.json()
      setConfigs(data.configs || [])
    } catch (error) {
      console.error("Load configs error:", error)
      alert("加载配置失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/page-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      })

      if (!response.ok) {
        throw new Error("保存失败")
      }

      alert("配置已保存")
      loadConfigs()
    } catch (error) {
      console.error("Save configs error:", error)
      alert("保存配置失败")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (config: PageConfig) => {
    setEditingKey(config.key)
    setEditValue(config.value)
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue("")
  }

  const handleUpdate = (key: string) => {
    const updatedConfigs = configs.map(config =>
      config.key === key ? { ...config, value: editValue } : config
    )
    setConfigs(updatedConfigs)
    setEditingKey(null)
    setEditValue("")
  }

  const categories = Array.from(new Set(configs.map(c => c.category)))

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
            <h2 className="text-2xl font-bold text-gray-900">页面配置管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              管理网站各页面的标题、版本号、联系信息等配置
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                保存中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                保存所有配置
              </span>
            )}
          </button>
        </div>

        {/* Configs by Category */}
        {categories.map(category => (
          <div key={category} className="bg-white rounded-lg shadow">
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category ? "" : category
              )}
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getCategoryName(category)}
                </h3>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  expandedCategory === category ? "rotate-180" : ""
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            {expandedCategory === category && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t border-gray-100">
                {configs
                  .filter(config => config.category === category)
                  .map(config => (
                    <div
                      key={config.key}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{config.description}</h4>
                          <p className="text-xs text-gray-500 mt-1">配置键: {config.key}</p>
                        </div>
                        {editingKey !== config.key && (
                          <button
                            onClick={() => handleEdit(config)}
                            className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                          >
                            编辑
                          </button>
                        )}
                      </div>

                      {editingKey === config.key ? (
                        <div className="space-y-3">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(config.key)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              确定
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm">
                          {config.value || <span className="text-gray-400">（未设置）</span>}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-3">
                        最后更新: {new Date(config.updatedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    general: "通用配置",
    login: "登录页配置",
    home: "首页配置",
    session: "会话详情页配置",
  }
  return names[category] || category
}
