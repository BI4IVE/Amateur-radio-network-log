import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const controllerId = searchParams.get("controllerId") || undefined

    const sessions = await logManager.getLogSessions({
      controllerId,
    })

    // 过滤掉已过期的会话（超过6小时）
    const activeSessions = sessions.filter(session => !isSessionExpired(session.sessionTime))

    return NextResponse.json({ sessions: activeSessions })
  } catch (error) {
    console.error("Get sessions error:", error)
    return NextResponse.json(
      { error: "获取会话列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const session = await logManager.createLogSession(body)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("Create session error:", error)
    return NextResponse.json(
      { error: "创建会话失败" },
      { status: 500 }
    )
  }
}
