// @version v2.0.3
import { NextRequest, NextResponse } from "next/server"
import { logManager, equipmentManager } from "@/storage/database"
import { getAuthUser } from "@/lib/auth"
import { checkPermission } from "@/lib/permissions-server"

// GET - 获取会话的所有记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = await checkPermission(request, "logs.view")
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
    const adminError = await checkPermission(request, "logs.edit")
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

    // [数据规范] 呼号统一大写入库（前端可能因输入法组合残留小写）
    const normalizedCallsign = String(body.callsign ?? "").trim().toUpperCase()
    const { allowDuplicate, ...rest } = body

    // [v2.0.2] 后台补录同样查重，避免历史场次被重复录入同一个人
    if (!allowDuplicate && normalizedCallsign) {
      const duplicate = await logManager.findDuplicateRecord(
        sessionId,
        normalizedCallsign
      )
      if (duplicate) {
        return NextResponse.json(
          {
            error: "duplicate",
            message: "本呼号已参加过本次台网",
            existing: {
              id: duplicate.record.id,
              callsign: duplicate.record.callsign,
              seq: duplicate.seq,
              signal: duplicate.record.signal,
              qth: duplicate.record.qth,
              createdAt: duplicate.record.createdAt,
            },
          },
          { status: 409 }
        )
      }
    }

    const record = await logManager.createLogRecord({
      ...rest,
      callsign: normalizedCallsign,
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
