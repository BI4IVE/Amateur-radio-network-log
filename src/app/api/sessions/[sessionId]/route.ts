// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireUser } from "@/lib/auth"

// 获取单个会话详情（含记录），登录用户即可访问，供"主控加入进行中台网"使用
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const authError = requireUser(user)
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 401 })
    }

    const { sessionId } = await params

    // 获取会话详情
    const session = await logManager.getLogSessionById(sessionId)

    if (!session || session.deletedAt) {
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
