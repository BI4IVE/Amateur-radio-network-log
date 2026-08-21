// @version v1.5.15
import { NextRequest, NextResponse } from "next/server"
import { pageConfigManager } from "@/storage/database"

// GET /api/page-configs - 获取所有公开配置（不包括管理员专用配置）
export async function GET(request: NextRequest) {
  try {
    const configs = await pageConfigManager.getAllConfigs()
    
    // 将配置转换为 key-value 对象
    const configMap: Record<string, string> = {}
    configs.forEach(config => {
      configMap[config.key] = config.value
    })
    
    // [v1.5.10] 禁止缓存，确保后台配置修改后前台立即可见
    return NextResponse.json(
      { configs: configMap },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", "Pragma": "no-cache", "Expires": "0" } }
    )
  } catch (error) {
    console.error("Get public page configs error:", error)
    return NextResponse.json(
      { error: "获取配置失败" },
      { status: 500 }
    )
  }
}
