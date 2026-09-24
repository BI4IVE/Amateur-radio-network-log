// @version v1.5.23
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { broadcastToSession } from "@/app/api/sse/session/[sessionId]/subscribe/route"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireLogin } from "@/lib/auth"

// [权限模型说明] 本系统权限仅区分「已登录」与「匿名」：
// 所有已登录用户（内部人员）均可增改删任意台网记录，不做按人/按主控的归属隔离。
// 因此本接口只做登录校验（requireLogin）+ 会话存在性/过期校验，不再做主控归属校验。

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const { sessionId, recordId } = await params
    const body = await request.json()

    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    // 检查会话是否存在
    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // 检查会话是否已过期（时限由后台配置，默认 6 小时）
    if (await isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期，无法更新记录" },
        { status: 403 }
      )
    }

    const record = await logManager.updateLogRecord(recordId, body)

    if (!record) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    // 广播记录更新
    broadcastToSession(sessionId, {
      type: "record_updated",
      record,
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Update record error:", error)
    return NextResponse.json(
      { error: "更新记录失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const { sessionId, recordId } = await params

    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    // 检查会话是否存在
    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // 检查会话是否已过期（时限由后台配置，默认 6 小时）
    if (await isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期，无法删除记录" },
        { status: 403 }
      )
    }

    const success = await logManager.softDeleteLogRecord(recordId, {
      userId: user?.userId,
      username: user?.username,
    })

    if (!success) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    // 广播记录删除（软删，带 deletedAt 标记便于前端隐藏）
    broadcastToSession(sessionId, {
      type: "record_deleted",
      recordId,
      deletedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete record error:", error)
    return NextResponse.json(
      { error: "删除记录失败" },
      { status: 500 }
    )
  }
}
