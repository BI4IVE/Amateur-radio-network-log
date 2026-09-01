// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { logManager, equipmentManager } from "@/storage/database"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireUser } from "@/lib/auth"
import { screenReadAuth, maskQthValue } from "@/lib/screenAccess"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 大屏数据公开控制：开放模式或已登录方可读取
    const access = await screenReadAuth(request)
    if (!access.ok) {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }

    const { sessionId } = await params
    const records = await logManager.getLogRecordsBySessionId(sessionId)

    // 「匿名 + 公开」组合下对 QTH 做服务端脱敏
    const result = access.maskQth
      ? records.map((r) => ({ ...r, qth: maskQthValue(r.qth) }))
      : records
    return NextResponse.json({ records: result })
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

    const user = await getAuthUser(request)
    const authError = requireUser(user)
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 401 })
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
        { error: "该会话已过期，无法添加记录" },
        { status: 403 }
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
    console.error("Create record error:", error)
    return NextResponse.json(
      { error: "创建记录失败" },
      { status: 500 }
    )
  }
}
