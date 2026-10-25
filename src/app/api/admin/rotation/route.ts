// @version v2.0.3
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/permissions-server"
import { logManager } from "@/storage/database/logManager"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // [v1.5.29 权限] 主控也能查看轮值
  const auth = await requirePermission(req, "ops.rotation")
  if ("error" in auth) {
    return NextResponse.json(
      { success: false, message: "无此操作权限" },
      { status: 403 }
    )
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
