import { NextResponse } from "next/server"
import { pageConfigManager } from "@/storage/database"

export async function POST() {
  try {
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
