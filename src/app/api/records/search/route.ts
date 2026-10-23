// @version v2.0.2
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser } from "@/lib/auth"
import { maskQthValue } from "@/lib/screenAccess"
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
    let uniqueValues = [...new Set(records.map(r => (r as any)[field] || "").filter(Boolean))]

    // [安全] QTH 属敏感位置信息：仅对「未登录」的公开访问脱敏（保留前 4 字），
    // 防止匿名 `query=%` 通配符枚举出精确地址；登录主控需看完整值做自动补全。
    const user = await getAuthUser(request)
    if (field === "qth" && !user) {
      const masked = new Set<string>()
      for (const v of uniqueValues) {
        const m = maskQthValue(v)
        if (m) masked.add(m)
      }
      uniqueValues = [...masked]
    }

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
