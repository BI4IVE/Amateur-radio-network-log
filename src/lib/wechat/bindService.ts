// @version v1.5.21
import {
  wechatBindingsManager,
  wechatMemberAuthManager,
  wechatBindCodesManager,
} from "@/storage/database"
import { getWechatSettings } from "./settings"
import { hashMemberId } from "./config"

/**
 * [v1.5.21 微信推送] 绑定认证服务
 *
 * 三种绑定方式由后台设置 wechat_bind_mode 决定，管理员可随时切换：
 * - idcard   身份证后六位：比对 sha256(后六位 + SALT) 与会员对照表，通过即生效
 * - bindcode 一次性绑定码：比对后台生成的码（与呼号一一对应），通过后码即作废
 * - manual   人工审核制：提交后进入 pending，管理员后台审核通过才生效
 */

export type BindInput = {
  openid: string
  callsign: string
  /** 方式 idcard 需要 */
  idLast6?: string
  /** 方式 bindcode 需要 */
  bindCode?: string
}

export type BindOutcome =
  | { ok: true; status: "active" | "pending"; callsign: string }
  | { ok: false; error: string }

export async function performBind(input: BindInput): Promise<BindOutcome> {
  const settings = await getWechatSettings()
  const callsign = input.callsign.trim().toUpperCase()

  if (!callsign) {
    return { ok: false, error: "请填写呼号" }
  }

  try {
    // 方式 A：呼号 + 身份证后六位
    if (settings.bindMode === "idcard") {
      const idLast6 = input.idLast6?.trim() || ""
      if (!idLast6) {
        return { ok: false, error: "请填写身份证后六位" }
      }
      // SALT 未配置时 hashMemberId 会抛错，由下方 catch 转成友好提示
      const idHash = hashMemberId(idLast6)
      const matched = await wechatMemberAuthManager.verify(callsign, idHash)
      if (!matched) {
        // 统一措辞，不提示是呼号不存在还是后六位错误，防枚举
        return { ok: false, error: "信息不匹配" }
      }
      await wechatBindingsManager.bind({
        openid: input.openid,
        callsign,
        status: "active",
      })
      return { ok: true, status: "active", callsign }
    }

    // 方式 B：呼号 + 一次性绑定码
    if (settings.bindMode === "bindcode") {
      const bindCode = input.bindCode?.trim() || ""
      if (!bindCode) {
        return { ok: false, error: "请填写绑定码" }
      }
      const record = await wechatBindCodesManager.verify(callsign, bindCode)
      if (!record) {
        return { ok: false, error: "绑定码无效或已过期" }
      }
      await wechatBindingsManager.bind({
        openid: input.openid,
        callsign,
        status: "active",
      })
      // 绑定成功后码即作废，防止重复使用
      await wechatBindCodesManager.markUsed(record.id, input.openid)
      return { ok: true, status: "active", callsign }
    }

    // 方式 C：人工审核制——提交后待管理员审核
    await wechatBindingsManager.bind({
      openid: input.openid,
      callsign,
      status: "pending",
    })
    return { ok: true, status: "pending", callsign }
  } catch (error) {
    console.error("[wechat.bind] 绑定处理失败:", error)
    const message = error instanceof Error ? error.message : "绑定失败"
    if (message.includes("MEMBER_ID_SALT")) {
      return { ok: false, error: "系统尚未配置认证参数，请联系管理员" }
    }
    return { ok: false, error: message }
  }
}
