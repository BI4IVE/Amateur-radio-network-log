import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    // 获取所有台网会话
    const sessions = await logManager.getLogSessions({})
    const sessionsData = Array.isArray(sessions) ? sessions : (sessions as any).sessions || []

    // 获取所有台网记录
    // 从会话中获取所有记录
    const allRecords: any[] = []
    for (const session of sessionsData) {
      try {
        const sessionRecords = await logManager.getLogRecordsBySessionId(session.id)
        const records = Array.isArray(sessionRecords) ? sessionRecords : (sessionRecords as any).records || []
        allRecords.push(...records)
      } catch (error) {
        console.error(`Failed to get records for session ${session.id}:`, error)
      }
    }

    // 如果有日期过滤，进行过滤
    let filteredSessions = sessionsData
    let filteredRecords = allRecords

    if (startDate || endDate) {
      filteredRecords = allRecords.filter((record) => {
        const recordDate = new Date(record.createdAt)
        if (startDate && recordDate < new Date(startDate)) return false
        if (endDate && recordDate > new Date(endDate)) return false
        return true
      })

      filteredSessions = sessionsData.filter((session) => {
        const sessionDate = new Date(session.sessionTime)
        if (startDate && sessionDate < new Date(startDate)) return false
        if (endDate && sessionDate > new Date(endDate)) return false
        return true
      })
    }

    // 计算统计信息
    const totalSessions = filteredSessions.length
    const totalRecords = filteredRecords.length

    // 计算每个会话的记录数
    const sessionStats = filteredSessions.map((session) => {
      const sessionRecords = filteredRecords.filter(
        (record) => record.sessionId === session.id
      )
      return {
        ...session,
        recordCount: sessionRecords.length,
      }
    })

    // 统计唯一呼号
    const uniqueCallsigns = new Set(filteredRecords.map((r) => r.callsign))
    const totalUniqueCallsigns = uniqueCallsigns.size

    // 按呼号统计参与次数
    const callsignStats: Record<string, number> = {}
    filteredRecords.forEach((record) => {
      const callsign = record.callsign.toUpperCase()
      callsignStats[callsign] = (callsignStats[callsign] || 0) + 1
    })

    const callsignStatsArray = Object.entries(callsignStats)
      .map(([callsign, count]) => ({ callsign, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      stats: {
        totalSessions,
        totalRecords,
        totalUniqueCallsigns,
      },
      sessions: sessionStats,
      callsignStats: callsignStatsArray,
    })
  } catch (error) {
    console.error("Get stats error:", error)
    return NextResponse.json(
      { error: "获取统计信息失败" },
      { status: 500 }
    )
  }
}
