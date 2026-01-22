"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user && user.username) {
          router.push("/")
        } else {
          // Invalid user data, clear it
          localStorage.removeItem("user")
        }
      }
    } catch (error) {
      // Invalid JSON in localStorage, clear it
      localStorage.removeItem("user")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("Attempting login with:", { username, password })

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      console.log("Login response status:", response.status)

      const data = await response.json()
      console.log("Login response data:", data)

      if (!response.ok) {
        setError(data.error || "登录失败")
        setLoading(false)
        return
      }

      // Store user in localStorage
      try {
        localStorage.setItem("user", JSON.stringify(data.user))
        console.log("User stored in localStorage:", data.user)
      } catch (storageError) {
        console.error("Failed to store user in localStorage:", storageError)
        setError("无法保存登录信息，请检查浏览器设置")
        setLoading(false)
        return
      }

      // Reset loading state
      setLoading(false)

      // Redirect to home
      console.log("Redirecting to home...")
      router.push("/")
    } catch (err) {
      console.error("Login error:", err)
      setError("网络错误，请重试")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              济南黄河业余无线电台网主控日志
            </h1>
            <p className="text-gray-600">登录系统</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-black"
                placeholder="请输入用户名（不区分大小写）"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-black"
                placeholder="请输入密码（不区分大小写）"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
