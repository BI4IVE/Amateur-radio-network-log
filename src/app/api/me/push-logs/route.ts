// @version v2.0.1
import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity, isActiveMember } from "@/lib/me/identity"
import { wechatPushLogManager } from "@/storage/database"

/**
 * [个人中心] GET /api/me/push-logs
 * 只返回本人呼号的推送结果，且不暴露 openid。
 */
export async function GET(request: NextRequest) {
  try {
    const identity = await getMemberIdentity(request)
    if (!identity) {
      return NextResponse.json({ error: "未登录", needLogin: true }, { status: 401 })
    }
    if (!isActiveMember(identity)) {
      return NextResponse.json({ error: "尚未绑定呼号" }, { status: 403 })
    }

    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? 20)
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20))

    const { logs, total } = await wechatPushLogManager.list({
      callsign: identity.callsign,
      limit,
    })

    return NextResponse.json({
      total,
      logs: logs.map((log) => ({
        id: log.id,
        status: log.status,
        errcode: log.errcode,
        errmsg: log.errmsg,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error("[me.pushLogs] 获取推送记录失败:", error)
    return NextResponse.json({ error: "获取推送记录失败" }, { status: 500 })
  }
}
