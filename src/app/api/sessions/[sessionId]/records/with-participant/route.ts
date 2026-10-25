// @version v2.0.3
import { isAdminRole } from "@/lib/permissions"
import { NextRequest, NextResponse } from "next/server"
import { logManager, participantManager } from "@/storage/database"
import { isSessionExpired } from "@/storage/database/utils/sessionUtils"
import { getAuthUser, requireLogin } from "@/lib/auth"
import { pushRecordNotification } from "@/lib/wechat/pushService"

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
    if (!user || (!isAdminRole(user.role) && user.role !== "user")) {
      return NextResponse.json(
        { error: "您没有权限添加记录" },
        { status: 403 }
      )
    }

    // [数据规范] 呼号统一大写入库。前端已做「输入法感知转大写」，但个别浏览器在
    // 输入法组合提交后不再触发 input 事件，可能残留小写，这里做最后一道保证。
    const normalizedCallsign = String(body.callsign ?? "").trim().toUpperCase()

    // [v2.0.2] 同场次同呼号查重
    // 多主控协作时两边可能同时录到同一个人。默认拦截并回报「已是第几位」，
    // 主控确认后带 allowDuplicate 再提交一次即可放行（少数换设备重报的场景）。
    if (!body.allowDuplicate && normalizedCallsign) {
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

    // Add record to session
    const record = await logManager.createLogRecord({
      sessionId,
      callsign: normalizedCallsign,
      qth: body.qth || null,
      equipment: body.equipment || null,
      antenna: body.antenna || null,
      power: body.power || null,
      signal: body.signal || null,
      report: body.report || null,
      remarks: body.remarks || null,
    })

    // [v1.5.21 微信推送] 记录落库后异步推送参与回执（不 await，失败不影响主流程）
    pushRecordNotification({
      sessionId,
      recordId: record.id,
      callsign: record.callsign,
      qth: record.qth,
      equipment: record.equipment,
      antenna: record.antenna,
      signal: record.signal,
      report: record.report,
      sessionTime: session.sessionTime,
      recordTime: record.createdAt,
      title: session.title,
    }).catch((error) => {
      console.error("[records.with-participant] 微信推送触发异常:", error)
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

    return NextResponse.json({ record, participant: updatedParticipant }, { status: 201 })
  } catch (error) {
    console.error("Create record with participant error:", error)
    return NextResponse.json(
      { error: "创建记录失败" },
      { status: 500 }
    )
  }
}
