// @version v1.5.17
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"
import * as XLSX from "xlsx"

interface Participant {
  id: string
  callsign: string
  name: string | null
  qth: string | null
  equipment: string | null
  antenna: string | null
  power: string | null
  signal: string | null
  report: string | null
  remarks: string | null
  createdAt: string
  updatedAt: string | null
}

interface User {
  id: string
  username: string
  name: string
  role: string
}

const emptyForm = {
  callsign: "", name: "", qth: "", equipment: "", antenna: "", power: "", signal: "", report: "", remarks: ""
}

export default function AdminParticipantsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [importResult, setImportResult] = useState<{
    success: boolean
    total: number
    created: number
    updated: number
    errors: { index: number; callsign: string; error: string }[]
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit modal state
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Add new state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) { router.push("/login"); return }
    const u = JSON.parse(userStr)
    if (u.role !== "admin") { router.push("/"); return }
    setUser(u)
    loadParticipants()
  }, [])

  const loadParticipants = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/participants?limit=500")
      const data = await res.json()
      if (data.participants) setParticipants(data.participants)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleFileImport = async (file: File) => {
    if (!user) return
    setImporting(true)
    setImportResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      if (rows.length < 2) {
        alert("文件数据为空")
        setImporting(false)
        return
      }

      const headers = (rows[0] as any[]).map((h: any) => String(h).trim())
      const colMap: Record<string, number> = {}

      headers.forEach((h: string, idx: number) => {
        const lower = h.toLowerCase()
        if (["呼号", "callsign", "呼号/名称"].includes(h) || lower === "callsign") colMap.callsign = idx
        else if (["姓名", "name", "名称"].includes(h) || lower === "name") colMap.name = idx
        else if (["qth", "位置"].includes(h)) colMap.qth = idx
        else if (["设备", "equipment", "电台"].includes(h) || lower === "equipment") colMap.equipment = idx
        else if (["天线", "antenna", "天馈"].includes(h) || lower === "antenna") colMap.antenna = idx
        else if (["功率", "power"].includes(h) || lower === "power") colMap.power = idx
        else if (["信号", "signal"].includes(h) || lower === "signal") colMap.signal = idx
        else if (["报告", "report"].includes(h) || lower === "report") colMap.report = idx
        else if (["备注", "remarks", "remark"].includes(h) || lower === "remarks") colMap.remarks = idx
      })

      if (colMap.callsign === undefined) {
        alert('表头中未找到"呼号"列（支持的表头名: 呼号、callsign）')
        setImporting(false)
        return
      }

      const importData = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[]
        if (!row || !row[colMap.callsign] || String(row[colMap.callsign]).trim() === "") continue
        importData.push({
          callsign: String(row[colMap.callsign] || "").trim(),
          name: colMap.name !== undefined ? String(row[colMap.name] || "").trim() || null : null,
          qth: colMap.qth !== undefined ? String(row[colMap.qth] || "").trim() || null : null,
          equipment: colMap.equipment !== undefined ? String(row[colMap.equipment] || "").trim() || null : null,
          antenna: colMap.antenna !== undefined ? String(row[colMap.antenna] || "").trim() || null : null,
          power: colMap.power !== undefined ? String(row[colMap.power] || "").trim() || null : null,
          signal: colMap.signal !== undefined ? String(row[colMap.signal] || "").trim() || null : null,
          report: colMap.report !== undefined ? String(row[colMap.report] || "").trim() || null : null,
          remarks: colMap.remarks !== undefined ? String(row[colMap.remarks] || "").trim() || null : null,
        })
      }

      if (importData.length === 0) {
        alert("未找到有效数据行")
        setImporting(false)
        return
      }

      const res = await fetch("/api/admin/participants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: user.role, participants: importData }),
      })
      const result = await res.json()
      setImportResult(result)
      await loadParticipants()
    } catch (err) {
      console.error(err)
      alert("导入失败")
    }
    setImporting(false)
  }

  const handleDelete = async (id: string, callsign: string) => {
    if (!confirm(`确定删除呼号 "${callsign}" 的记录?`)) return
    try {
      await fetch(`/api/participants?id=${id}`, { method: "DELETE" })
      await loadParticipants()
    } catch (err) { console.error(err) }
  }

  // Open edit modal
  const openEdit = (p: Participant) => {
    setEditingParticipant(p)
    setEditForm({
      callsign: p.callsign,
      name: p.name || "",
      qth: p.qth || "",
      equipment: p.equipment || "",
      antenna: p.antenna || "",
      power: p.power || "",
      signal: p.signal || "",
      report: p.report || "",
      remarks: p.remarks || "",
    })
  }

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingParticipant) return
    if (!editForm.callsign.trim()) {
      alert("呼号不能为空")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/participants/${editingParticipant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign: editForm.callsign.trim(),
          name: editForm.name.trim() || null,
          qth: editForm.qth.trim() || null,
          equipment: editForm.equipment.trim() || null,
          antenna: editForm.antenna.trim() || null,
          power: editForm.power.trim() || null,
          signal: editForm.signal.trim() || null,
          report: editForm.report.trim() || null,
          remarks: editForm.remarks.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "保存失败")
        setSaving(false)
        return
      }
      setEditingParticipant(null)
      await loadParticipants()
    } catch (err) {
      console.error(err)
      alert("保存失败")
    }
    setSaving(false)
  }

  // Add new participant
  const handleAdd = async () => {
    if (!addForm.callsign.trim()) {
      alert("呼号不能为空")
      return
    }
    setAdding(true)
    try {
      const res = await fetch("/api/participants/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign: addForm.callsign.trim(),
          name: addForm.name.trim() || null,
          qth: addForm.qth.trim() || null,
          equipment: addForm.equipment.trim() || null,
          antenna: addForm.antenna.trim() || null,
          power: addForm.power.trim() || null,
          signal: addForm.signal.trim() || null,
          report: addForm.report.trim() || null,
          remarks: addForm.remarks.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "添加失败")
        setAdding(false)
        return
      }
      setShowAddForm(false)
      setAddForm(emptyForm)
      await loadParticipants()
    } catch (err) {
      console.error(err)
      alert("添加失败")
    }
    setAdding(false)
  }

  const handleExportTemplate = () => {
    const headers = ["呼号", "姓名", "QTH", "设备", "天线", "功率", "信号", "报告", "备注"]
    const ws = XLSX.utils.aoa_to_sheet([headers])
    ws["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "设备库导入模板")
    XLSX.writeFile(wb, "设备库导入模板.xlsx")
  }

  const handleExportAll = () => {
    const headers = ["呼号", "姓名", "QTH", "设备", "天线", "功率", "信号", "报告", "备注"]
    const data = participants.map((p) => [
      p.callsign, p.name || "", p.qth || "", p.equipment || "",
      p.antenna || "", p.power || "", p.signal || "", p.report || "", p.remarks || "",
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    ws["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "设备库数据")
    XLSX.writeFile(wb, "设备库数据导出.xlsx")
  }

  const filteredParticipants = participants.filter((p) =>
    !searchTerm ||
    p.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.equipment && p.equipment.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!user) return null

  // Form field component for edit/add modals
  const FormField = ({ label, value, onChange, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">设备库</h1>
            <p className="text-sm text-gray-500 mt-1">管理设备/呼号信息库，支持导入导出、编辑、删除</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddForm(emptyForm); setShowAddForm(true) }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              + 新增设备
            </button>
            <button
              onClick={handleExportTemplate}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              下载导入模板
            </button>
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              导出全部数据
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer">
              导入 Excel
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileImport(file)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
              />
            </label>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-xl border ${importResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <h3 className={`text-sm font-medium ${importResult.success ? "text-green-800" : "text-red-800"}`}>
              导入结果
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>总计: {importResult.total} 条 | 新增: {importResult.created} 条 | 更新: {importResult.updated} 条</p>
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium">失败 {importResult.errors.length} 条:</p>
                  <ul className="list-disc list-inside text-xs text-red-500 mt-1">
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>第 {err.index} 行 [{err.callsign}]: {err.error}</li>
                    ))}
                    {importResult.errors.length > 10 && <li>... 及其他 {importResult.errors.length - 10} 条</li>}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700">关闭</button>
          </div>
        )}

        {importing && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">正在导入，请稍候...</p>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <input
            type="text"
            placeholder="搜索呼号、姓名、设备..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">设备/呼号信息库 ({filteredParticipants.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">呼号</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">姓名</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">QTH</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">设备</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">天线</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">功率</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">信号</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">报告</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">备注</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500">加载中...</td></tr>
                ) : filteredParticipants.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500">暂无数据</td></tr>
                ) : (
                  filteredParticipants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.callsign}</td>
                      <td className="px-3 py-2 text-gray-600">{p.name || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.qth || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.equipment || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.antenna || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.power || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.signal || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.report || "-"}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{p.remarks || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="编辑"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.callsign)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">导入说明</h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li>1. 支持 .xlsx、.xls、.csv 格式文件</li>
            <li>2. 表头第一行必须包含"呼号"列（或 callsign），其他列可选</li>
            <li>3. 支持的列名: 呼号、姓名、QTH、设备、天线、功率、信号、报告、备注</li>
            <li>4. 导入时按呼号去重: 已存在的呼号会更新信息，不存在的会新增</li>
            <li>5. 可点击"下载导入模板"获取标准格式模板</li>
          </ul>
        </div>
      </div>

      {/* Edit Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">编辑设备信息</h2>
              <p className="text-sm text-gray-500 mt-1">修改呼号/设备/天线等信息</p>
            </div>
            <div className="p-6 space-y-4">
              <FormField label="呼号 *" value={editForm.callsign} onChange={(v) => setEditForm({ ...editForm, callsign: v })} placeholder="如 BI4ABC" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="姓名" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                <FormField label="QTH" value={editForm.qth} onChange={(v) => setEditForm({ ...editForm, qth: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="设备" value={editForm.equipment} onChange={(v) => setEditForm({ ...editForm, equipment: v })} placeholder="如 IC-7300" />
                <FormField label="天线" value={editForm.antenna} onChange={(v) => setEditForm({ ...editForm, antenna: v })} placeholder="如 GP天线" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="功率" value={editForm.power} onChange={(v) => setEditForm({ ...editForm, power: v })} placeholder="如 100W" />
                <FormField label="信号" value={editForm.signal} onChange={(v) => setEditForm({ ...editForm, signal: v })} placeholder="如 59" />
                <FormField label="报告" value={editForm.report} onChange={(v) => setEditForm({ ...editForm, report: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                <textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingParticipant(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">新增设备</h2>
              <p className="text-sm text-gray-500 mt-1">添加新的呼号/设备信息到设备库</p>
            </div>
            <div className="p-6 space-y-4">
              <FormField label="呼号 *" value={addForm.callsign} onChange={(v) => setAddForm({ ...addForm, callsign: v })} placeholder="如 BI4ABC" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="姓名" value={addForm.name} onChange={(v) => setAddForm({ ...addForm, name: v })} />
                <FormField label="QTH" value={addForm.qth} onChange={(v) => setAddForm({ ...addForm, qth: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="设备" value={addForm.equipment} onChange={(v) => setAddForm({ ...addForm, equipment: v })} placeholder="如 IC-7300" />
                <FormField label="天线" value={addForm.antenna} onChange={(v) => setAddForm({ ...addForm, antenna: v })} placeholder="如 GP天线" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="功率" value={addForm.power} onChange={(v) => setAddForm({ ...addForm, power: v })} placeholder="如 100W" />
                <FormField label="信号" value={addForm.signal} onChange={(v) => setAddForm({ ...addForm, signal: v })} placeholder="如 59" />
                <FormField label="报告" value={addForm.report} onChange={(v) => setAddForm({ ...addForm, report: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
                <textarea
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                {adding ? "添加中..." : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
