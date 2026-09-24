// @version v1.5.22
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

type Binding = {
  id: string
  openid: string
  callsign: string
  status: string
  createdAt: string
  updatedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  active: "已生效",
  pending: "待审核",
  rejected: "已拒绝",
  inactive: "已失效",
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-black",
}

/** openid 属用户隐私，列表只展示部分字符 */
function maskOpenid(openid: string): string {
  if (!openid) return "-"
  return openid.length > 10 ? `${openid.slice(0, 8)}****${openid.slice(-4)}` : openid
}

export default function WechatBindingsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Binding[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState("")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [guideOpen, setGuideOpen] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    if (user.role !== "admin") {
      alert("无权访问此页面")
      router.push("/")
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (status) qs.set("status", status)
      if (keyword.trim()) qs.set("callsign", keyword.trim())
      const res = await fetch(`/api/admin/wechat/bindings?${qs.toString()}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Load bindings error:", error)
      alert("加载绑定列表失败")
    } finally {
      setLoading(false)
    }
  }

  const act = async (action: string, openid: string, callsign?: string) => {
    try {
      const res = await fetch("/api/admin/wechat/bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, openid, callsign }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        alert(data.error || "操作失败")
        return
      }
      load()
    } catch (error) {
      console.error("Binding action error:", error)
      alert("操作失败")
    }
  }

  const handleUpdateCallsign = (item: Binding) => {
    const value = prompt("输入新的呼号", item.callsign)
    if (!value) return
    act("update-callsign", item.openid, value.trim().toUpperCase())
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-black">绑定管理</h2>
          <p className="text-sm text-black mt-1">
            查看微信用户与呼号的绑定关系，审核绑定申请（人工审核方式下使用）
          </p>
        </div>

        {/* 绑定流程说明 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">
              绑定是怎么进行的（三种方式，管理员在「配置」页切换）
            </h3>
            <button
              onClick={() => setGuideOpen(!guideOpen)}
              className="text-sm text-indigo-600 shrink-0 ml-4"
            >
              {guideOpen ? "收起" : "展开"}
            </button>
          </div>
          {guideOpen && (
            <div className="mt-3 space-y-3 text-sm text-black">
              <p>
                <b>用户侧入口（三种方式都一样）</b>：关注公众号 → 点菜单
                「绑定台网通知」→ 页面自动识别微信身份（无需登录）→ 按当前认证方式填写 → 提交。
              </p>
              <div>
                <b>方式一 · 身份证后六位</b>：管理员先在「会员对照表」导入
                「呼号 / 身份证后六位 / 姓名」；用户填「呼号 +
                身份证后六位」，核对通过<b>立即生效</b>。
              </div>
              <div>
                <b>方式二 · 一次性绑定码</b>：管理员在「绑定码」页按呼号生成码，
                把「呼号 + 码」发给对应用户；用户填写后<b>立即生效</b>，该码随即作废。
              </div>
              <div>
                <b>方式三 · 人工审核</b>：用户只填「呼号」提交，状态变为
                <b>「待审核」</b>；管理员在本页点「通过」后才生效，点「拒绝」则用户可重新提交。
              </div>
              <p className="text-xs">
                规则：1 个微信只能绑 1 个呼号（重复绑定会覆盖）；一个呼号可被多个微信绑定（如家人共用），
                推送时全部发送；用户取关公众号会自动置为「已失效」，重新关注自动恢复。
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-black mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            >
              <option value="">全部</option>
              <option value="active">已生效</option>
              <option value="pending">待审核</option>
              <option value="rejected">已拒绝</option>
              <option value="inactive">已失效</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-black mb-1">呼号</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="模糊搜索"
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            查询
          </button>
          <span className="text-sm text-black ml-auto">共 {total} 条</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-black text-sm">加载中...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-black text-sm">暂无绑定记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-black">
                <tr>
                  <th className="px-4 py-3 text-left">呼号</th>
                  <th className="px-4 py-3 text-left">OpenID</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">更新时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-black">{item.callsign}</td>
                    <td className="px-4 py-3 font-mono text-xs text-black">
                      {maskOpenid(item.openid)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          STATUS_STYLE[item.status] || "bg-gray-100 text-black"
                        }`}
                      >
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-black">
                      {new Date(item.updatedAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => act("approve", item.openid)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => act("reject", item.openid)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleUpdateCallsign(item)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        改呼号
                      </button>
                      {item.status !== "inactive" && (
                        <button
                          onClick={() => {
                            if (confirm(`确定解绑 ${item.callsign} 吗？`)) {
                              act("unbind", item.openid)
                            }
                          }}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded"
                        >
                          解绑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
