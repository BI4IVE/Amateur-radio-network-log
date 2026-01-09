import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getDb } from "coze-coding-dev-sdk"
import { logSessions } from "@/storage/database/shared/schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callsign = searchParams.get("callsign")

    if (!callsign) {
      return NextResponse.json(
        { error: "缺少呼号参数" },
        { status: 400 }
      )
    }

    // Get all records for this callsign
    const records = await logManager.getRecordsByCallsignInOneYear(callsign)

    // Filter records from the last year
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const recentRecords = records.filter(
      (record) => new Date(record.createdAt) >= oneYearAgo
    )

    // Get session IDs
    const sessionIds = recentRecords.map(r => r.sessionId)

    // Fetch session information
    const db = await getDb()
    const allSessions = await db
      .select()
      .from(logSessions)

    // Create a map of sessionId -> controller callsign
    const controllerMap = new Map()

    // Map controllerId to controller callsign
    // For now, we'll use the controllerName as the controller identifier
    recentRecords.forEach(record => {
      const session = allSessions.find(s => s.id === record.sessionId)
      if (session) {
        controllerMap.set(record.sessionId, session.controllerName)
      }
    })

    return NextResponse.json({
      callsign,
      totalParticipations: recentRecords.length,
      participationTimes: recentRecords.map((record) => ({
        time: record.createdAt,
        sessionId: record.sessionId,
        controllerCallsign: controllerMap.get(record.sessionId) || "未知",
      })),
    })
  } catch (error) {
    console.error("Search callsign error:", error)
    return NextResponse.json(
      { error: "查询失败" },
      { status: 500 }
    )
  }
}
