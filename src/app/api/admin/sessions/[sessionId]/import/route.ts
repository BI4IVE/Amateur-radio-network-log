// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"
import { logManager, equipmentManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// POST - 批量导入台网记录到指定会话（管理员专用）
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
    const { records } = body

    const session = await logManager.getLogSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "导入数据为空" },
        { status: 400 }
      )
    }

    const created: any[] = []
    const errors: { index: number; error: string }[] = []

    for (let i = 0; i < records.length; i++) {
      try {
        const record = await logManager.createLogRecord({
          sessionId,
          callsign: records[i].callsign || "",
          qth: records[i].qth || null,
          equipment: records[i].equipment || null,
          antenna: records[i].antenna || null,
          power: records[i].power || null,
          signal: records[i].signal || null,
          report: records[i].report || null,
          remarks: records[i].remarks || null,
        })
        created.push(record)

        // 自动同步设备到设备库
        if (records[i].equipment && records[i].equipment.trim()) {
          await equipmentManager.autoSyncEquipment(records[i].equipment.trim())
        }
      } catch (err: any) {
        errors.push({ index: i + 1, error: err.message || "导入失败" })
      }
    }

    return NextResponse.json({
      success: true,
      total: records.length,
      imported: created.length,
      errors,
    })
  } catch (error) {
    console.error("Admin import records error:", error)
    return NextResponse.json(
      { error: "导入记录失败" },
      { status: 500 }
    )
  }
}
