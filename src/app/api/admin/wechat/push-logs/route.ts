// @version v2.0.0
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { checkPermission } from "@/lib/permissions-server"
import { wechatPushLogManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] GET /api/admin/wechat/push-logs
 * 推送留痕查询：?callsign=&status=&limit=&offset=
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = await checkPermission(request, "pushlog.view")
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const callsign = searchParams.get("callsign") || undefined
    const status = searchParams.get("status") || undefined
    const limit = Number(searchParams.get("limit") ?? 100) || 100
    const offset = Number(searchParams.get("offset") ?? 0) || 0

    const result = await wechatPushLogManager.list({
      limit,
      offset,
      callsign,
      status,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("List push logs error:", error)
    return NextResponse.json({ error: "获取推送日志失败" }, { status: 500 })
  }
}
