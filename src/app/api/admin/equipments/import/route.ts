// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { equipmentManager } from "@/storage/database/equipmentManager"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// POST /api/admin/equipments/import - 批量导入设备
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = await request.json()
    const { equipments: items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "导入数据不能为空" },
        { status: 400 }
      )
    }

    // 验证数据格式
    const validItems = items
      .filter((item: { name?: string }) => item.name && item.name.trim())
      .map((item: { name: string; description?: string }) => ({
        name: item.name.trim(),
        description: item.description?.trim() || null,
      }))

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "没有有效的设备数据（设备名称不能为空）" },
        { status: 400 }
      )
    }

    const result = await equipmentManager.upsertEquipments(validItems)

    return NextResponse.json({
      success: true,
      total: validItems.length,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    })
  } catch (error) {
    console.error("批量导入设备失败:", error)
    return NextResponse.json(
      { error: "批量导入设备失败" },
      { status: 500 }
    )
  }
}
