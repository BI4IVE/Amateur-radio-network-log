"use client"

import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

export default function AdminToolsPage() {
  const router = useRouter()

  const quickActions = [
    {
      id: "users",
      title: "用户管理",
      description: "管理系统用户、权限、密码等",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: "from-indigo-500 to-purple-500",
      path: "/admin",
    },
    {
      id: "stats",
      title: "台网统计",
      description: "查看历史台网数据和统计信息",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "from-purple-500 to-pink-500",
      path: "/admin/stats",
    },
    {
      id: "page-configs",
      title: "页面配置",
      description: "管理网站标题、版本号、联系方式等",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "from-blue-500 to-cyan-500",
      path: "/admin/page-configs",
    },
    {
      id: "home",
      title: "返回主页",
      description: "返回台网日志主页",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: "from-gray-500 to-gray-600",
      path: "/",
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">管理工具</h2>
          <p className="text-sm text-gray-500 mt-1">系统管理功能的快速入口</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(action.path)}
              className="group relative bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all duration-300 text-left"
            >
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b" style={{
                background: `linear-gradient(to bottom, var(--tw-gradient-from), var(--tw-gradient-to))`
              }} />
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 p-3 bg-gradient-to-br ${action.color} rounded-lg text-white`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {action.description}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              导航提示
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• 使用左侧菜单快速导航到各个管理页面</li>
              <li>• 点击左上角的收缩按钮可以折叠侧边栏</li>
              <li>• 折叠后只显示图标，再次点击可展开</li>
              <li>• 点击左上角 Logo 可返回主页</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              功能说明
            </h4>
            <ul className="text-sm text-green-800 space-y-2">
              <li>• <strong>用户管理</strong>：完整的用户增删改查功能</li>
              <li>• <strong>台网统计</strong>：查看历史数据和统计信息</li>
              <li>• <strong>页面配置</strong>：动态修改网站标题和版本号</li>
              <li>• 所有管理页面都支持数据导出功能</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
