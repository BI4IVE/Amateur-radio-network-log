import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const field = searchParams.get("field")
    const query = searchParams.get("query")

    if (!field || !query) {
      return NextResponse.json(
        { error: "缺少参数" },
        { status: 400 }
      )
    }

    // 验证字段名是否合法
    const validFields = ["qth", "equipment", "antenna", "power", "signal", "report", "remarks"]
    if (!validFields.includes(field)) {
      return NextResponse.json(
        { error: "无效的字段名" },
        { status: 400 }
      )
    }

    // 从历史记录中搜索该字段的值
    const records = await logManager.searchRecordsByField(field, query)

    // 去重并返回
    const uniqueValues = [...new Set(records.map(r => (r as any)[field] || "").filter(Boolean))]

    return NextResponse.json({
      values: uniqueValues
    })
  } catch (error) {
    console.error("Search records error:", error)
    return NextResponse.json(
      { error: "搜索失败" },
      { status: 500 }
    )
  }
}
