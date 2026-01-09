import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const { recordId } = await params
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
    const { recordId } = await params
    const success = await logManager.deleteLogRecord(recordId)

    if (!success) {
      return NextResponse.json(
        { error: "记录不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "记录已删除" })
  } catch (error) {
    console.error("Delete record error:", error)
    return NextResponse.json(
      { error: "删除记录失败" },
      { status: 500 }
    )
  }
}
