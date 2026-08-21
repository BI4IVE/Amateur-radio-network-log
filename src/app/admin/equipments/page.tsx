// @version v1.5.15
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"

interface Equipment {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string | null
}

export default function AdminEquipmentsPage() {
  const router = useRouter()
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [importing, setImporting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", description: "" })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", description: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    if (user.role !== "admin") {
      router.push("/")
      return
    }
    fetchEquipments()
  }, [router])

  const fetchEquipments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const res = await fetch(`/api/admin/equipments?userRole=${user.role}`)
      if (res.ok) {
        const data = await res.json()
        setEquipments(data.equipments || [])
      }
    } catch (error) {
      console.error("获取设备列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      alert("设备名称不能为空")
      return
    }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const res = await fetch("/api/admin/equipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: user.role, ...addForm }),
      })
      if (res.ok) {
        setAddForm({ name: "", description: "" })
        setShowAddForm(false)
        fetchEquipments()
      } else {
        const data = await res.json()
        alert(data.error || "添加失败")
      }
    } catch (error) {
      console.error("添加设备失败:", error)
      alert("添加失败")
    }
  }

  const handleEdit = (equipment: Equipment) => {
    setEditingId(equipment.id)
    setEditForm({
      name: equipment.name,
      description: equipment.description || "",
    })
  }

  const handleUpdate = async () => {
    if (!editingId) return
    if (!editForm.name.trim()) {
      alert("设备名称不能为空")
      return
    }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const res = await fetch(`/api/admin/equipments/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: user.role, ...editForm }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchEquipments()
      } else {
        const data = await res.json()
        alert(data.error || "更新失败")
      }
    } catch (error) {
      console.error("更新设备失败:", error)
      alert("更新失败")
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除设备"${name}"吗？`)) return
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const res = await fetch(`/api/admin/equipments/${id}?userRole=${user.role}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchEquipments()
      }
    } catch (error) {
      console.error("删除设备失败:", error)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const buffer = await file.arrayBuffer()
      const XLSX = await import("xlsx")
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)

      // 智能识别表头
      const colMap: { name?: number; description?: number } = {}
      const headers = Object.keys(rows[0] || {})
      headers.forEach((h, i) => {
        const hl = h.toLowerCase().trim()
        if (["设备名称", "设备", "名称", "name", "equipment"].includes(hl)) colMap.name = i
        if (["描述", "备注", "说明", "description", "desc", "remark"].includes(hl)) colMap.description = i
      })

      if (colMap.name === undefined) {
        alert('表头中未找到"设备名称"列（支持的表头名: 设备名称、设备、名称、name、equipment）')
        setImporting(false)
        return
      }

      const items = rows.map((row) => {
        const vals = Object.values(row)
        return {
          name: String(vals[colMap.name!] || "").trim(),
          description: colMap.description !== undefined ? String(vals[colMap.description!] || "").trim() : undefined,
        }
      }).filter((i) => i.name)

      const res = await fetch("/api/admin/equipments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: user.role, equipments: items }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(`导入完成！共 ${result.total} 条，新增 ${result.created} 条，更新 ${result.updated} 条`)
        fetchEquipments()
      }
    } catch (error) {
      console.error("导入失败:", error)
      alert("导入失败")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleExport = () => {
    const XLSX = require("xlsx")
    const data = equipments.map((e) => ({
      "设备名称": e.name,
      "描述": e.description || "",
      "创建时间": new Date(e.createdAt).toLocaleString("zh-CN"),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "设备库")
    XLSX.writeFile(wb, `设备库_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const handleDownloadTemplate = () => {
    const XLSX = require("xlsx")
    const data = [
      { "设备名称": "IC-7300", "描述": "短波电台" },
      { "设备名称": "FT-991A", "描述": "短波电台" },
      { "设备名称": "威诺N7500", "描述": "车载电台" },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "设备导入模板")
    XLSX.writeFile(wb, "设备导入模板.xlsx")
  }

  const [importingFromRecords, setImportingFromRecords] = useState(false)

  const handleImportFromRecords = async () => {
    if (!confirm("将从所有历史台网记录中提取设备名称并添加到设备库，已存在的设备会被跳过。确定继续吗？")) return
    setImportingFromRecords(true)
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const res = await fetch(`/api/admin/equipments/import-from-records?userRole=${user.role}`, {
        method: "POST",
      })
      if (res.ok) {
        const result = await res.json()
        alert(`导入完成！\n历史记录中共发现 ${result.totalFound} 个设备\n新增 ${result.created} 个\n跳过 ${result.skipped} 个（已存在）`)
        fetchEquipments()
      } else {
        const data = await res.json()
        alert(data.error || "导入失败")
      }
    } catch (error) {
      console.error("从历史记录导入失败:", error)
      alert("导入失败")
    } finally {
      setImportingFromRecords(false)
    }
  }

  const filteredEquipments = equipments.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和操作区 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">设备库</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理台网中使用的设备名称，共 {equipments.length} 条记录
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + 新增设备
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              下载导入模板
            </button>
            <label className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              importing ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
            } text-white`}>
              {importing ? "导入中..." : "导入设备"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
                disabled={importing}
              />
            </label>
            <button
              onClick={handleExport}
              disabled={equipments.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
            >
              导出全部数据
            </button>
            <button
              onClick={handleImportFromRecords}
              disabled={importingFromRecords}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
            >
              {importingFromRecords ? "导入中..." : "从历史记录导入"}
            </button>
          </div>
        </div>

        {/* 新增表单 */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新增设备</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备名称 *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="如: IC-7300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="如: 短波电台"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddForm({ name: "", description: "" }) }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 搜索框 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <input
            type="text"
            placeholder="搜索设备名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          />
        </div>

        {/* 设备列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    设备名称
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEquipments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? "没有找到匹配的设备" : "暂无设备，点击'新增设备'或'导入设备'添加"}
                    </td>
                  </tr>
                ) : (
                  filteredEquipments.map((equipment) => (
                    <tr key={equipment.id} className="hover:bg-gray-50">
                      {editingId === equipment.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(equipment.createdAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleUpdate}
                                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                取消
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {equipment.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {equipment.description || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(equipment.createdAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(equipment)}
                                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(equipment.id, equipment.name)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
