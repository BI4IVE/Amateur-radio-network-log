// @version v1.5.22
import { createHash } from "crypto"
import { getWechatEnv } from "./config"

/**
 * [v1.5.21 微信推送] 服务器验证签名校验（明文模式）
 *
 * 微信服务器 GET 回调时会带 signature / timestamp / nonce / echostr，
 * 校验规则：token、timestamp、nonce 三个参数字典序排序后拼接并 sha1，
 * 与 signature 比对一致才说明请求来自微信。
 */

export function checkSignature(
  signature: string,
  timestamp: string,
  nonce: string
): boolean {
  const { token } = getWechatEnv()
  if (!token || !signature) return false

  const raw = [token, timestamp, nonce].sort().join("")
  const computed = createHash("sha1").update(raw).digest("hex")
  return computed === signature
}
