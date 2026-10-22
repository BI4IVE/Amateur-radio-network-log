// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { requirePermission } from "@/lib/permissions-server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // [v1.5.29 权限] 与台网统计同一权限点
    const auth = await requirePermission(request, "ops.stats")
    if ("error" in auth) return auth.error

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
