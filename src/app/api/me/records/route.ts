// @version v2.0.4
import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity, isActiveMember } from "@/lib/me/identity"
import { logManager } from "@/storage/database"

/**
 * [个人中心] GET /api/me/records?limit=20&offset=0
 * 只返回会话身份对应呼号的记录，呼号不接受前端传入。
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

    const { searchParams } = request.nextUrl
    const limitRaw = Number(searchParams.get("limit") ?? 20)
    const offsetRaw = Number(searchParams.get("offset") ?? 0)
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20))
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0)

    const result = await logManager.getRecordsByCallsign(identity.callsign, {
      limit,
      offset,
    })

    return NextResponse.json({ ...result, limit, offset })
  } catch (error) {
    console.error("[me.records] 获取我的记录失败:", error)
    return NextResponse.json({ error: "获取记录失败" }, { status: 500 })
  }
}
