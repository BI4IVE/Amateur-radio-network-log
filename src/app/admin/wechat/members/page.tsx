// @version v1.5.24
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

type MemberRow = {
  id: string
  callsign: string
  idHash: string
  name: string | null
  importedAt: string
}

/**
 * [v1.5.21 微信推送] 会员对照表（仅「绑定认证方式 = 身份证后六位」时使用）
 *
 * 导入流程：上传 CSV/Excel（列顺序：呼号、身份证后六位、姓名[可选]）
 * → 前端解析成行 → 提交给后端，由后端用 .env 的 SALT 计算哈希后入库。
 * 原始身份证后六位不会落库，文件也不上传服务器。
 */
export default function WechatMembersPage() {
  const router = useRouter()
  const [items, setItems] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [result, setResult] = useState<string | null>(null)

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
      if (keyword.trim()) qs.set("callsign", keyword.trim())
      const res = await fetch(`/api/admin/wechat/member-auth?${qs.toString()}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Load member auth error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file: File) => {
    setImporting(true)
    setResult(null)
    try {
      // 动态引入 xlsx（项目已依赖），避免在首屏加载
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
        header: 1,
        blankrows: false,
      })

      const rows = matrix
        .map((cells) => ({
          callsign: String(cells[0] ?? "").trim().toUpperCase(),
          idLast6: String(cells[1] ?? "").trim(),
          name: cells[2] ? String(cells[2]).trim() : undefined,
        }))
        .filter((r) => r.callsign && r.idLast6)

      if (rows.length === 0) {
        setResult("未解析到有效数据，请检查列顺序：呼号、身份证后六位、姓名")
        return
      }

      const res = await fetch("/api/admin/wechat/member-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "导入失败")
      setResult(`导入成功，共 ${data.count} 条（系统只保存加盐哈希，未保存明文）`)
      load()
    } catch (error) {
      console.error("Import member auth error:", error)
      setResult(error instanceof Error ? error.message : "导入失败")
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (callsign: string) => {
    if (!confirm(`确定删除 ${callsign} 的对照记录吗？`)) return
    const res = await fetch(
      `/api/admin/wechat/member-auth?callsign=${encodeURIComponent(callsign)}`,
      { method: "DELETE" }
    )
    const data = await res.json()
    if (!res.ok || !data.ok) alert(data.error || "删除失败")
    load()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-black">会员对照表</h2>
          <p className="text-sm text-black mt-1">
            用于「身份证后六位」认证方式：导入呼号与身份证后六位的对应关系
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <div className="text-sm text-black">
            上传 CSV / Excel，列顺序：<b>呼号，身份证后六位，姓名（可选）</b>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
            className="block w-full text-sm"
          />
          {importing && <div className="text-sm text-black">导入中...</div>}
          {result && (
            <div
              className={`p-3 rounded-lg text-sm ${
                result.includes("成功") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {result}
            </div>
          )}
          <p className="text-xs text-black">
            文件仅在浏览器本地解析，不会上传到服务器；身份证后六位在服务端加盐哈希后入库，明文不落库。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex items-end gap-3">
          <div>
            <label className="block text-xs text-black mb-1">呼号</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>
          <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
            查询
          </button>
          <span className="text-sm text-black ml-auto">共 {total} 条</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-black text-sm">加载中...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-black text-sm">暂无对照记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-black">
                <tr>
                  <th className="px-4 py-3 text-left">呼号</th>
                  <th className="px-4 py-3 text-left">姓名</th>
                  <th className="px-4 py-3 text-left">认证哈希</th>
                  <th className="px-4 py-3 text-left">导入时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.callsign}</td>
                    <td className="px-4 py-3">{item.name || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-black">
                      {item.idHash.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-black">
                      {new Date(item.importedAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.callsign)}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded"
                      >
                        删除
                      </button>
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
