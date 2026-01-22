import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { broadcastToSession } from "@/app/api/sse/session/[sessionId]/subscribe/route"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const { sessionId, recordId } = await params
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
        { error: "该会话已过期（超过6小时），无法更新记录" },
        { status: 403 }
      )
    }

    // 检查权限：管理员可以修改任何会话的记录，主控只能修改自己会话的记录
    if (userRole !== "admin" && session.controllerId !== userId) {
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

    // 从查询参数获取用户信息
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const userRole = searchParams.get("userRole")

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

    // 检查权限：管理员可以删除任何会话的记录，主控只能删除自己会话的记录
    if (userRole !== "admin" && session.controllerId !== userId) {
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

    return NextResponse.json({ message: "记录已删除" })
  } catch (error) {
    console.error("Delete record error:", error)
    return NextResponse.json(
      { error: "删除记录失败" },
      { status: 500 }
    )
  }
}
