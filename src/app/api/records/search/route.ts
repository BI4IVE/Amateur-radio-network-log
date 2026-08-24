// @version v1.5.16
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
// [v1.5.10] 记录公开查询接口，无需登录（middleware 已将 /api/records/search 列入 publicPaths）

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
    const validFields = ["callsign", "qth", "equipment", "antenna", "power", "signal", "report", "remarks"]
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
