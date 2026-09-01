// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// PUT - 更新记录（管理员专用，不过期检查）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { sessionId, recordId } = await params
    const body = await request.json()

    const record = await logManager.updateLogRecord(recordId, body)

    if (!record) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Admin update record error:", error)
    return NextResponse.json(
      { error: "更新记录失败" },
      { status: 500 }
    )
  }
}

// DELETE - 删除记录（管理员专用，不过期检查）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { recordId } = await params

    const success = await logManager.softDeleteLogRecord(recordId, {
      userId: user?.userId,
      username: user?.username,
    })

    if (!success) {
      return NextResponse.json(
        { error: "记录不存在或已删除" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "记录已移入回收站", recycled: true })
  } catch (error) {
    console.error("Admin delete record error:", error)
    return NextResponse.json(
      { error: "删除记录失败" },
      { status: 500 }
    )
  }
}
