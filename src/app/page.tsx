"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  name: string
  equipment: string | null
  antenna: string | null
  qth: string | null
  role: string
}

interface Participant {
  id: string
  callsign: string
  name: string | null
  equipment: string | null
  qth: string | null
  antenna: string | null
  power: string | null
  signal: string | null
  report: string | null
  remarks: string | null
}

interface LogRecord {
  id: string
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

interface Session {
  id: string
  controllerName: string
  controllerEquipment: string | null
  controllerAntenna: string | null
  controllerQth: string | null
  sessionTime: string
}

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedControllerId, setSelectedControllerId] = useState("")
  const [sessionTime, setSessionTime] = useState("")
  const [controllerName, setControllerName] = useState("")
  const [controllerEquipment, setControllerEquipment] = useState("")
  const [controllerAntenna, setControllerAntenna] = useState("")
  const [controllerQth, setControllerQth] = useState("")
  const [useExistingData, setUseExistingData] = useState(true)

  // Record input
  const [selectedParticipantId, setSelectedParticipantId] = useState("")
  const [callsign, setCallsign] = useState("")
  const [qth, setQth] = useState("")
  const [equipment, setEquipment] = useState("")
  const [antenna, setAntenna] = useState("")
  const [power, setPower] = useState("")
  const [signal, setSignal] = useState("")
  const [report, setReport] = useState("")
  const [remarks, setRemarks] = useState("")

  const [participants, setParticipants] = useState<Participant[]>([])
  const [records, setRecords] = useState<LogRecord[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)

  // Edit mode
  const [editingRecord, setEditingRecord] = useState<LogRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Autocomplete states
  const [searchResults, setSearchResults] = useState<Participant[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Edit autocomplete states
  const [editSearchResults, setEditSearchResults] = useState<Participant[]>([])
  const [showEditSearchResults, setShowEditSearchResults] = useState(false)

  // Field autocomplete states (from history records)
  const [qthResults, setQthResults] = useState<string[]>([])
  const [showQthResults, setShowQthResults] = useState(false)

  const [equipmentResults, setEquipmentResults] = useState<string[]>([])
  const [showEquipmentResults, setShowEquipmentResults] = useState(false)

  const [antennaResults, setAntennaResults] = useState<string[]>([])
  const [showAntennaResults, setShowAntennaResults] = useState(false)

  const [powerResults, setPowerResults] = useState<string[]>([])
  const [showPowerResults, setShowPowerResults] = useState(false)

  const [signalResults, setSignalResults] = useState<string[]>([])
  const [showSignalResults, setShowSignalResults] = useState(false)

  const [reportResults, setReportResults] = useState<string[]>([])
  const [showReportResults, setShowReportResults] = useState(false)

  const [remarksResults, setRemarksResults] = useState<string[]>([])
  const [showRemarksResults, setShowRemarksResults] = useState(false)

  useEffect(() => {
    // Check authentication
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    setCurrentUser(user)

    // Initialize admin if needed
    initializeAdmin()
  }, [router])

  useEffect(() => {
    if (currentUser) {
      loadUsers()
      loadParticipants()
      setSessionTime(new Date().toISOString().slice(0, 16))
    }
  }, [currentUser])

  useEffect(() => {
    if (selectedControllerId) {
      const user = users.find((u) => u.id === selectedControllerId)
      if (user) {
        setControllerName(user.name)
        if (useExistingData) {
          setControllerEquipment(user.equipment || "")
          setControllerAntenna(user.antenna || "")
          setControllerQth(user.qth || "")
        }
      }
    }
  }, [selectedControllerId, users, useExistingData])

  const initializeAdmin = async () => {
    try {
      await fetch("/api/init", { method: "POST" })
    } catch (error) {
      console.error("Init admin error:", error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      setUsers(data.users || [])

      if (currentUser && currentUser.role === "user") {
        setSelectedControllerId(currentUser.id)
      }
    } catch (error) {
      console.error("Load users error:", error)
    }
  }

  const loadParticipants = async () => {
    try {
      const response = await fetch("/api/participants")
      const data = await response.json()
      setParticipants(data.participants || [])
    } catch (error) {
      console.error("Load participants error:", error)
    }
  }

  const searchParticipants = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const response = await fetch(`/api/participants/search?callsign=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.participants || [])
      setShowSearchResults(true)
    } catch (error) {
      console.error("Search participants error:", error)
      setSearchResults([])
    }
  }

  const selectParticipant = (participant: Participant) => {
    setCallsign(participant.callsign)
    setQth(participant.qth || "")
    setEquipment(participant.equipment || "")
    setAntenna(participant.antenna || "")
    setPower(participant.power || "")
    setSignal(participant.signal || "")
    setReport(participant.report || "")
    setRemarks(participant.remarks || "")

    setShowSearchResults(false)
    setSearchResults([])
  }

  // Search and select functions for each field from history records
  const searchFieldValues = async (field: string, query: string, setResults: any) => {
    if (query.length < 1) {
      setResults([])
      return
    }

    try {
      const response = await fetch(`/api/records/search?field=${field}&query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.values || [])
    } catch (error) {
      console.error(`Search ${field} error:`, error)
      setResults([])
    }
  }

  const searchParticipantsForEdit = async (query: string) => {
    if (query.length < 2) {
      setEditSearchResults([])
      setShowEditSearchResults(false)
      return
    }

    try {
      const response = await fetch(`/api/participants/search?callsign=${encodeURIComponent(query)}`)
      const data = await response.json()
      setEditSearchResults(data.participants || [])
      setShowEditSearchResults(true)
    } catch (error) {
      console.error("Search participants error:", error)
      setEditSearchResults([])
    }
  }

  const selectParticipantForEdit = (participant: Participant) => {
    setEditingRecord({
      ...editingRecord!,
      callsign: participant.callsign,
      qth: participant.qth || null,
      equipment: participant.equipment || null,
      antenna: participant.antenna || null,
      power: participant.power || null,
      signal: participant.signal || null,
      report: participant.report || null,
      remarks: participant.remarks || null,
    })

    setShowEditSearchResults(false)
    setEditSearchResults([])
  }

  useEffect(() => {
    if (selectedParticipantId) {
      const participant = participants.find((p) => p.id === selectedParticipantId)
      if (participant && useExistingData) {
        setCallsign(participant.callsign)
        setQth(participant.qth || "")
        setEquipment(participant.equipment || "")
        setAntenna(participant.antenna || "")
        setPower(participant.power || "")
        setSignal(participant.signal || "")
        setReport(participant.report || "")
        setRemarks(participant.remarks || "")
      }
    }
  }, [selectedParticipantId, participants, useExistingData])

  const startNewSession = async () => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controllerId: selectedControllerId,
          controllerName,
          controllerEquipment: controllerEquipment || null,
          controllerAntenna: controllerAntenna || null,
          controllerQth: controllerQth || null,
          sessionTime: new Date(sessionTime).toISOString(),
        }),
      })

      const data = await response.json()
      setCurrentSession(data.session)
      setRecords([])
      alert("新台网会话已创建")
    } catch (error) {
      console.error("Start session error:", error)
      alert("创建会话失败")
    }
  }

  const addRecord = async () => {
    if (!currentSession) {
      alert("请先创建台网会话")
      return
    }

    if (!callsign) {
      alert("请输入呼号")
      return
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/records/with-participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign,
          qth: qth || null,
          equipment: equipment || null,
          antenna: antenna || null,
          power: power || null,
          signal: signal || null,
          report: report || null,
          remarks: remarks || null,
        }),
      })

      const data = await response.json()
      setRecords([...records, data.record])

      // Reload participants to get updated data
      loadParticipants()

      // Clear form
      setCallsign("")
      setQth("")
      setEquipment("")
      setAntenna("")
      setPower("")
      setSignal("")
      setReport("")
      setRemarks("")
      setSelectedParticipantId("")

      const message = data.updated ? "记录已添加并更新参与人员库" : "记录已添加并创建新参与人员"
      alert(message)
    } catch (error) {
      console.error("Add record error:", error)
      alert("添加记录失败")
    }
  }

  const exportToExcel = async () => {
    if (!currentSession) {
      alert("没有可导出的会话")
      return
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/export`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `台网日志_${new Date(currentSession.sessionTime).toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
      alert("导出失败")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const createNewParticipant = async () => {
    if (!callsign) {
      alert("请输入呼号")
      return
    }

    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign,
          name: qth.split(" ")[0] || callsign,
          qth,
          equipment,
          antenna,
          power,
          signal,
          report,
          remarks,
        }),
      })

      const data = await response.json()
      setParticipants([...participants, data.participant])
      alert("参与人员已添加到数据库")
    } catch (error) {
      console.error("Create participant error:", error)
      alert("添加参与人员失败")
    }
  }

  const handleEditRecord = (record: LogRecord) => {
    setEditingRecord(record)
    setShowEditModal(true)
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!currentSession) return

    if (!confirm("确定要删除这条记录吗？")) {
      return
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/records/${recordId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("删除失败")
      }

      setRecords(records.filter((r) => r.id !== recordId))
      alert("记录已删除")
    } catch (error) {
      console.error("Delete record error:", error)
      alert("删除记录失败")
    }
  }

  const handleUpdateRecord = async () => {
    if (!currentSession || !editingRecord) return

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/records/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign: editingRecord.callsign,
          qth: editingRecord.qth || null,
          equipment: editingRecord.equipment || null,
          antenna: editingRecord.antenna || null,
          power: editingRecord.power || null,
          signal: editingRecord.signal || null,
          report: editingRecord.report || null,
          remarks: editingRecord.remarks || null,
        }),
      })

      const data = await response.json()

      // Update records list
      setRecords(records.map((r) => (r.id === editingRecord.id ? data.record : r)))

      // Update participant in database as well
      const participantResponse = await fetch(`/api/participants/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign: editingRecord.callsign,
          name: editingRecord.qth?.split(" ")[0] || editingRecord.callsign,
          qth: editingRecord.qth || null,
          equipment: editingRecord.equipment || null,
          antenna: editingRecord.antenna || null,
          power: editingRecord.power || null,
          signal: editingRecord.signal || null,
          report: editingRecord.report || null,
          remarks: editingRecord.remarks || null,
        }),
      })

      loadParticipants()
      setShowEditModal(false)
      setEditingRecord(null)
      alert("记录已更新并同步到参与人员库")
    } catch (error) {
      console.error("Update record error:", error)
      alert("更新记录失败")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            济南黄河业余无线电台网主控日志
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/query")}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              呼号查询
            </button>
            <span className="text-sm text-gray-600">
              当前用户: {currentUser?.name} ({currentUser?.role === "admin" ? "管理员" : "主控"})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Controller Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">台网主控人员信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentUser?.role === "admin" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主控人员
                </label>
                <select
                  value={selectedControllerId}
                  onChange={(e) => setSelectedControllerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">选择主控人员</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                台网时间
              </label>
              <input
                type="datetime-local"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主呼号
              </label>
              <input
                type="text"
                value={controllerName}
                onChange={(e) => setControllerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="主控人员姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                设备
              </label>
              <input
                type="text"
                value={controllerEquipment}
                onChange={(e) => setControllerEquipment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="主控设备"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                天线
              </label>
              <input
                type="text"
                value={controllerAntenna}
                onChange={(e) => setControllerAntenna(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="主控天线"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                QTH
              </label>
              <input
                type="text"
                value={controllerQth}
                onChange={(e) => setControllerQth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="主控位置"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useExistingData}
                onChange={(e) => setUseExistingData(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">使用数据库中的信息</span>
            </label>

            <button
              onClick={startNewSession}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              创建新台网会话
            </button>

            {currentSession && (
              <>
                <button
                  onClick={exportToExcel}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  导出Excel
                </button>
                <span className="text-sm text-gray-600 self-center">
                  会话ID: {currentSession.id}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Record Entry Section */}
        {currentSession && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Input Form */}
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4">台网记录信息录入</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    参与人员（可选）
                  </label>
                  <select
                    value={selectedParticipantId}
                    onChange={(e) => setSelectedParticipantId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  >
                    <option value="">选择参与人员</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.callsign} - {p.name || "未命名"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    呼号
                  </label>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => {
                      const value = e.target.value
                      setCallsign(value)
                      searchParticipants(value)
                    }}
                    onFocus={() => {
                      if (callsign.length >= 2) {
                        searchParticipants(callsign)
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding results to allow clicking
                      setTimeout(() => setShowSearchResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="输入呼号搜索，例如: BI4K"
                    autoComplete="off"
                  />
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((participant) => (
                        <div
                          key={participant.id}
                          onClick={() => selectParticipant(participant)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-black">
                            {participant.callsign}
                          </div>
                          <div className="text-sm text-black">
                            {participant.qth || "未知位置"} - {participant.equipment || "未知设备"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QTH
                  </label>
                  <input
                    type="text"
                    value={qth}
                    onChange={(e) => {
                      const value = e.target.value
                      setQth(value)
                      searchFieldValues("qth", value, setQthResults)
                    }}
                    onFocus={() => {
                      if (qth.length >= 1) {
                        searchFieldValues("qth", qth, setQthResults)
                        setShowQthResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowQthResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="位置信息"
                    autoComplete="off"
                  />
                  {showQthResults && qthResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {qthResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setQth(value)
                            setShowQthResults(false)
                            setQthResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    设备
                  </label>
                  <input
                    type="text"
                    value={equipment}
                    onChange={(e) => {
                      const value = e.target.value
                      setEquipment(value)
                      searchFieldValues("equipment", value, setEquipmentResults)
                    }}
                    onFocus={() => {
                      if (equipment.length >= 1) {
                        searchFieldValues("equipment", equipment, setEquipmentResults)
                        setShowEquipmentResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowEquipmentResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="设备型号"
                    autoComplete="off"
                  />
                  {showEquipmentResults && equipmentResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {equipmentResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setEquipment(value)
                            setShowEquipmentResults(false)
                            setEquipmentResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    天馈
                  </label>
                  <input
                    type="text"
                    value={antenna}
                    onChange={(e) => {
                      const value = e.target.value
                      setAntenna(value)
                      searchFieldValues("antenna", value, setAntennaResults)
                    }}
                    onFocus={() => {
                      if (antenna.length >= 1) {
                        searchFieldValues("antenna", antenna, setAntennaResults)
                        setShowAntennaResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowAntennaResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="天线类型"
                    autoComplete="off"
                  />
                  {showAntennaResults && antennaResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {antennaResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setAntenna(value)
                            setShowAntennaResults(false)
                            setAntennaResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    功率
                  </label>
                  <input
                    type="text"
                    value={power}
                    onChange={(e) => {
                      const value = e.target.value
                      setPower(value)
                      searchFieldValues("power", value, setPowerResults)
                    }}
                    onFocus={() => {
                      if (power.length >= 1) {
                        searchFieldValues("power", power, setPowerResults)
                        setShowPowerResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowPowerResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="发射功率"
                    autoComplete="off"
                  />
                  {showPowerResults && powerResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {powerResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setPower(value)
                            setShowPowerResults(false)
                            setPowerResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    信号
                  </label>
                  <input
                    type="text"
                    value={signal}
                    onChange={(e) => {
                      const value = e.target.value
                      setSignal(value)
                      searchFieldValues("signal", value, setSignalResults)
                    }}
                    onFocus={() => {
                      if (signal.length >= 1) {
                        searchFieldValues("signal", signal, setSignalResults)
                        setShowSignalResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSignalResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="信号报告"
                    autoComplete="off"
                  />
                  {showSignalResults && signalResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {signalResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setSignal(value)
                            setShowSignalResults(false)
                            setSignalResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    报告
                  </label>
                  <input
                    type="text"
                    value={report}
                    onChange={(e) => {
                      const value = e.target.value
                      setReport(value)
                      searchFieldValues("report", value, setReportResults)
                    }}
                    onFocus={() => {
                      if (report.length >= 1) {
                        searchFieldValues("report", report, setReportResults)
                        setShowReportResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowReportResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="其他报告"
                    autoComplete="off"
                  />
                  {showReportResults && reportResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {reportResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setReport(value)
                            setShowReportResults(false)
                            setReportResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => {
                      const value = e.target.value
                      setRemarks(value)
                      searchFieldValues("remarks", value, setRemarksResults)
                    }}
                    onFocus={() => {
                      if (remarks.length >= 1) {
                        searchFieldValues("remarks", remarks, setRemarksResults)
                        setShowRemarksResults(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowRemarksResults(false), 200)
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="备注信息"
                    autoComplete="off"
                  />
                  {showRemarksResults && remarksResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {remarksResults.map((value, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setRemarks(value)
                            setShowRemarksResults(false)
                            setRemarksResults([])
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black"
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={addRecord}
                    className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    添加记录
                  </button>
                  <button
                    onClick={createNewParticipant}
                    className="flex-1 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    保存到参与人员库
                  </button>
                </div>
              </div>
            </div>

            {/* Records Display */}
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-3">
              <h2 className="text-lg font-semibold mb-4">
                台网记录列表 ({records.length}条)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        序号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        呼号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        时间
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        QTH
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        设备
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        天馈
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        功率
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        信号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          暂无记录
                        </td>
                      </tr>
                    ) : (
                      [...records].reverse().map((record, index) => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {records.length - index}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.callsign}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {record.createdAt ? new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {record.qth || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {record.equipment || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {record.antenna || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {record.power || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {record.signal || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                删除
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
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">编辑记录 - {editingRecord.callsign}</h2>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    呼号
                  </label>
                  <input
                    type="text"
                    value={editingRecord.callsign}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditingRecord({ ...editingRecord, callsign: value })
                      searchParticipantsForEdit(value)
                    }}
                    onFocus={() => {
                      if (editingRecord.callsign.length >= 2) {
                        searchParticipantsForEdit(editingRecord.callsign)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowEditSearchResults(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="输入呼号搜索"
                    autoComplete="off"
                  />
                  {showEditSearchResults && editSearchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {editSearchResults.map((participant) => (
                        <div
                          key={participant.id}
                          onClick={() => selectParticipantForEdit(participant)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-black">
                            {participant.callsign}
                          </div>
                          <div className="text-sm text-black">
                            {participant.qth || "未知位置"} - {participant.equipment || "未知设备"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QTH
                  </label>
                  <input
                    type="text"
                    value={editingRecord.qth || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, qth: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    设备
                  </label>
                  <input
                    type="text"
                    value={editingRecord.equipment || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, equipment: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    天馈
                  </label>
                  <input
                    type="text"
                    value={editingRecord.antenna || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, antenna: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    功率
                  </label>
                  <input
                    type="text"
                    value={editingRecord.power || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, power: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    信号
                  </label>
                  <input
                    type="text"
                    value={editingRecord.signal || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, signal: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    报告
                  </label>
                  <input
                    type="text"
                    value={editingRecord.report || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, report: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={editingRecord.remarks || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, remarks: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleUpdateRecord}
                    className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    更新
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingRecord(null)
                    }}
                    className="flex-1 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Link */}
        {currentUser?.role === "admin" && (
          <div className="mt-6">
            <button
              onClick={() => router.push("/admin")}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              用户管理
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
