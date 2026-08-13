// @version v1.5.8
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

    // 一天仅允许一场台网：若当天（北京时间）已存在台网，则禁止新建，只能修改
    const sessionDate = body.sessionTime ? new Date(body.sessionTime) : new Date()
    const existing = await logManager.findSessionByBeijingDate(sessionDate)
    if (existing) {
      return NextResponse.json(
        {
          error: "今天已存在台网记录，无法重复录入。请到「台网历史管理」中修改已有的台网记录。",
          existingSessionId: existing.id,
        },
        { status: 409 }
      )
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
