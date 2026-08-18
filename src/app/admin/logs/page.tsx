// @version v1.5.11
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"
import { formatDate, formatDateTime, formatTime } from "@/utils/dateFormat"
import { toBeijingISOString } from "@/utils/dateFormat"
import * as XLSX from "xlsx"

interface LogSession {
  id: string
  controllerId: string
  controllerName: string
  controllerEquipment: string | null
  controllerAntenna: string | null
  controllerQth: string | null
  sessionTime: string
  createdAt: string
}

interface LogRecord {
  id: string
  sessionId: string
  callsign: string
  qth: string | null
  equipment: string | null
  antenna: string | null
  power: string | null
  signal: string | null
  report: string | null
  remarks: string | null
  createdAt: string
}

interface User {
  id: string
  username: string
  name: string
  role: string
  equipment?: string
  antenna?: string
  qth?: string
}

export default function AdminLogsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<LogSession[]>([])
  const [selectedSession, setSelectedSession] = useState<LogSession | null>(null)
  const [records, setRecords] = useState<LogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LogRecord | null>(null)
  const [importMode, setImportMode] = useState<"session" | null>(null)

  // Create session form
  const [newSessionDate, setNewSessionDate] = useState("")
  const [newSessionController, setNewSessionController] = useState("")

  // Add/Edit record form
  const [recordForm, setRecordForm] = useState({
    callsign: "", qth: "", equipment: "", antenna: "", power: "", signal: "", report: "", remarks: ""
  })

  // Search/filter
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) { router.push("/login"); return }
    const u = JSON.parse(userStr)
    if (u.role !== "admin") { router.push("/"); return }
    setUser(u)
    loadSessions()
  }, [])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      const res = await fetch(`/api/admin/sessions?userRole=${u?.role}`)
      const data = await res.json()
      if (data.sessions) setSessions(data.sessions)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadRecords = async (sessionId: string) => {
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      const res = await fetch(`/api/admin/sessions/${sessionId}/records?userRole=${u?.role}`)
      const data = await res.json()
      if (data.records) setRecords(data.records)
    } catch (err) { console.error(err) }
  }

  const selectSession = async (session: LogSession) => {
    setSelectedSession(session)
    setRecords([])
    await loadRecords(session.id)
  }

  const handleCreateSession = async () => {
    if (!newSessionDate || !newSessionController) return
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      // Convert beijing time to UTC
      const [datePart, timePart] = newSessionDate.split("T")
      const [year, month, day] = datePart.split("-").map(Number)
      const [hours, minutes] = timePart.split(":").map(Number)
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 8, minutes))

      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: u?.role,
          controllerId: u?.id,
          controllerName: newSessionController,
          controllerEquipment: u?.equipment || null,
          controllerAntenna: u?.antenna || null,
          controllerQth: u?.qth || null,
          sessionTime: utcDate.toISOString(),
        }),
      })
      const data = await res.json()
      if (data.session) {
        setShowCreateSession(false)
        setNewSessionDate("")
        setNewSessionController("")
        await loadSessions()
      }
    } catch (err) { console.error(err) }
  }

  const handleAddRecord = async () => {
    if (!selectedSession || !recordForm.callsign) return
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      const res = await fetch(`/api/admin/sessions/${selectedSession.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: u?.role, ...recordForm }),
      })
      const data = await res.json()
      if (data.record) {
        setShowAddRecord(false)
        setRecordForm({ callsign: "", qth: "", equipment: "", antenna: "", power: "", signal: "", report: "", remarks: "" })
        await loadRecords(selectedSession.id)
      }
    } catch (err) { console.error(err) }
  }

  const handleUpdateRecord = async () => {
    if (!selectedSession || !editingRecord) return
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      const res = await fetch(`/api/admin/sessions/${selectedSession.id}/records/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: u?.role, ...recordForm }),
      })
      const data = await res.json()
      if (data.record) {
        setEditingRecord(null)
        setRecordForm({ callsign: "", qth: "", equipment: "", antenna: "", power: "", signal: "", report: "", remarks: "" })
        await loadRecords(selectedSession.id)
      }
    } catch (err) { console.error(err) }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!selectedSession || !confirm("确定删除此记录?")) return
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      await fetch(`/api/admin/sessions/${selectedSession.id}/records/${recordId}?userRole=${u?.role}`, {
        method: "DELETE",
      })
      await loadRecords(selectedSession.id)
    } catch (err) { console.error(err) }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("确定删除此会话及其所有记录? 此操作不可恢复!")) return
    try {
      const userStr = localStorage.getItem("user")
      const u = userStr ? JSON.parse(userStr) : null
      await fetch(`/api/admin/sessions/${sessionId}?userRole=${u?.role}`, {
        method: "DELETE",
      })
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        setRecords([])
      }
      await loadSessions()
    } catch (err) { console.error(err) }
  }

  const handleExport = async () => {
    if (!selectedSession) return
    try {
      const res = await fetch(`/api/sessions/${selectedSession.id}/export`)
      if (!res.ok) return
      const blob = await res.blob()
      const sessionDate = formatDate(selectedSession.sessionTime)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${sessionDate}台网记录.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
  }

  const handleImportRecords = async (file: File) => {
    if (!selectedSession || !user) return
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      // Find header row (look for "呼号" in the row)
      let headerIdx = -1
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i] as any[]
        if (row && row.some((cell: any) => String(cell).trim() === "呼号")) {
          headerIdx = i
          break
        }
      }
      if (headerIdx === -1) { alert('未找到表头行（需包含"呼号"列）'); return }

      const headers = (rows[headerIdx] as any[]).map((h: any) => String(h).trim())
      const colMap: Record<string, number> = {}
      const fieldNames = ["呼号", "序号", "callsign", "QTH", "qth", "设备", "equipment", "天馈", "antenna", "功率", "power", "信号", "signal", "报告", "report", "备注", "remarks"]
      headers.forEach((h: string, idx: number) => {
        if (["呼号", "callsign"].includes(h)) colMap.callsign = idx
        else if (["QTH", "qth"].includes(h)) colMap.qth = idx
        else if (["设备", "equipment"].includes(h)) colMap.equipment = idx
        else if (["天馈", "antenna"].includes(h)) colMap.antenna = idx
        else if (["功率", "power"].includes(h)) colMap.power = idx
        else if (["信号", "signal"].includes(h)) colMap.signal = idx
        else if (["报告", "report"].includes(h)) colMap.report = idx
        else if (["备注", "remarks"].includes(h)) colMap.remarks = idx
      })

      if (colMap.callsign === undefined) { alert('表头中未找到"呼号"列'); return }

      const importRecords = []
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i] as any[]
        if (!row || !row[colMap.callsign] || String(row[colMap.callsign]).trim() === "") continue
        importRecords.push({
          callsign: String(row[colMap.callsign] || "").trim(),
          qth: colMap.qth !== undefined ? String(row[colMap.qth] || "").trim() : null,
          equipment: colMap.equipment !== undefined ? String(row[colMap.equipment] || "").trim() : null,
          antenna: colMap.antenna !== undefined ? String(row[colMap.antenna] || "").trim() : null,
          power: colMap.power !== undefined ? String(row[colMap.power] || "").trim() : null,
          signal: colMap.signal !== undefined ? String(row[colMap.signal] || "").trim() : null,
          report: colMap.report !== undefined ? String(row[colMap.report] || "").trim() : null,
          remarks: colMap.remarks !== undefined ? String(row[colMap.remarks] || "").trim() : null,
        })
      }

      if (importRecords.length === 0) { alert("未找到有效数据行"); return }

      const res = await fetch(`/api/admin/sessions/${selectedSession.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRole: user.role, records: importRecords }),
      })
      const result = await res.json()
      alert(`导入完成: 总计 ${result.total} 条, 成功 ${result.imported} 条${result.errors?.length ? `, 失败 ${result.errors.length} 条` : ""}`)
      setImportMode(null)
      await loadRecords(selectedSession.id)
    } catch (err) {
      console.error(err)
      alert("导入失败")
    }
  }

  const startEdit = (record: LogRecord) => {
    setEditingRecord(record)
    setRecordForm({
      callsign: record.callsign,
      qth: record.qth || "",
      equipment: record.equipment || "",
      antenna: record.antenna || "",
      power: record.power || "",
      signal: record.signal || "",
      report: record.report || "",
      remarks: record.remarks || "",
    })
    setShowAddRecord(false)
  }

  const startAdd = () => {
    setShowAddRecord(true)
    setEditingRecord(null)
    setRecordForm({ callsign: "", qth: "", equipment: "", antenna: "", power: "", signal: "", report: "", remarks: "" })
  }

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchSearch = !searchTerm ||
      s.controllerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.includes(searchTerm)
    const matchDate = !dateFilter || formatDate(s.sessionTime).includes(dateFilter)
    return matchSearch && matchDate
  })

  if (!user) return null

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">台网历史管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理所有历史台网记录，支持修改、新增、导入导出</p>
          </div>
          <button
            onClick={() => { setShowCreateSession(true); setNewSessionDate(toBeijingISOString()) }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            + 新建指定日期会话
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left: Session List */}
          <div className="w-80 flex-shrink-0">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <input
                type="text"
                placeholder="搜索主控名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="按日期筛选 (如 2025-01-15)"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mt-2"
              />
            </div>

            {/* Session list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <span className="text-sm font-medium text-gray-700">全部会话 ({filteredSessions.length})</span>
              </div>
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 text-sm">加载中...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">暂无会话</div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedSession?.id === session.id ? "bg-indigo-50 border-l-2 border-l-indigo-500" : "hover:bg-gray-50"
                      }`}
                      onClick={() => selectSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{session.controllerName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id) }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="删除会话"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(session.sessionTime)} {formatTime(session.sessionTime)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        设备: {session.controllerEquipment || "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Records */}
          <div className="flex-1 min-w-0">
            {selectedSession ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Session info */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {formatDate(selectedSession.sessionTime)} 台网记录
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        主控: {selectedSession.controllerName} | 设备: {selectedSession.controllerEquipment || "-"} | 天线: {selectedSession.controllerAntenna || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={startAdd}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        + 添加记录
                      </button>
                      <button
                        onClick={() => setImportMode("session")}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        导入记录
                      </button>
                      <button
                        onClick={handleExport}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        导出 Excel
                      </button>
                    </div>
                  </div>
                </div>

                {/* Import area */}
                {importMode === "session" && (
                  <div className="p-4 bg-green-50 border-b border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">导入台网记录（Excel 文件）</p>
                        <p className="text-xs text-green-600 mt-0.5">表头需包含"呼号"列，可选列: QTH、设备、天馈、功率、信号、报告、备注</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer text-sm">
                          选择文件
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImportRecords(file)
                            }}
                          />
                        </label>
                        <button
                          onClick={() => setImportMode(null)}
                          className="px-3 py-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add/Edit record form */}
                {(showAddRecord || editingRecord) && (
                  <div className="p-4 bg-indigo-50 border-b border-indigo-200">
                    <h3 className="text-sm font-medium text-indigo-800 mb-3">
                      {editingRecord ? "编辑记录" : "添加新记录"}
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      <input placeholder="呼号 *" value={recordForm.callsign} onChange={(e) => setRecordForm({ ...recordForm, callsign: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="QTH" value={recordForm.qth} onChange={(e) => setRecordForm({ ...recordForm, qth: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="设备" value={recordForm.equipment} onChange={(e) => setRecordForm({ ...recordForm, equipment: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="天馈" value={recordForm.antenna} onChange={(e) => setRecordForm({ ...recordForm, antenna: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="功率" value={recordForm.power} onChange={(e) => setRecordForm({ ...recordForm, power: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="信号" value={recordForm.signal} onChange={(e) => setRecordForm({ ...recordForm, signal: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="报告" value={recordForm.report} onChange={(e) => setRecordForm({ ...recordForm, report: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                      <input placeholder="备注" value={recordForm.remarks} onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900" />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={editingRecord ? handleUpdateRecord : handleAddRecord}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                      >
                        {editingRecord ? "保存修改" : "添加"}
                      </button>
                      <button
                        onClick={() => { setShowAddRecord(false); setEditingRecord(null) }}
                        className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* Records table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">呼号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">QTH</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">设备</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">天馈</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">功率</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">信号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">报告</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">备注</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">时间</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {records.length === 0 ? (
                        <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500">暂无记录</td></tr>
                      ) : (
                        records.map((record, idx) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{record.callsign}</td>
                            <td className="px-3 py-2 text-gray-600">{record.qth || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{record.equipment || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{record.antenna || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{record.power || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{record.signal || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{record.report || "-"}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{record.remarks || "-"}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{record.createdAt ? formatTime(record.createdAt) : "-"}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEdit(record)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="编辑">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteRecord(record.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="删除">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
                  共 {records.length} 条记录
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">请从左侧选择一个会话查看记录</p>
                <p className="text-sm text-gray-400 mt-1">或点击"新建指定日期会话"创建新的历史记录</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">新建指定日期会话</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会话日期时间</label>
                <input
                  type="datetime-local"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主控名称</label>
                <input
                  type="text"
                  value={newSessionController}
                  onChange={(e) => setNewSessionController(e.target.value)}
                  placeholder="输入主控名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateSession}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                创建会话
              </button>
              <button
                onClick={() => setShowCreateSession(false)}
                className="flex-1 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
