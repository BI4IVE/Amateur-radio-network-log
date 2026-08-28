// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { equipmentManager } from "@/storage/database/equipmentManager"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET /api/admin/equipments - 获取设备列表
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get("name")

    const equipments = await equipmentManager.getEquipments(
      name ? { name } : undefined
    )
    return NextResponse.json({ equipments })
  } catch (error) {
    console.error("获取设备列表失败:", error)
    return NextResponse.json(
      { error: "获取设备列表失败" },
      { status: 500 }
    )
  }
}

// POST /api/admin/equipments - 创建设备
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "设备名称不能为空" },
        { status: 400 }
      )
    }

    const equipment = await equipmentManager.createEquipment({
      name: name.trim(),
      description: description?.trim() || null,
    })

    return NextResponse.json({ equipment }, { status: 201 })
  } catch (error) {
    console.error("创建设备失败:", error)
    if ((error as Error).message.includes("unique")) {
      return NextResponse.json(
        { error: "设备名称已存在" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "创建设备失败" },
      { status: 500 }
    )
  }
}
