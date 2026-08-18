// @version v1.5.11
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { broadcastToSession } from "@/app/api/sse/session/[sessionId]/subscribe/route"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireLogin } from "@/lib/auth"

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

    // 检查会话是否已过期（6小时）
    if (isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期（超过6小时），无法更新记录" },
        { status: 403 }
      )
    }

    // 检查权限：管理员和主控都可以修改任何记录
    if (!user || (user.role !== "admin" && user.role !== "user")) {
      return NextResponse.json(
        { error: "您没有权限修改此记录" },
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

    // 检查会话是否已过期（6小时）
    if (isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期（超过6小时），无法删除记录" },
        { status: 403 }
      )
    }

    // 检查权限：只有管理员可以删除记录
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "您没有权限删除此记录" },
        { status: 403 }
      )
    }

    const success = await logManager.deleteLogRecord(recordId)

    if (!success) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    // 广播记录删除
    broadcastToSession(sessionId, {
      type: "record_deleted",
      recordId,
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
