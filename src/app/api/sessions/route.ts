import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireAuth } from "@/lib/auth"

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
    // 使用服务端认证
    const user = await getAuthUser(request)
    const loginError = requireAuth(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }
    
    const body = await request.json()
    // controllerId 为 schema 必填项；前端未传时由服务端自动取当前登录用户，避免 Zod 校验 500。
    const payload = {
      ...body,
      controllerId: body.controllerId || (user && user.userId) || "",
    }
    const session = await logManager.createLogSession(payload)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "需要登录") {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }
    console.error("Create session error:", error)
    return NextResponse.json(
      { error: "创建会话失败" },
      { status: 500 }
    )
  }
}
