"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDateTime } from "@/utils/dateFormat"

interface User {
  id: string
  username: string
  name: string
  role: string
  created_at: string
}

export default function AdminToolsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("user")
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/debug/users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      setMessage("加载用户列表失败")
    } finally {
      setLoading(false)
    }
  }

  const createOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    try {
      const response = await fetch("/api/debug/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name, role })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || "操作失败")
        return
      }

      setMessage(data.message)
      loadUsers()

      // Clear form
      setUsername("")
      setPassword("")
      setName("")
    } catch (error) {
      setMessage("操作失败")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">管理工具</h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            返回首页
          </button>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => router.push("/admin/page-configs")}
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">页面配置管理</div>
              <div className="text-sm opacity-80">管理网站标题、版本号、联系方式等</div>
            </div>
          </button>
          <button
            onClick={() => router.push("/admin/stats")}
            className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">台网统计</div>
              <div className="text-sm opacity-80">查看历史台网数据和统计信息</div>
            </div>
          </button>
        </div>

        {/* User List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">用户列表</h2>
          {loading ? (
            <div className="text-black">加载中...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">用户名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">姓名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">角色</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-black uppercase">创建时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-2 font-medium text-black">{user.username}</td>
                    <td className="px-4 py-2 text-black">{user.name}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-black">
                      {formatDateTime(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create/Update User Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">创建或更新用户</h2>
          <form onSubmit={createOrUpdateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  用户名 *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="例如: admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  密码 *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="例如: admin123"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="例如: 管理员"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  角色
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700"
            >
              {username ? "更新用户" : "创建用户"}
            </button>
          </form>
        </div>

        {/* Quick Actions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-black mb-2">快捷操作</h3>
          <div className="space-y-2 text-black">
            <p>• 如果 ADMIN 用户不存在，创建一个:</p>
            <pre className="bg-yellow-100 p-2 rounded mt-2 text-sm text-black">
              用户名: ADMIN
              密码: ADMIN123
              角色: admin
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
