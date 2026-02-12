import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const records = await logManager.getLogRecordsBySessionId(sessionId)

    return NextResponse.json({ records })
  } catch (error) {
    console.error("Get records error:", error)
    return NextResponse.json(
      { error: "获取记录列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { userId, userRole } = body

    // 检查会话是否存在
    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // 检查会话是否已过期（6小时）
    if (isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期（超过6小时），无法添加记录" },
        { status: 403 }
      )
    }

    // 检查权限：管理员和主控都可以添加记录到任何会话
    if (userRole !== "admin" && userRole !== "user") {
      return NextResponse.json(
        { error: "您没有权限添加记录" },
        { status: 403 }
      )
    }

    const record = await logManager.createLogRecord({
      ...body,
      sessionId,
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("Create record error:", error)
    return NextResponse.json(
      { error: "创建记录失败" },
      { status: 500 }
    )
  }
}
