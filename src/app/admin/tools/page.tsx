"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDateTime } from "@/utils/dateFormat"
import AdminLayout from "@/components/AdminLayout"

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
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">管理工具</h2>
          <p className="text-sm text-gray-500 mt-1">系统管理工具和用户管理</p>
        </div>

        {message && (
          <div className={`border rounded-lg px-4 py-3 ${
            message.includes("成功") || message.includes("已")
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">用户列表</h3>
              <span className="text-sm text-gray-500">共 {users.length} 人</span>
            </div>
            {loading ? (
              <div className="text-gray-500 text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-gray-300 border-t-indigo-600"></div>
                <p className="mt-2">加载中...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                        <td className="px-4 py-3 text-gray-600">{user.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? '管理员' : '用户'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDateTime(user.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create/Update User Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">创建或更新用户</h3>
            <form onSubmit={createOrUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名 *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="例如: admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码 *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="例如: admin123"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="例如: 管理员"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {username ? "更新用户" : "创建用户"}
              </button>
            </form>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">💡 使用提示</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 如果用户名已存在，将更新该用户的信息</li>
            <li>• 建议使用强密码，包含字母、数字和特殊字符</li>
            <li>• 管理员拥有系统所有权限</li>
            <li>• 使用左侧菜单快速导航到其他管理页面</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}
