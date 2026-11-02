// @version v2.0.5
/**
 * [v2.0.4] 台网简报的取数与权限（JSON 接口与图片接口共用）
 *
 * 权限：本场主控本人，或管理员/超管。
 * 不传 sessionId 时默认取最近一场（主控取自己带过的，管理员取全站最近一场）。
 */

import type { NextRequest } from "next/server"
import { getMemberIdentity } from "@/lib/me/identity"
import { isAdminRole } from "@/lib/permissions"
import { userManager } from "@/storage/database"
import {
  buildSessionBrief,
  listControlledSessions,
  listRecentSessions,
  type SessionBrief,
} from "@/lib/me/brief"

export type BriefSession = {
  id: string
  title: string
  sessionTime: string
  controller: string
}

export type BriefResult =
  | { ok: true; brief: SessionBrief; sessions: BriefSession[]; isAdmin: boolean }
  | { ok: false; status: number; error: string; needLogin?: boolean }

const normalize = (v?: string | null) => (v ?? "").trim().toUpperCase()

export async function resolveBrief(request: NextRequest): Promise<BriefResult> {
  const identity = await getMemberIdentity(request)
  if (!identity || !identity.callsign) {
    return { ok: false, status: 401, error: "未登录", needLogin: true }
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
    return {
      ok: false,
      status: 404,
      error: admin ? "暂无已开台的台网" : "你还没有主控过任何一场台网",
    }
  }

  const brief = await buildSessionBrief(sessionId)
  if (!brief) return { ok: false, status: 404, error: "场次不存在" }

  if (!admin && normalize(brief.controller) !== normalize(callsign)) {
    return { ok: false, status: 403, error: "只有本场主控或管理员可以生成简报" }
  }

  return { ok: true, brief, sessions, isAdmin: admin }
}
