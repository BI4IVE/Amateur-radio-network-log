import { NextRequest, NextResponse } from "next/server"
import { pageConfigManager } from "@/storage/database"

// GET /api/admin/page-configs - 获取所有配置
export async function GET(request: NextRequest) {
  try {
    const configs = await pageConfigManager.getAllConfigs()
    return NextResponse.json({ configs })
  } catch (error) {
    console.error("Get page configs error:", error)
    return NextResponse.json(
      { error: "获取配置失败" },
      { status: 500 }
    )
  }
}

// POST /api/admin/page-configs - 创建或更新配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, category, description } = body

    if (!key || !value || !category) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      )
    }

    const config = await pageConfigManager.upsertConfig({
      key,
      value,
      category,
      description,
    })

    return NextResponse.json({ config }, { status: 201 })
  } catch (error) {
    console.error("Create/Update page config error:", error)
    return NextResponse.json(
      { error: "创建/更新配置失败" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/page-configs - 批量更新配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { configs } = body

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { error: "配置格式错误" },
        { status: 400 }
      )
    }

    const results = []
    for (const configData of configs) {
      const { key, value, description } = configData
      if (key && value !== undefined) {
        const config = await pageConfigManager.upsertConfig({
          key,
          value,
          category: configData.category || "general",
          description: description || "",
        })
        results.push(config)
      }
    }

    return NextResponse.json({ configs: results })
  } catch (error) {
    console.error("Batch update page configs error:", error)
    return NextResponse.json(
      { error: "批量更新配置失败" },
      { status: 500 }
    )
  }
}
