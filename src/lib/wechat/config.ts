// @version v1.5.24
import { createHash } from "crypto"
import { pageConfigManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] 配置读取
 *
 * 分工：
 * - 敏感项（AppID / AppSecret / Token / EncodingAESKey / SALT）走 .env，绝不入库
 * - 运营项（推送开关、模板ID）走 page_configs，后台页面可改、无需重启
 */

export type WechatEnv = {
  appId: string
  appSecret: string
  token: string
  encodingAesKey: string
  memberIdSalt: string
}

export function getWechatEnv(): WechatEnv {
  return {
    appId: process.env.WECHAT_APPID ?? "",
    appSecret: process.env.WECHAT_APPSECRET ?? "",
    token: process.env.WECHAT_TOKEN ?? "",
    encodingAesKey: process.env.WECHAT_ENCODING_AES_KEY ?? "",
    memberIdSalt: process.env.MEMBER_ID_SALT ?? "",
  }
}

/** AppID 与 AppSecret 都配好才算「已配置」——缺一不可调用微信接口 */
export function isWechatConfigured(): boolean {
  const { appId, appSecret } = getWechatEnv()
  return Boolean(appId && appSecret)
}

/**
 * 推送总开关（page_configs: wechat_push_enabled）。
 * 默认关闭：公众号侧未配置完成时绝不推送，避免打扰用户。
 */
export async function isPushEnabled(): Promise<boolean> {
  try {
    const cfg = await pageConfigManager.getConfigByKey("wechat_push_enabled")
    return cfg?.value === "true"
  } catch {
    return false
  }
}

/** 模板 ID：优先 page_configs（wechat_template_id），回退 .env */
export async function getTemplateId(): Promise<string> {
  try {
    const cfg = await pageConfigManager.getConfigByKey("wechat_template_id")
    if (cfg?.value) return cfg.value
  } catch {
    // 配置读取失败时回退环境变量
  }
  return process.env.WECHAT_TEMPLATE_ID ?? ""
}

/**
 * 计算身份证后六位哈希：sha256(后六位 + SALT)。
 * SALT 来自 .env 的 MEMBER_ID_SALT，一旦启用不可更改
 * （改动会让已导入的哈希全部失效，必须重新导入）。
 */
export function hashMemberId(last6: string): string {
  const { memberIdSalt } = getWechatEnv()
  if (!memberIdSalt) {
    throw new Error("未配置 MEMBER_ID_SALT，无法计算会员认证哈希")
  }
  return createHash("sha256").update(`${last6}${memberIdSalt}`).digest("hex")
}
