// @version v1.5.19
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import type { LogSession } from "@/storage/database/shared/schema"

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

// 北京时间（UTC+8）。中国全境无夏令时，固定 +8 偏移即可。
const BJ_OFFSET_MS = 8 * 60 * 60 * 1000

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function bjDateKey(d: Date) {
  const t = new Date(d.getTime() + BJ_OFFSET_MS)
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`
}

function bjParts(d: Date) {
  const t = new Date(d.getTime() + BJ_OFFSET_MS)
  return { month: t.getUTCMonth() + 1, day: t.getUTCDate(), weekday: t.getUTCDay() }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const controllerId = searchParams.get("controllerId") || undefined

    // getLogSessions 默认 limit=100 会截断历史，这里放大以统计全量
    const sessions = await logManager.getLogSessions({ controllerId, limit: 10000 })
    const sessionsData = (Array.isArray(sessions)
      ? sessions
      : ((sessions as any).sessions || [])) as LogSession[]

    // 预告（status=scheduled）尚未实际开台网，不参与场次/趋势统计
    const heldSessions = sessionsData.filter((s) => s.status !== "scheduled")

    const recordsBySession = new Map<string, any[]>()
    for (const session of heldSessions) {
      try {
        const recs = await logManager.getLogRecordsBySessionId(session.id)
        recordsBySession.set(
          session.id,
          Array.isArray(recs) ? recs : ((recs as any).records || [])
        )
      } catch (error) {
        console.error(`Failed to get records for session ${session.id}:`, error)
        recordsBySession.set(session.id, [])
      }
    }

    // 日期区间按北京时间整天处理（结束日期含当日 23:59:59）
    const startAt = startDate ? new Date(`${startDate}T00:00:00+08:00`) : null
    const endAt = endDate ? new Date(`${endDate}T23:59:59.999+08:00`) : null
    const inRange = (d: Date) => {
      if (startAt && d < startAt) return false
      if (endAt && d > endAt) return false
      return true
    }

    const filteredSessions = heldSessions
      .filter((s) => inRange(new Date(s.sessionTime)))
      .sort(
        (a, b) =>
          new Date(a.sessionTime).getTime() - new Date(b.sessionTime).getTime()
      )

    const recordsInRange = new Map<string, any[]>()
    for (const s of filteredSessions) {
      const rs = (recordsBySession.get(s.id) || []).filter((r) =>
        inRange(new Date(r.createdAt))
      )
      recordsInRange.set(s.id, rs)
    }

    const filteredRecords: any[] = []
    for (const rs of recordsInRange.values()) filteredRecords.push(...rs)

    const totalSessions = filteredSessions.length
    const totalRecords = filteredRecords.length
    const uniqueCallsigns = new Set(
      filteredRecords
        .map((r) => String(r.callsign || "").toUpperCase().trim())
        .filter(Boolean)
    ).size
    const avgPerSession =
      totalSessions > 0 ? Math.round((totalRecords / totalSessions) * 10) / 10 : 0

    // 1) 每场台网参与人数趋势（一天仅一场，按会话时间正序即为时间趋势）
    const trend = filteredSessions.map((s) => {
      const st = new Date(s.sessionTime)
      const p = bjParts(st)
      return {
        sessionId: s.id,
        date: bjDateKey(st),
        label: `${pad2(p.month)}-${pad2(p.day)}`,
        recordCount: (recordsInRange.get(s.id) || []).length,
        controllerName: s.controllerName,
      }
    })

    // 2) 呼号活跃排行 Top 10
    const callsignCount = new Map<string, number>()
    for (const r of filteredRecords) {
      const c = String(r.callsign || "").toUpperCase().trim()
      if (!c) continue
      callsignCount.set(c, (callsignCount.get(c) || 0) + 1)
    }
    const topCallsigns = Array.from(callsignCount.entries())
      .map(([callsign, count]) => ({ callsign, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 3) 主控场次排行 Top 10
    const ctrlMap = new Map<
      string,
      { controllerName: string; sessionCount: number; recordCount: number }
    >()
    for (const s of filteredSessions) {
      const key = s.controllerName || s.controllerId
      const cur =
        ctrlMap.get(key) || { controllerName: key, sessionCount: 0, recordCount: 0 }
      cur.sessionCount += 1
      cur.recordCount += (recordsInRange.get(s.id) || []).length
      ctrlMap.set(key, cur)
    }
    const controllerRanking = Array.from(ctrlMap.values())
      .sort(
        (a, b) => b.sessionCount - a.sessionCount || b.recordCount - a.recordCount
      )
      .slice(0, 10)

    // 4) 按周几活跃分布
    const weekday = WEEKDAY_LABELS.map((label, wd) => ({
      weekday: wd,
      label,
      sessionCount: 0,
      recordCount: 0,
    }))
    for (const s of filteredSessions) {
      const wd = bjParts(new Date(s.sessionTime)).weekday
      weekday[wd].sessionCount += 1
      weekday[wd].recordCount += (recordsInRange.get(s.id) || []).length
    }

    return NextResponse.json({
      summary: { totalSessions, totalRecords, uniqueCallsigns, avgPerSession },
      trend,
      topCallsigns,
      controllerRanking,
      weekday,
      range: { startDate: startDate || null, endDate: endDate || null },
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json({ error: "获取看板数据失败" }, { status: 500 })
  }
}
