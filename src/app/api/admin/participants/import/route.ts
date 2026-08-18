// @version v1.5.11
import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// POST - 批量导入参与者（管理员专用，基于 callsign upsert）
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = await request.json()
    const { participants } = body

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "导入数据为空" },
        { status: 400 }
      )
    }

    const created: any[] = []
    const updated: any[] = []
    const errors: { index: number; callsign: string; error: string }[] = []

    for (let i = 0; i < participants.length; i++) {
      const item = participants[i]
      if (!item.callsign) {
        errors.push({ index: i + 1, callsign: "-", error: "呼号不能为空" })
        continue
      }

      try {
        const existing = await participantManager.getParticipantByCallsign(item.callsign)

        if (existing) {
          const result = await participantManager.updateParticipant(existing.id, {
            name: item.name || null,
            qth: item.qth || null,
            equipment: item.equipment || null,
            antenna: item.antenna || null,
            power: item.power || null,
            signal: item.signal || null,
            report: item.report || null,
            remarks: item.remarks || null,
          })
          if (result) updated.push(result)
        } else {
          const result = await participantManager.createParticipant({
            callsign: item.callsign,
            name: item.name || null,
            qth: item.qth || null,
            equipment: item.equipment || null,
            antenna: item.antenna || null,
            power: item.power || null,
            signal: item.signal || null,
            report: item.report || null,
            remarks: item.remarks || null,
          })
          created.push(result)
        }
      } catch (err: any) {
        errors.push({ index: i + 1, callsign: item.callsign, error: err.message || "导入失败" })
      }
    }

    return NextResponse.json({
      success: true,
      total: participants.length,
      created: created.length,
      updated: updated.length,
      errors,
    })
  } catch (error) {
    console.error("Admin import participants error:", error)
    return NextResponse.json(
      { error: "导入参与者失败" },
      { status: 500 }
    )
  }
}
