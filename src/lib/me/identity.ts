// @version v2.0.4
import { readWechatSession } from "@/lib/wechat/session"
import { wechatBindingsManager } from "@/storage/database"

/**
 * [个人中心] 身份解析
 *
 * 唯一身份来源 = 签名 Cookie 中的 openid，再由 openid 反查绑定拿呼号。
 * 所有 /api/me/* 都必须走这里，**绝不接受前端传入的 openid / callsign**，
 * 否则用户可以改别人的档案、看别人的记录。
 */

export type MemberStatus = "active" | "pending" | "rejected" | "inactive" | "none"

export type MemberIdentity = {
  openid: string
  callsign: string | null
  status: MemberStatus
}

export async function getMemberIdentity(request: {
  headers: Headers
}): Promise<MemberIdentity | null> {
  const session = await readWechatSession(request)
  if (!session) return null

  const binding = await wechatBindingsManager.getByOpenid(session.openid)
  const status = (binding?.status as MemberStatus | undefined) ?? "none"

  return {
    openid: session.openid,
    callsign: binding?.callsign?.trim().toUpperCase() || null,
    status,
  }
}

/** 仅 active（已生效绑定）才允许读写个人档案与记录 */
export function isActiveMember(identity: MemberIdentity | null): identity is MemberIdentity & {
  callsign: string
  status: "active"
} {
  return Boolean(identity && identity.status === "active" && identity.callsign)
}
