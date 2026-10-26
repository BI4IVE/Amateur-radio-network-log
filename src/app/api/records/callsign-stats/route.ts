// @version v2.0.4
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getDb } from "@/storage/database/db"
import { logSessions } from "@/storage/database/shared/schema"
// [v1.5.10] 呼号参与查询为公开接口，无需登录（middleware 已将 /api/records/callsign-stats 列入 publicPaths）

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

    // Fetch session information (need session_time for correct date grouping)
    const db = await getDb()
    const allSessions = await db
      .select()
      .from(logSessions)

    // Map sessionId -> session (含 session_time / controllerName)
    const sessionMap = new Map(allSessions.map((s) => [s.id, s]))

    // 按「台网时间(session_time)」过滤最近一年，而非录入时间(createdAt)，
    // 这样与后台历史台网(按 session_time 归类)保持一致，避免「同一天录入的历史记录被算到当天」。
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const recentRecords = records.filter((record) => {
      const session = sessionMap.get(record.sessionId)
      const refTime = session ? new Date(session.sessionTime) : new Date(record.createdAt)
      return refTime >= oneYearAgo
    })

    // [v2.0.3] 查询口径改为「本月」（北京时间自然月）；显式传 range=year 时才退回近一年（兼容旧调用）
    const ymFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
    })
    const currentYm = ymFmt.format(new Date())

    const withTime = recentRecords.map((record) => {
      const session = sessionMap.get(record.sessionId)
      // 用台网时间归类（与后台历史一致）；无 session 时回退录入时间
      const refTime = session ? new Date(session.sessionTime) : new Date(record.createdAt)
      return { record, session, refTime }
    })

    const monthItems = withTime.filter((item) => ymFmt.format(item.refTime) === currentYm)
    const monthParticipations = monthItems.length

    const range = (searchParams.get("range") || "month").toLowerCase()
    const scoped = range === "year" ? withTime : monthItems

    // Create a map of sessionId -> controller callsign
    const controllerMap = new Map()
    scoped.forEach(({ record, session }) => {
      if (session) {
        controllerMap.set(record.sessionId, session.controllerName)
      }
    })

    return NextResponse.json({
      callsign,
      range: range === "year" ? "year" : "month",
      totalParticipations: scoped.length,
      monthParticipations,
      participationTimes: scoped.map(({ record, session }) => ({
        time: session ? session.sessionTime : record.createdAt,
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
