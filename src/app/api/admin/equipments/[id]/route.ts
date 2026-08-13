// @version v1.5.8
import { NextRequest, NextResponse } from "next/server"
import { equipmentManager } from "@/storage/database/equipmentManager"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// PUT /api/admin/equipments/[id] - 更新设备
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    const existing = await equipmentManager.getEquipmentById(id)
    if (!existing) {
      return NextResponse.json({ error: "设备不存在" }, { status: 404 })
    }

    const updateData: { name?: string; description?: string | null } = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null

    const equipment = await equipmentManager.updateEquipment(id, updateData)
    return NextResponse.json({ equipment })
  } catch (error) {
    console.error("更新设备失败:", error)
    if ((error as Error).message.includes("unique")) {
      return NextResponse.json(
        { error: "设备名称已存在" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "更新设备失败" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/equipments/[id] - 删除设备
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { id } = await params

    const existing = await equipmentManager.getEquipmentById(id)
    if (!existing) {
      return NextResponse.json({ error: "设备不存在" }, { status: 404 })
    }

    await equipmentManager.deleteEquipment(id)
    return NextResponse.json({ message: "设备已删除" })
  } catch (error) {
    console.error("删除设备失败:", error)
    return NextResponse.json(
      { error: "删除设备失败" },
      { status: 500 }
    )
  }
}
