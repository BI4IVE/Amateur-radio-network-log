"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { formatTime, formatDateTime, formatDate, toBeijingISOString, beijingToUTCISOString, utcToBeijingLocalString } from "@/utils/dateFormat"

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
  controllerId: string
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
  
  // 页面配置
  const [pageConfigs, setPageConfigs] = useState<Record<string, string>>({})
  
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

  // Session expiration
  const [sessionExpired, setSessionExpired] = useState(false)

  // Edit mode
  const [editingRecord, setEditingRecord] = useState<LogRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Active sessions modal
  const [showActiveSessionsModal, setShowActiveSessionsModal] = useState(false)
  const [activeSessions, setActiveSessions] = useState<Session[]>([])

  // Autocomplete states
  const [searchResults, setSearchResults] = useState<Participant[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1)

  // Edit autocomplete states
  const [editSearchResults, setEditSearchResults] = useState<Participant[]>([])
  const [showEditSearchResults, setShowEditSearchResults] = useState(false)
  const [selectedEditSearchIndex, setSelectedEditSearchIndex] = useState(-1)

  // Field autocomplete states (from history records)
  const [qthResults, setQthResults] = useState<string[]>([])
  const [showQthResults, setShowQthResults] = useState(false)
  const [selectedQthIndex, setSelectedQthIndex] = useState(-1)

  const [equipmentResults, setEquipmentResults] = useState<string[]>([])
  const [showEquipmentResults, setShowEquipmentResults] = useState(false)
  const [selectedEquipmentIndex, setSelectedEquipmentIndex] = useState(-1)

  const [antennaResults, setAntennaResults] = useState<string[]>([])
  const [showAntennaResults, setShowAntennaResults] = useState(false)
  const [selectedAntennaIndex, setSelectedAntennaIndex] = useState(-1)

  const [powerResults, setPowerResults] = useState<string[]>([])
  const [showPowerResults, setShowPowerResults] = useState(false)
  const [selectedPowerIndex, setSelectedPowerIndex] = useState(-1)

  const [signalResults, setSignalResults] = useState<string[]>([])
  const [showSignalResults, setShowSignalResults] = useState(false)
  const [selectedSignalIndex, setSelectedSignalIndex] = useState(-1)

  const [reportResults, setReportResults] = useState<string[]>([])
  const [showReportResults, setShowReportResults] = useState(false)
  const [selectedReportIndex, setSelectedReportIndex] = useState(-1)

  const [remarksResults, setRemarksResults] = useState<string[]>([])
  const [showRemarksResults, setShowRemarksResults] = useState(false)
  const [selectedRemarksIndex, setSelectedRemarksIndex] = useState(-1)

  // Refs for required fields
  const callsignRef = useRef<HTMLInputElement>(null)
  const qthRef = useRef<HTMLInputElement>(null)
  const antennaRef = useRef<HTMLInputElement>(null)
  const powerRef = useRef<HTMLInputElement>(null)
  const signalRef = useRef<HTMLInputElement>(null)

  // SSE connection ref
  const eventSourceRef = useRef<EventSource | null>(null)

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
      setSessionTime(toBeijingISOString())
      loadPageConfigs()
    }
  }, [currentUser])

  const loadPageConfigs = async () => {
    try {
      const response = await fetch("/api/page-configs")
      const data = await response.json()
      setPageConfigs(data.configs || {})
    } catch (error) {
      console.error("Load page configs error:", error)
    }
  }

  // SSE 实时连接
  useEffect(() => {
    if (!currentSession) return

    // 创建 SSE 连接
    const eventSource = new EventSource(`/api/sse/session/${currentSession.id}/subscribe`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case "connected":
            console.log("SSE connected to session:", currentSession.id)
            break

          case "record_added":
            setRecords((prev) => [...prev, data.record])
            break

          case "record_updated":
            setRecords((prev) =>
              prev.map((r) => (r.id === data.record.id ? data.record : r))
            )
            break

          case "record_deleted":
            setRecords((prev) => prev.filter((r) => r.id !== data.recordId))
            break
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [currentSession?.id])

  // 检查会话是否过期
  useEffect(() => {
    if (!currentSession) return

    const checkExpiration = () => {
      const sessionTime = new Date(currentSession.sessionTime)
      const now = new Date()
      const hoursSinceStart = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60)

      if (hoursSinceStart >= 6) {
        setSessionExpired(true)
      }
    }

    // 立即检查一次
    checkExpiration()

    // 每分钟检查一次
    const timer = setInterval(checkExpiration, 60 * 1000)

    return () => clearInterval(timer)
  }, [currentSession?.id, currentSession?.sessionTime])

  // Handle CTRL+Enter to add record
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault()
        addRecord()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [callsign, qth, equipment, antenna, power, signal, report, remarks, currentSession])

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

  const loadActiveSessions = async () => {
    try {
      const response = await fetch("/api/sessions")
      const data = await response.json()
      setActiveSessions(data.sessions || [])
      setShowActiveSessionsModal(true)
    } catch (error) {
      console.error("Load active sessions error:", error)
      alert("获取活跃会话失败")
    }
  }

  const joinSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/stats/session/${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        alert("无法加入该会话")
        return
      }

      // 设置当前会话和记录
      setCurrentSession(data.session)
      setRecords(data.records || [])

      // 更新输入框的值显示会话的实际时间
      setSessionTime(utcToBeijingLocalString(data.session.sessionTime))

      // 立即检查会话是否过期
      const sessionTime = new Date(data.session.sessionTime)
      const now = new Date()
      const hoursSinceStart = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60)
      setSessionExpired(hoursSinceStart >= 6)

      // 关闭模态框
      setShowActiveSessionsModal(false)
      setActiveSessions([])

      alert(`已加入 ${data.session.controllerName} 的台网会话`)
    } catch (error) {
      console.error("Join session error:", error)
      alert("加入会话失败")
    }
  }

  const searchParticipants = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      setSelectedSearchIndex(-1)
      return
    }

    try {
      const response = await fetch(`/api/participants/search?callsign=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.participants || [])
      setShowSearchResults(true)
      setSelectedSearchIndex(-1)
    } catch (error) {
      console.error("Search participants error:", error)
      setSearchResults([])
      setSelectedSearchIndex(-1)
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
    setSelectedSearchIndex(-1)
  }

  // Search and select functions for each field from history records
  const searchFieldValues = async (field: string, query: string, setResults: any, setIndex?: any) => {
    if (query.length < 1) {
      setResults([])
      if (setIndex) setIndex(-1)
      return
    }

    try {
      const response = await fetch(`/api/records/search?field=${field}&query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.values || [])
      if (setIndex) setIndex(-1)
    } catch (error) {
      console.error(`Search ${field} error:`, error)
      setResults([])
      if (setIndex) setIndex(-1)
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
          sessionTime: beijingToUTCISOString(sessionTime),
        }),
      })

      const data = await response.json()
      setCurrentSession(data.session)
      setRecords([])

      // 更新输入框的值显示会话的实际时间
      setSessionTime(utcToBeijingLocalString(data.session.sessionTime))

      // 新会话刚创建，肯定未过期
      setSessionExpired(false)

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

    // 检查会话是否过期
    if (sessionExpired) {
      alert("会话已超过6小时，无法添加记录")
      return
    }

    // 检查权限：管理员和主控都可以添加记录到任何会话
    if (currentUser?.role !== "admin" && currentUser?.role !== "user") {
      alert("您没有权限添加记录")
      return
    }

    // 验证必填字段
    if (!callsign || callsign.trim() === "") {
      alert("请输入呼号")
      callsignRef.current?.focus()
      return
    }

    if (!qth || qth.trim() === "") {
      alert("请输入QTH")
      qthRef.current?.focus()
      return
    }

    if (!antenna || antenna.trim() === "") {
      alert("请输入天馈")
      antennaRef.current?.focus()
      return
    }

    if (!power || power.trim() === "") {
      alert("请输入功率")
      powerRef.current?.focus()
      return
    }

    if (!signal || signal.trim() === "") {
      alert("请输入信号")
      signalRef.current?.focus()
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
          userId: currentUser?.id,
          userRole: currentUser?.role,
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

      // 光标自动回到呼号输入框
      setTimeout(() => {
        callsignRef.current?.focus()
      }, 100)
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
      link.download = `台网日志_${formatDate(currentSession.sessionTime)}.xlsx`
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

  const handleEditRecord = (record: LogRecord) => {
    // 检查权限：管理员和主控都可以编辑任何记录
    if (currentUser?.role !== "admin" && currentUser?.role !== "user") {
      alert("您没有权限编辑此记录")
      return
    }

    setEditingRecord(record)
    setShowEditModal(true)
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!currentSession) return

    // 检查会话是否过期
    if (sessionExpired) {
      alert("会话已超过6小时，无法删除记录")
      return
    }

    // 检查权限：只有管理员可以删除记录
    if (currentUser?.role !== "admin") {
      alert("您没有权限删除此记录")
      return
    }

    if (!confirm("确定要删除这条记录吗？")) {
      return
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/records/${recordId}?userId=${currentUser?.id}&userRole=${currentUser?.role}`, {
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

    // 检查会话是否过期
    if (sessionExpired) {
      alert("会话已超过6小时，无法更新记录")
      return
    }

    // 检查权限：管理员和主控都可以修改任何记录
    if (currentUser?.role !== "admin" && currentUser?.role !== "user") {
      alert("您没有权限修改此记录")
      setShowEditModal(false)
      setEditingRecord(null)
      return
    }

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
          userId: currentUser?.id,
          userRole: currentUser?.role,
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
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Radio/Antenna Icon */}
            <div className="bg-white/20 rounded-lg p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">
              {pageConfigs.home_header_title || "济南黄河业余无线电台网主控日志"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/query")}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 backdrop-blur-sm transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              呼号查询
            </button>
            {currentUser?.role === "admin" && (
              <>
                <button
                  onClick={() => router.push("/admin/stats")}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 backdrop-blur-sm transition-all duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                    />
                  </svg>
                  台网统计
                </button>
                <button
                  onClick={() => router.push("/admin/tools")}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 backdrop-blur-sm transition-all duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  管理工具
                </button>
              </>
            )}
            <span className="text-sm text-white/90">
              当前用户: {currentUser?.name} ({currentUser?.role === "admin" ? "管理员" : "主控"})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Controller Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-indigo-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-black">台网主控人员信息</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentUser?.role === "admin" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主控人员
                </label>
                <select
                  value={selectedControllerId}
                  onChange={(e) => setSelectedControllerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
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
                onChange={(e) => setControllerName(e.target.value.toUpperCase())}
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
                onChange={(e) => setControllerEquipment(e.target.value.toUpperCase())}
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
                onChange={(e) => setControllerAntenna(e.target.value.toUpperCase())}
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
                onChange={(e) => setControllerQth(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="主控位置"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4 flex-wrap">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useExistingData}
                onChange={(e) => setUseExistingData(e.target.checked)}
                className="mr-2 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">使用数据库中的信息</span>
            </label>

            <button
              onClick={startNewSession}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              创建新台网会话
            </button>
            <button
              onClick={loadActiveSessions}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              查看当前台网
            </button>
            <button
              onClick={() => router.push("/admin/stats")}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              查看历史台网
            </button>

            {currentSession && (
              <>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  导出Excel
                </button>
                <span className="text-sm text-gray-600 self-center bg-gray-100 px-3 py-1 rounded-full">
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
            <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-1 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-indigo-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-black">台网记录信息录入</h2>
              </div>
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
                    呼号 *
                  </label>
                  <input
                    ref={callsignRef}
                    type="text"
                    value={callsign}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setCallsign(value)
                      searchParticipants(value)
                    }}
                    onKeyDown={(e) => {
                      if (showSearchResults && searchResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedSearchIndex((prev) =>
                            prev < searchResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedSearchIndex >= 0) {
                          e.preventDefault()
                          selectParticipant(searchResults[selectedSearchIndex])
                        } else if (e.key === "Escape") {
                          setShowSearchResults(false)
                          setSelectedSearchIndex(-1)
                        }
                      }
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
                      {searchResults.map((participant, index) => (
                        <div
                          key={participant.id}
                          onClick={() => selectParticipant(participant)}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            index === selectedSearchIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
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
                    QTH *
                  </label>
                  <input
                    ref={qthRef}
                    type="text"
                    value={qth}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setQth(value)
                      searchFieldValues("qth", value, setQthResults, setSelectedQthIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showQthResults && qthResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedQthIndex((prev) =>
                            prev < qthResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedQthIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedQthIndex >= 0) {
                          e.preventDefault()
                          setQth(qthResults[selectedQthIndex])
                          setShowQthResults(false)
                          setQthResults([])
                          setSelectedQthIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowQthResults(false)
                          setSelectedQthIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (qth.length >= 1) {
                        searchFieldValues("qth", qth, setQthResults, setSelectedQthIndex)
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
                            setSelectedQthIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedQthIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
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
                      const value = e.target.value.toUpperCase()
                      setEquipment(value)
                      searchFieldValues("equipment", value, setEquipmentResults, setSelectedEquipmentIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showEquipmentResults && equipmentResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedEquipmentIndex((prev) =>
                            prev < equipmentResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedEquipmentIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedEquipmentIndex >= 0) {
                          e.preventDefault()
                          setEquipment(equipmentResults[selectedEquipmentIndex])
                          setShowEquipmentResults(false)
                          setEquipmentResults([])
                          setSelectedEquipmentIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowEquipmentResults(false)
                          setSelectedEquipmentIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (equipment.length >= 1) {
                        searchFieldValues("equipment", equipment, setEquipmentResults, setSelectedEquipmentIndex)
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
                            setSelectedEquipmentIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedEquipmentIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    天馈 *
                  </label>
                  <input
                    ref={antennaRef}
                    type="text"
                    value={antenna}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setAntenna(value)
                      searchFieldValues("antenna", value, setAntennaResults, setSelectedAntennaIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showAntennaResults && antennaResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedAntennaIndex((prev) =>
                            prev < antennaResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedAntennaIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedAntennaIndex >= 0) {
                          e.preventDefault()
                          setAntenna(antennaResults[selectedAntennaIndex])
                          setShowAntennaResults(false)
                          setAntennaResults([])
                          setSelectedAntennaIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowAntennaResults(false)
                          setSelectedAntennaIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (antenna.length >= 1) {
                        searchFieldValues("antenna", antenna, setAntennaResults, setSelectedAntennaIndex)
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
                            setSelectedAntennaIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedAntennaIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    功率 *
                  </label>
                  <input
                    ref={powerRef}
                    type="text"
                    value={power}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setPower(value)
                      searchFieldValues("power", value, setPowerResults, setSelectedPowerIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showPowerResults && powerResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedPowerIndex((prev) =>
                            prev < powerResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedPowerIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedPowerIndex >= 0) {
                          e.preventDefault()
                          setPower(powerResults[selectedPowerIndex])
                          setShowPowerResults(false)
                          setPowerResults([])
                          setSelectedPowerIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowPowerResults(false)
                          setSelectedPowerIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (power.length >= 1) {
                        searchFieldValues("power", power, setPowerResults, setSelectedPowerIndex)
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
                            setSelectedPowerIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedPowerIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    信号 *
                  </label>
                  <input
                    ref={signalRef}
                    type="text"
                    value={signal}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setSignal(value)
                      searchFieldValues("signal", value, setSignalResults, setSelectedSignalIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showSignalResults && signalResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedSignalIndex((prev) =>
                            prev < signalResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedSignalIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedSignalIndex >= 0) {
                          e.preventDefault()
                          setSignal(signalResults[selectedSignalIndex])
                          setShowSignalResults(false)
                          setSignalResults([])
                          setSelectedSignalIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowSignalResults(false)
                          setSelectedSignalIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (signal.length >= 1) {
                        searchFieldValues("signal", signal, setSignalResults, setSelectedSignalIndex)
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
                            setSelectedSignalIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedSignalIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
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
                      const value = e.target.value.toUpperCase()
                      setReport(value)
                      searchFieldValues("report", value, setReportResults, setSelectedReportIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showReportResults && reportResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedReportIndex((prev) =>
                            prev < reportResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedReportIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedReportIndex >= 0) {
                          e.preventDefault()
                          setReport(reportResults[selectedReportIndex])
                          setShowReportResults(false)
                          setReportResults([])
                          setSelectedReportIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowReportResults(false)
                          setSelectedReportIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (report.length >= 1) {
                        searchFieldValues("report", report, setReportResults, setSelectedReportIndex)
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
                            setSelectedReportIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedReportIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
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
                      const value = e.target.value.toUpperCase()
                      setRemarks(value)
                      searchFieldValues("remarks", value, setRemarksResults, setSelectedRemarksIndex)
                    }}
                    onKeyDown={(e) => {
                      if (showRemarksResults && remarksResults.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSelectedRemarksIndex((prev) =>
                            prev < remarksResults.length - 1 ? prev + 1 : prev
                          )
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSelectedRemarksIndex((prev) => (prev > 0 ? prev - 1 : -1))
                        } else if (e.key === "Enter" && selectedRemarksIndex >= 0) {
                          e.preventDefault()
                          setRemarks(remarksResults[selectedRemarksIndex])
                          setShowRemarksResults(false)
                          setRemarksResults([])
                          setSelectedRemarksIndex(-1)
                        } else if (e.key === "Escape") {
                          setShowRemarksResults(false)
                          setSelectedRemarksIndex(-1)
                        }
                      }
                    }}
                    onFocus={() => {
                      if (remarks.length >= 1) {
                        searchFieldValues("remarks", remarks, setRemarksResults, setSelectedRemarksIndex)
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
                            setSelectedRemarksIndex(-1)
                          }}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm text-black ${
                            index === selectedRemarksIndex ? "bg-indigo-100" : "hover:bg-gray-100"
                          }`}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={addRecord}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  添加记录 (Ctrl+Enter)
                </button>
              </div>
            </div>

            {/* Records Display */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-indigo-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-black">
                  台网记录列表 ({records.length}条)
                </h2>
                {sessionExpired && (
                  <div className="ml-auto px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      会话已超过6小时，无法添加、更新或删除记录
                    </span>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {records.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-12 h-12 text-gray-300 mb-2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
                            暂无记录
                          </div>
                        </td>
                      </tr>
                    ) : (
                      [...records].reverse().map((record, index) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {records.length - index}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {record.callsign}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatTime(record.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {record.qth || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {record.equipment || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {record.antenna || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {record.power || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {record.signal || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              {/* 管理员：显示编辑和删除 */}
                              {currentUser?.role === "admin" && (
                                <>
                                  <button
                                    onClick={() => handleEditRecord(record)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                                      />
                                    </svg>
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                      />
                                    </svg>
                                    删除
                                  </button>
                                </>
                              )}
                              {/* 主控：只显示编辑，不显示删除 */}
                              {currentUser?.role === "user" && (
                                <button
                                  onClick={() => handleEditRecord(record)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                                    />
                                  </svg>
                                  编辑
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
        )}

        {/* Edit Modal */}
        {showEditModal && editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-in-out]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <div className="bg-indigo-100 rounded-lg p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-indigo-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                    />
                  </svg>
                </div>
                编辑记录 - {editingRecord.callsign}
              </h2>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    呼号
                  </label>
                  <input
                    type="text"
                    value={editingRecord.callsign}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
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
                      setEditingRecord({ ...editingRecord, qth: e.target.value.toUpperCase() })
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
                      setEditingRecord({ ...editingRecord, equipment: e.target.value.toUpperCase() })
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
                      setEditingRecord({ ...editingRecord, antenna: e.target.value.toUpperCase() })
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
                      setEditingRecord({ ...editingRecord, power: e.target.value.toUpperCase() })
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
                      setEditingRecord({ ...editingRecord, signal: e.target.value.toUpperCase() })
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
                      setEditingRecord({ ...editingRecord, report: e.target.value.toUpperCase() })
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
                      setEditingRecord({ ...editingRecord, remarks: e.target.value.toUpperCase() })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleUpdateRecord}
                    className="flex items-center justify-center gap-2 flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    更新
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingRecord(null)
                    }}
                    className="flex items-center justify-center gap-2 flex-1 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions Modal */}
        {showActiveSessionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-in-out]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <div className="bg-amber-100 rounded-lg p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-amber-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                当前台网会话
              </h2>

              {activeSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-16 h-16 mx-auto text-gray-300 mb-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <p className="text-lg">当前没有活跃的台网会话</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-green-100 rounded-full p-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4 text-green-600"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5.25 14.25h13.5m-13.5 0a3.375 3.375 0 01-3.375-3.375V6.375a3.375 3.375 0 013.375-3.375h13.5a3.375 3.375 0 013.375 3.375v4.5c0 .621.504 1.125 1.125 1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5a3.375 3.375 0 01-3.375 3.375H8.25m-1.5 0a2.25 2.25 0 002.25-2.25V8.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125-.504 1.125-1.125V5.25a2.25 2.25 0 00-2.25-2.25h-9.75A2.25 2.25 0 00.75 5.25v10.5a2.25 2.25 0 002.25 2.25z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                              主控: {session.controllerName}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">台网时间:</span>{" "}
                              {formatDateTime(session.sessionTime)}
                            </div>
                            <div>
                              <span className="font-medium">QTH:</span>{" "}
                              {session.controllerQth || "未设置"}
                            </div>
                            <div>
                              <span className="font-medium">设备:</span>{" "}
                              {session.controllerEquipment || "未设置"}
                            </div>
                            <div>
                              <span className="font-medium">天线:</span>{" "}
                              {session.controllerAntenna || "未设置"}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => joinSession(session.id)}
                          className="ml-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
                        >
                          加入会话
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowActiveSessionsModal(false)
                    setActiveSessions([])
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
