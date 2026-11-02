// @version v2.0.5
import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // 验证登录状态
  const user = await getAuthUser(request)
  const loginError = requireLogin(user)
  if (loginError.error) {
    return NextResponse.json({ error: loginError.error }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const callsign = searchParams.get("callsign")

    if (!callsign || callsign.length < 2) {
      return NextResponse.json({ participants: [] })
    }

    // [v2.0.4] 改到 SQL 侧筛选 + 排序 + 截断，只回 10 条必要字段。
    // 旧实现在 JS 里过滤「一次拉 2000 名会员」，主控每敲一个字就要传 260KB+。
    const participants = await participantManager.searchByCallsign(callsign, 10)

    return NextResponse.json({ participants })
  } catch (error) {
    console.error("Search participants error:", error)
    return NextResponse.json(
      { error: "搜索参与人员失败" },
      { status: 500 }
    )
  }
}
