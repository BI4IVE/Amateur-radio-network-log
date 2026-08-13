// @version v1.5.9
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { id: sessionId } = await params

    // 获取会话详情
    const session = await logManager.getLogSessionById(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // 获取会话的所有记录
    const records = await logManager.getLogRecordsBySessionId(sessionId)

    return NextResponse.json({
      session,
      records,
    })
  } catch (error) {
    console.error("Get session details error:", error)
    return NextResponse.json(
      { error: "获取会话详情失败" },
      { status: 500 }
    )
  }
}
