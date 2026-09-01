// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { logManager, equipmentManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET - 获取会话的所有记录
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

    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    const records = await logManager.getLogRecordsBySessionId(sessionId)
    return NextResponse.json({ records })
  } catch (error) {
    console.error("Admin get records error:", error)
    return NextResponse.json(
      { error: "获取记录列表失败" },
      { status: 500 }
    )
  }
}

// POST - 添加记录（管理员专用，不过期检查）
export async function POST(
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

    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    const record = await logManager.createLogRecord({
      ...body,
      sessionId,
    })

    // 自动同步设备到设备库
    if (body.equipment && body.equipment.trim()) {
      await equipmentManager.autoSyncEquipment(body.equipment.trim())
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("Admin create record error:", error)
    return NextResponse.json(
      { error: "添加记录失败" },
      { status: 500 }
    )
  }
}
