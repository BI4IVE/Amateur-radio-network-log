// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"
import { pageConfigManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    await pageConfigManager.initializeDefaultConfigs()
    return NextResponse.json({ message: "默认配置已初始化" })
  } catch (error) {
    console.error("Init page configs error:", error)
    return NextResponse.json(
      { error: "初始化配置失败" },
      { status: 500 }
    )
  }
}
