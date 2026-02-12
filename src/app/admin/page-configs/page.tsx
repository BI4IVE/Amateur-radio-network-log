"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

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
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-black">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black">页面配置管理</h1>
              <p className="text-gray-600 mt-2">
                管理网站各页面的标题、版本号、联系信息等配置
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                返回
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存所有配置"}
              </button>
            </div>
          </div>
        </div>

        {/* Configs by Category */}
        {categories.map(category => (
          <div key={category} className="bg-white rounded-lg shadow mb-6">
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category ? "" : category
              )}
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50"
            >
              <h2 className="text-xl font-semibold text-black">
                {getCategoryName(category)}
              </h2>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-5 h-5 text-gray-600 transition-transform ${
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
              <div className="px-6 pb-6 space-y-4">
                {configs
                  .filter(config => config.category === category)
                  .map(config => (
                    <div
                      key={config.key}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-black">{config.description}</h3>
                          <p className="text-sm text-gray-500">配置键: {config.key}</p>
                        </div>
                        {editingKey !== config.key && (
                          <button
                            onClick={() => handleEdit(config)}
                            className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                          >
                            编辑
                          </button>
                        )}
                      </div>

                      {editingKey === config.key ? (
                        <div className="space-y-2">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(config.key)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              确定
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded p-3 text-black">
                          {config.value || "（未设置）"}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-2">
                        最后更新: {new Date(config.updatedAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
