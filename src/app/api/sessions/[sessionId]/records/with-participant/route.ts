// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { logManager, participantManager } from "@/storage/database"
import { broadcastToSession } from "@/app/api/sse/session/[sessionId]/subscribe/route"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
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

    // 检查会话是否已过期（时限由后台配置，默认 6 小时）
    if (await isSessionExpired(session.sessionTime)) {
      return NextResponse.json(
        { error: "该会话已过期，无法添加记录" },
        { status: 403 }
      )
    }

    // 检查权限：管理员和主控都可以添加记录到任何会话
    if (!user || (user.role !== "admin" && user.role !== "user")) {
      return NextResponse.json(
        { error: "您没有权限添加记录" },
        { status: 403 }
      )
    }

    // Add record to session
    const record = await logManager.createLogRecord({
      sessionId,
      callsign: body.callsign,
      qth: body.qth || null,
      equipment: body.equipment || null,
      antenna: body.antenna || null,
      power: body.power || null,
      signal: body.signal || null,
      report: body.report || null,
      remarks: body.remarks || null,
    })

    // Update or create participant in database
    const existingParticipant = await participantManager.getParticipantByCallsign(
      body.callsign
    )

    const participantData = {
      callsign: body.callsign,
      name: body.qth?.split(" ")[0] || body.callsign,
      qth: body.qth || null,
      equipment: body.equipment || null,
      antenna: body.antenna || null,
      power: body.power || null,
      signal: body.signal || null,
      report: body.report || null,
      remarks: body.remarks || null,
    }

    let updatedParticipant
    if (existingParticipant) {
      // Update existing participant with latest data
      updatedParticipant = await participantManager.updateParticipant(
        existingParticipant.id,
        participantData
      )
    } else {
      // Create new participant
      updatedParticipant = await participantManager.createParticipant(
        participantData
      )
    }

    // 广播新记录
    broadcastToSession(sessionId, {
      type: "record_added",
      record,
    })

    return NextResponse.json({ record, participant: updatedParticipant }, { status: 201 })
  } catch (error) {
    console.error("Create record with participant error:", error)
    return NextResponse.json(
      { error: "创建记录失败" },
      { status: 500 }
    )
  }
}
