"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

interface User {
  id: string
  username: string
  name: string
  equipment: string | null
  antenna: string | null
  qth: string | null
  role: string
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Form state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    equipment: "",
    antenna: "",
    qth: "",
    role: "user",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    equipment: "",
    antenna: "",
    qth: "",
    role: "user",
  })
  const [passwordFormData, setPasswordFormData] = useState({
    userId: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    if (user.role !== "admin") {
      router.push("/")
      return
    }
    setCurrentUser(user)
    loadUsers()
  }, [router])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      setUsers(data.users || [])
      setLoading(false)
    } catch (error) {
      console.error("Load users error:", error)
      setLoading(false)
    }
  }

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.name.toLowerCase().includes(query) ||
          (user.qth && user.qth.toLowerCase().includes(query)) ||
          (user.equipment && user.equipment.toLowerCase().includes(query))
      )
    }

    // Filter by role
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === "username") {
        comparison = a.username.localeCompare(b.username)
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === "role") {
        comparison = a.role.localeCompare(b.role)
      } else if (sortBy === "createdAt") {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [users, searchQuery, roleFilter, sortBy, sortOrder])

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++
    return strength
  }

  const getStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
        return "bg-gray-200"
      case 1:
        return "bg-red-500"
      case 2:
        return "bg-yellow-500"
      case 3:
        return "bg-blue-500"
      case 4:
        return "bg-green-500"
      default:
        return "bg-gray-200"
    }
  }

  const getStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
        return "无"
      case 1:
        return "弱"
      case 2:
        return "一般"
      case 3:
        return "强"
      case 4:
        return "很强"
      default:
        return "无"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.password) {
      alert("请输入密码")
      return
    }

    const strength = getPasswordStrength(formData.password)
    if (strength < 2) {
      if (!confirm("密码强度较弱，是否继续？")) {
        return
      }
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("创建失败")
      }

      alert("用户已创建")
      setShowCreateModal(false)
      loadUsers()
      resetForm()
    } catch (error) {
      console.error("Create user error:", error)
      alert("创建失败")
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      name: user.name,
      equipment: user.equipment || "",
      antenna: user.antenna || "",
      qth: user.qth || "",
      role: user.role,
    })
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此用户吗？此操作不可恢复！")) {
      return
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("删除失败")
      }

      alert("用户已删除")
      loadUsers()
    } catch (error) {
      console.error("Delete user error:", error)
      alert("删除失败")
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      alert("两次输入的密码不一致")
      return
    }

    const strength = getPasswordStrength(passwordFormData.newPassword)
    if (strength < 2) {
      if (!confirm("密码强度较弱，是否继续？")) {
        return
      }
    }

    try {
      const response = await fetch(`/api/users/${passwordFormData.userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordFormData.newPassword,
        }),
      })

      if (!response.ok) {
        throw new Error("修改密码失败")
      }

      alert("密码已修改")
      setShowPasswordModal(false)
      setPasswordFormData({ userId: "", newPassword: "", confirmPassword: "" })
    } catch (error) {
      console.error("Change password error:", error)
      alert("修改密码失败")
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
    setSelectAll(newSelected.size === filteredAndSortedUsers.length)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredAndSortedUsers.map((u) => u.id)))
    }
    setSelectAll(!selectAll)
  }

  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) {
      alert("请先选择用户")
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedUsers.size} 个用户吗？此操作不可恢复！`)) {
      return
    }

    try {
      for (const userId of selectedUsers) {
        const response = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          throw new Error(`删除用户 ${userId} 失败`)
        }
      }

      alert(`成功删除 ${selectedUsers.size} 个用户`)
      setSelectedUsers(new Set())
      setSelectAll(false)
      loadUsers()
    } catch (error) {
      console.error("Batch delete error:", error)
      alert("批量删除失败")
    }
  }

  const handleBatchRoleChange = async (newRole: string) => {
    if (selectedUsers.size === 0) {
      alert("请先选择用户")
      return
    }

    if (
      !confirm(`确定要将选中的 ${selectedUsers.size} 个用户更改为${newRole === "admin" ? "管理员" : "主控"}吗？`)
    ) {
      return
    }

    try {
      for (const userId of selectedUsers) {
        const response = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        })
        if (!response.ok) {
          throw new Error(`更新用户 ${userId} 失败`)
        }
      }

      alert(`成功更新 ${selectedUsers.size} 个用户`)
      setSelectedUsers(new Set())
      setSelectAll(false)
      loadUsers()
    } catch (error) {
      console.error("Batch role change error:", error)
      alert("批量修改角色失败")
    }
  }

  const handleExportUsers = () => {
    const data = filteredAndSortedUsers.map((user) => ({
      用户名: user.username,
      姓名: user.name,
      角色: user.role === "admin" ? "管理员" : "主控",
      设备: user.equipment || "",
      天线: user.antenna || "",
      QTH: user.qth || "",
      创建时间: new Date(user.createdAt).toLocaleString("zh-CN"),
    }))

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).map((v) => `"${v}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `用户列表_${new Date().toLocaleDateString("zh-CN")}.csv`
    link.click()
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      equipment: "",
      antenna: "",
      qth: "",
      role: "user",
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser) {
      return
    }

    try {
      const updateData = {
        name: editFormData.name,
        equipment: editFormData.equipment,
        antenna: editFormData.antenna,
        qth: editFormData.qth,
        role: editFormData.role,
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error("更新失败")
      }

      alert("用户已更新")
      loadUsers()
      setShowEditModal(false)
      setEditingUser(null)
    } catch (error) {
      console.error("Update user error:", error)
      alert("更新失败")
    }
  }

  const openDetailModal = (user: User) => {
    setDetailUser(user)
    setShowDetailModal(true)
  }

  const openPasswordModal = (user: User) => {
    setPasswordFormData({ userId: user.id, newPassword: "", confirmPassword: "" })
    setShowPasswordModal(true)
  }

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
            <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              总用户数: {users.length} | 已筛选: {filteredAndSortedUsers.length}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加新用户
            </button>
            <button
              onClick={handleExportUsers}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出CSV
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* User List */}
          <div className="space-y-4">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      placeholder="搜索用户名、姓名、设备、QTH..."
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  >
                    <option value="all">所有角色</option>
                    <option value="admin">管理员</option>
                    <option value="user">主控</option>
                  </select>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [sort, order] = e.target.value.split("-")
                      setSortBy(sort)
                      setSortOrder(order as "asc" | "desc")
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  >
                    <option value="createdAt-desc">创建时间 ↓</option>
                    <option value="createdAt-asc">创建时间 ↑</option>
                    <option value="username-asc">用户名 A-Z</option>
                    <option value="username-desc">用户名 Z-A</option>
                    <option value="name-asc">姓名 A-Z</option>
                    <option value="name-desc">姓名 Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Batch Operations */}
            {selectedUsers.size > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-indigo-900">
                      已选择 {selectedUsers.size} 个用户
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBatchRoleChange("admin")}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      设为管理员
                    </button>
                    <button
                      onClick={() => handleBatchRoleChange("user")}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      设为主控
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      批量删除
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUsers(new Set())
                        setSelectAll(false)
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      取消选择
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* User List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        姓名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        角色
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        设备
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QTH
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="mt-2 text-sm">没有找到用户</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{user.name}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {user.role === "admin" ? "管理员" : "主控"}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.equipment || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.qth || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openDetailModal(user)}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                title="查看详情"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEdit(user)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="编辑"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openPasswordModal(user)}
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                                title="修改密码"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </button>
                              {user.username !== "admin" && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="删除"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">修改密码</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码 *
                </label>
                <input
                  type="password"
                  value={passwordFormData.newPassword}
                  onChange={(e) =>
                    setPasswordFormData({
                      ...passwordFormData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  required
                />
                {passwordFormData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthColor(
                            getPasswordStrength(passwordFormData.newPassword)
                          )}`}
                          style={{
                            width: `${(getPasswordStrength(passwordFormData.newPassword) / 4) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {getStrengthText(getPasswordStrength(passwordFormData.newPassword))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认密码 *
                </label>
                <input
                  type="password"
                  value={passwordFormData.confirmPassword}
                  onChange={(e) =>
                    setPasswordFormData({
                      ...passwordFormData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  修改
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordFormData({
                      userId: "",
                      newPassword: "",
                      confirmPassword: "",
                    })
                  }}
                  className="flex-1 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetailModal && detailUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">用户详情</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setDetailUser(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {detailUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{detailUser.name}</h4>
                  <p className="text-sm text-gray-500">@{detailUser.username}</p>
                  <span
                    className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${
                      detailUser.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {detailUser.role === "admin" ? "管理员" : "主控"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">用户名</label>
                  <p className="mt-1 text-sm text-gray-900">{detailUser.username}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">姓名</label>
                  <p className="mt-1 text-sm text-gray-900">{detailUser.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">设备</label>
                  <p className="mt-1 text-sm text-gray-900">{detailUser.equipment || "-"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">天线</label>
                  <p className="mt-1 text-sm text-gray-900">{detailUser.antenna || "-"}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase">QTH</label>
                  <p className="mt-1 text-sm text-gray-900">{detailUser.qth || "-"}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">注册时间</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(detailUser.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">用户ID</label>
                  <p className="mt-1 text-sm text-gray-900">{detailUser.id}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setDetailUser(null)
                  handleEdit(detailUser)
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                编辑
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  openPasswordModal(detailUser)
                }}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                修改密码
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">添加新用户</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  required
                  placeholder="输入用户名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  required
                  placeholder="输入密码"
                />
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthColor(
                            getPasswordStrength(formData.password)
                          )}`}
                          style={{
                            width: `${(getPasswordStrength(formData.password) / 4) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {getStrengthText(getPasswordStrength(formData.password))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  required
                  placeholder="输入真实姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备
                </label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="无线电设备型号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  天线
                </label>
                <input
                  type="text"
                  value={formData.antenna}
                  onChange={(e) =>
                    setFormData({ ...formData, antenna: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="天线类型"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QTH
                </label>
                <input
                  type="text"
                  value={formData.qth}
                  onChange={(e) =>
                    setFormData({ ...formData, qth: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="位置信息"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色 *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="user">主控人员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  创建用户
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">编辑用户</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备
                </label>
                <input
                  type="text"
                  value={editFormData.equipment}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, equipment: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  天线
                </label>
                <input
                  type="text"
                  value={editFormData.antenna}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, antenna: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QTH
                </label>
                <input
                  type="text"
                  value={editFormData.qth}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, qth: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色 *
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="user">主控人员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  更新
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
                  className="flex-1 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
