"use client"

import { useState, useEffect } from "react"

export default function DebugPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dbStatus, setDbStatus] = useState<any>(null)

  useEffect(() => {
    // Check database status
    checkDatabaseStatus()
  }, [])

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch("/api/init", { method: "POST" })
      const data = await response.json()
      setDbStatus(data)
    } catch (error) {
      setDbStatus({ error: "无法连接数据库" })
    }
  }

  const testLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/debug/login-check?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: "请求失败" })
    } finally {
      setLoading(false)
    }
  }

  const testRealLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()

      setResult({
        status: response.ok ? "success" : "failed",
        response_status: response.status,
        data: data
      })
    } catch (error) {
      setResult({ error: "请求失败" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">登录诊断工具</h1>

        {/* Database Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">数据库状态</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(dbStatus, null, 2)}
          </pre>
        </div>

        {/* Login Test Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">登录测试</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="例如: admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="例如: admin123"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={testLogin}
                disabled={loading || !username || !password}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                测试登录（诊断）
              </button>
              <button
                onClick={testRealLogin}
                disabled={loading || !username || !password}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                测试真实登录
              </button>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            使用说明
          </h3>
          <ul className="list-disc list-inside text-yellow-800 space-y-1">
            <li>此页面用于诊断登录问题</li>
            <li>输入账号密码后点击"测试登录"查看详细信息</li>
            <li>点击"测试真实登录"模拟实际登录流程</li>
            <li>如果是旧版本系统，不会显示用户详细信息</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
