import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"

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

    return NextResponse.json({
      callsign,
      totalParticipations: recentRecords.length,
      participationTimes: recentRecords.map((record) => ({
        time: record.createdAt,
        sessionId: record.sessionId,
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
