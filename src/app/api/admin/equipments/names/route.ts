// @version v1.5.20
import { NextRequest, NextResponse } from "next/server"
import { equipmentManager } from "@/storage/database"
import { getAuthUser, requireLogin } from "@/lib/auth"

// GET /api/admin/equipments/names - 获取设备名称（用于下拉选择），支持 query 参数过滤
export async function GET(request: NextRequest) {
  // 验证登录状态
  const user = await getAuthUser(request)
  const loginError = requireLogin(user)
  if (loginError.error) {
    return NextResponse.json({ error: loginError.error }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query") || ""
    
    const names = await equipmentManager.getEquipmentNames(query)
    return NextResponse.json({ names })
  } catch (error) {
    console.error("获取设备名称列表失败:", error)
    return NextResponse.json(
      { error: "获取设备名称列表失败" },
      { status: 500 }
    )
  }
}
