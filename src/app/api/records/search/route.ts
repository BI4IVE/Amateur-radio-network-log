// @version v1.5.9
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

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
