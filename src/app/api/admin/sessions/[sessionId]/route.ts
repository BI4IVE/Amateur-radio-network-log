// @version v1.5.9
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET - 获取会话详情（含记录）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { sessionId } = await params
    const { session, records } = await logManager.getSessionWithRecords(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ session, records })
  } catch (error) {
    console.error("Admin get session error:", error)
    return NextResponse.json(
      { error: "获取会话详情失败" },
      { status: 500 }
    )
  }
}

// PUT - 更新会话信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { sessionId } = await params
    const body = await request.json()

    const session = await logManager.updateLogSession(sessionId, body)

    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Admin update session error:", error)
    return NextResponse.json(
      { error: "更新会话失败" },
      { status: 500 }
    )
  }
}

// DELETE - 删除会话及其所有记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { sessionId } = await params

    // 先删除记录，再删除会话
    await logManager.deleteLogRecordsBySessionId(sessionId)
    const success = await logManager.deleteLogSession(sessionId)

    if (!success) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "会话已删除" })
  } catch (error) {
    console.error("Admin delete session error:", error)
    return NextResponse.json(
      { error: "删除会话失败" },
      { status: 500 }
    )
  }
}
