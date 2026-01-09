import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"

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
