// @version v1.5.19
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { screenReadAuth, maskQthValue } from "@/lib/screenAccess"

// 获取单个会话详情（含记录），供"主控加入进行中台网"使用；开放模式或已登录方可读取
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

    // 获取会话详情
    const session = await logManager.getLogSessionById(sessionId)

    if (!session || session.deletedAt) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    // 获取会话的所有记录
    const records = await logManager.getLogRecordsBySessionId(sessionId)

    // 「匿名 + 公开」组合下对 QTH 做服务端脱敏
    const maskedSession = access.maskQth
      ? { ...session, controllerQth: maskQthValue(session.controllerQth) }
      : session
    const maskedRecords = access.maskQth
      ? records.map((r) => ({ ...r, qth: maskQthValue(r.qth) }))
      : records
    return NextResponse.json({
      session: maskedSession,
      records: maskedRecords,
    })
  } catch (error) {
    console.error("Get session details error:", error)
    return NextResponse.json(
      { error: "获取会话详情失败" },
      { status: 500 }
    )
  }
}
