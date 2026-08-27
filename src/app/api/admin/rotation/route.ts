// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import { logManager } from "@/storage/database/logManager"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // 管理员鉴权（与 /api/admin/stats 保持一致）
  const user = await getAuthUser(req)
  const authCheck = requireAdmin(user)
  if (authCheck.error) {
    return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 })
  }

  try {
    const data = await logManager.getControllerRotation()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("获取主控轮值统计失败:", error)
    return NextResponse.json(
      { success: false, message: "获取主控轮值统计失败: " + (error?.message || "未知错误") },
      { status: 500 }
    )
  }
}
