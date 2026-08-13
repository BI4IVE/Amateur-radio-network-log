// @version v1.5.9
import { NextRequest, NextResponse } from "next/server"
import { equipmentManager } from "@/storage/database/equipmentManager"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// POST /api/admin/equipments/import-from-records
// 从历史台网记录中提取所有设备名称并导入设备库
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    // 获取所有会话
    const sessions = await logManager.getLogSessions({ limit: 10000 })
    
    // 从所有会话中提取设备名称
    const equipmentSet = new Set<string>()
    
    for (const session of sessions) {
      const records = await logManager.getLogRecordsBySessionId(session.id)
      for (const record of records) {
        if (record.equipment && record.equipment.trim()) {
          equipmentSet.add(record.equipment.trim())
        }
      }
    }

    const uniqueEquipments = Array.from(equipmentSet)

    // 获取设备库中已有的设备名称
    const existingEquipments = await equipmentManager.getEquipments({})
    const existingNames = new Set(existingEquipments.map(e => e.name))

    // 过滤出需要新增的设备
    const newEquipments = uniqueEquipments.filter(name => !existingNames.has(name))

    // 批量插入新设备
    let created = 0
    for (const name of newEquipments) {
      try {
        await equipmentManager.createEquipment({ name })
        created++
      } catch (e) {
        // 忽略重复插入错误
        console.error(`Failed to insert equipment: ${name}`, e)
      }
    }

    return NextResponse.json({
      success: true,
      totalFound: uniqueEquipments.length,
      created,
      skipped: uniqueEquipments.length - newEquipments.length
    })
  } catch (error) {
    console.error("Failed to import equipments from records:", error)
    return NextResponse.json(
      { error: "从历史记录导入设备失败" },
      { status: 500 }
    )
  }
}
