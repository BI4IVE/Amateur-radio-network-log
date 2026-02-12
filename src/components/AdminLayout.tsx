"use client"

import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useState, useEffect } from "react"

interface AdminLayoutProps {
  children: ReactNode
}

interface MenuItem {
  id: string
  label: string
  path: string
  icon: ReactNode
  requiredRole?: "admin" | "user"
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const menuItems: MenuItem[] = [
    {
      id: "stats",
      label: "台网统计",
      path: "/admin/stats",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      requiredRole: "user",
    },
    {
      id: "tools",
      label: "管理工具",
      path: "/admin/tools",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      requiredRole: "admin",
    },
    {
      id: "users",
      label: "用户管理",
      path: "/admin",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      requiredRole: "admin",
    },
    {
      id: "page-configs",
      label: "页面配置",
      path: "/admin/page-configs",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      requiredRole: "admin",
    },
  ]

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }

    const user = JSON.parse(userStr)
    setCurrentUser(user)

    // 检查用户是否有权限访问当前页面
    const menuItem = menuItems.find((item) => item.path === pathname)
    if (menuItem?.requiredRole === "admin" && user.role !== "admin") {
      router.push("/")
      return
    }
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  // 根据用户角色过滤菜单项
  const visibleMenuItems = currentUser
    ? menuItems.filter(
        (item) =>
          !item.requiredRole ||
          item.requiredRole === "user" ||
          currentUser.role === "admin"
      )
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-30 h-16">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors"
              title="返回主页"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
            </button>
            {currentUser && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">当前用户:</span>
                <span className="font-medium text-gray-900">{currentUser.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  currentUser.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {currentUser.role === "admin" ? "管理员" : "主控"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回主页
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        {visibleMenuItems.length > 0 ? (
          <aside
            className={`fixed left-0 top-16 bottom-0 bg-white shadow-sm border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
              collapsed ? "w-16" : "w-64"
            }`}
          >
            <nav className="p-4 space-y-2">
              {/* Collapse Button */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors mb-4"
                title={collapsed ? "展开菜单" : "收缩菜单"}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${collapsed ? "rotate-0" : "rotate-180"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {!collapsed && <span>收缩菜单</span>}
              </button>

              {/* Menu Items */}
              {visibleMenuItems.map((item) => {
                const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== "/admin")
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center justify-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    title={item.label}
                  >
                    <div className={`flex-shrink-0 ${isActive ? "text-indigo-600" : ""}`}>
                      {item.icon}
                    </div>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                )
              })}
            </nav>
          </aside>
        ) : (
          // No menu items to show (non-admin user)
          <aside className="hidden"></aside>
        )}

        {/* Main Content */}
        <main
          className={`flex-1 p-6 transition-all duration-300 ${
            visibleMenuItems.length > 0 ? (collapsed ? "ml-16" : "ml-64") : "ml-0"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
