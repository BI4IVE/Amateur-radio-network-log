// @version v1.5.20
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

interface MenuGroup {
  id: string
  label: string
  icon: ReactNode
  requiredRole?: "admin" | "user"
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    id: "operations",
    label: "运营中心",
    requiredRole: "user",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    items: [
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
        id: "analytics",
        label: "数据看板",
        path: "/admin/analytics",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l4-4 3 3 5-6" />
          </svg>
        ),
        requiredRole: "user",
      },
      {
        id: "rotation",
        label: "主控轮值",
        path: "/admin/rotation",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        requiredRole: "user",
      },
      {
        id: "schedules",
        label: "台网预告",
        path: "/admin/schedules",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        requiredRole: "user",
      },
    ],
  },
  {
    id: "data-logs",
    label: "数据与日志",
    requiredRole: "admin",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    items: [
      {
        id: "logs",
        label: "台网历史管理",
        path: "/admin/logs",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        requiredRole: "admin",
      },
      {
        id: "recycle",
        label: "回收站/审计",
        path: "/admin/recycle",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
          </svg>
        ),
        requiredRole: "admin",
      },
      {
        id: "login-logs",
        label: "登录日志",
        path: "/admin/login-logs",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        requiredRole: "admin",
      },
    ],
  },
  {
    id: "system",
    label: "系统管理",
    requiredRole: "admin",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    items: [
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
        id: "equipments",
        label: "设备库",
        path: "/admin/equipments",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
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
        id: "upgrade",
        label: "版本更新",
        path: "/admin/upgrade",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
        requiredRole: "admin",
      },
    ],
  },
]

// 把当前路径映射到"是否激活某个菜单项"
const isItemActive = (itemPath: string, current: string) =>
  itemPath === current ||
  (itemPath !== "/admin" && current.startsWith(itemPath))

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 根据用户角色过滤分组与子项
  const visibleGroups = currentUser
    ? menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !item.requiredRole ||
              item.requiredRole === "user" ||
              currentUser.role === "admin"
          ),
        }))
        .filter((group) => group.items.length > 0)
    : []

  // 当前激活的分组（按其子项是否命中当前路径判断）
  const activeGroup =
    visibleGroups.find((g) => g.items.some((it) => isItemActive(it.path, pathname))) ??
    visibleGroups[0]

  const allItems = menuGroups.flatMap((g) => g.items)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }

    const user = JSON.parse(userStr)
    setCurrentUser(user)

    // 检查用户是否有权限访问当前页面
    const menuItem = allItems.find((item) => item.path === pathname)
    if (menuItem?.requiredRole === "admin" && user.role !== "admin") {
      router.push("/")
      return
    }
  }, [pathname, router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // 接口失败也继续本地退出
    }
    localStorage.removeItem("user")
    router.push("/login")
  }

  // [v1.5.11] 后台"清理缓存"：清除本地存储 + Service Worker 缓存，并以 cache-bust 参数强制刷新
  const handleClearCache = async () => {
    if (!window.confirm("确定要清理浏览器缓存吗？\n将清除本地存储并强制刷新页面（不会删除任何服务器数据）。")) {
      return
    }
    try {
      localStorage.clear()
      sessionStorage.clear()
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) { await reg.unregister() }
      }
      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      // 忽略清理异常，继续刷新
    }
    const sep = window.location.search ? "&" : "?"
    window.location.href = window.location.pathname + sep + "_cb=" + Date.now()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40 h-16">
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
            {currentUser && (
              <button
                onClick={handleClearCache}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                title="清理浏览器缓存并强制刷新页面"
              >
                清理缓存
              </button>
            )}
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

      {/* 顶部主菜单（横向） */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-16 left-0 right-0 z-30 h-12 flex items-center px-4 gap-1 overflow-x-auto">
        {visibleGroups.map((group) => {
          const isActive = activeGroup?.id === group.id
          return (
            <button
              key={group.id}
              onClick={() => router.push(group.items[0].path)}
              className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className={isActive ? "text-indigo-600" : "text-gray-400"}>
                {group.icon}
              </span>
              {group.label}
            </button>
          )
        })}
      </nav>

      <div className="pt-28 flex">
        {/* 左侧二级菜单 */}
        {activeGroup && (
          <aside
            className={`fixed left-0 top-28 bottom-0 bg-white shadow-sm border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
              collapsed ? "w-16" : "w-64"
            }`}
          >
            <div className="p-4 space-y-2">
              {/* 当前分组标题 */}
              {!collapsed && (
                <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {activeGroup.label}
                </div>
              )}

              {/* 收缩按钮 */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors mb-2"
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

              {/* 二级菜单项 */}
              {activeGroup.items.map((item) => {
                const isActive = isItemActive(item.path, pathname)
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
            </div>
          </aside>
        )}

        {/* 主内容区 */}
        <main
          className={`flex-1 p-6 transition-all duration-300 ${
            activeGroup ? (collapsed ? "ml-16" : "ml-64") : "ml-0"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
