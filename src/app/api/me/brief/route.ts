// @version v2.0.4
/**
 * [v2.0.4] 台网简报数据 GET /api/me/brief?sessionId=xxx
 *
 * 权限：本场主控本人，或管理员/超管。
 * 不传 sessionId 时默认取最近一场（主控取自己带过的，管理员取全站最近一场）。
 * 同时返回可选的场次列表，供主控中心下拉切换。
 */

import { NextRequest, NextResponse } from "next/server"
import { getMemberIdentity } from "@/lib/me/identity"
import { isAdminRole } from "@/lib/permissions"
import { userManager } from "@/storage/database"
import {
  buildSessionBrief,
  listControlledSessions,
  listRecentSessions,
} from "@/lib/me/brief"

const normalize = (v?: string | null) => (v ?? "").trim().toUpperCase()

export async function GET(request: NextRequest) {
  try {
    const identity = await getMemberIdentity(request)
    if (!identity || !identity.callsign) {
      return NextResponse.json({ error: "未登录", needLogin: true }, { status: 401 })
    }

    const callsign = identity.callsign
    const user = await userManager.getUserByUsername(callsign)
    const admin = !!user && isAdminRole(user.role)

    const sessions = admin
      ? await listRecentSessions(8)
      : await listControlledSessions(callsign, 8)

    const requested = request.nextUrl.searchParams.get("sessionId")
    const sessionId = requested || sessions[0]?.id || null

    if (!sessionId) {
      return NextResponse.json(
        { error: admin ? "暂无已开台的台网" : "你还没有主控过任何一场台网" },
        { status: 404 }
      )
    }

    const brief = await buildSessionBrief(sessionId)
    if (!brief) {
      return NextResponse.json({ error: "场次不存在" }, { status: 404 })
    }

    // 二次校验：非管理员必须是本场主控
    if (!admin && normalize(brief.controller) !== normalize(callsign)) {
      return NextResponse.json({ error: "只有本场主控或管理员可以生成简报" }, { status: 403 })
    }

    return NextResponse.json({ brief, sessions, isAdmin: admin })
  } catch (error) {
    console.error("[me.brief] 生成简报数据失败:", error)
    return NextResponse.json({ error: "生成简报数据失败" }, { status: 500 })
  }
}
