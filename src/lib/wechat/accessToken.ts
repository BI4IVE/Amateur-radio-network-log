// @version v1.5.24
import { getWechatEnv } from "./config"

/**
 * [v1.5.21 微信推送] access_token 获取与缓存
 *
 * access_token 有效期 2 小时、日调用上限有限，必须缓存复用：
 * - 内存缓存，提前 5 分钟刷新，避免临界时刻拿到即将过期的 token
 * - 并发请求复用同一个 inflight Promise，防止同时刷新把额度打光
 */

let cached: { token: string; expiresAt: number } | null = null
let inflight: Promise<string> | null = null

export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.token
  }

  if (!inflight) {
    inflight = fetchAccessToken()
      .then((token) => {
        inflight = null
        return token
      })
      .catch((error) => {
        inflight = null
        throw error
      })
  }
  return inflight
}

async function fetchAccessToken(): Promise<string> {
  const { appId, appSecret } = getWechatEnv()
  if (!appId || !appSecret) {
    throw new Error("未配置 WECHAT_APPID / WECHAT_APPSECRET")
  }

  const url =
    `https://api.weixin.qq.com/cgi-bin/token` +
    `?grant_type=client_credential` +
    `&appid=${encodeURIComponent(appId)}` +
    `&secret=${encodeURIComponent(appSecret)}`

  const res = await fetch(url)
  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
    errcode?: number
    errmsg?: string
  }

  if (!json.access_token) {
    throw new Error(
      `获取 access_token 失败: ${json.errcode ?? "unknown"} ${json.errmsg ?? ""}`
    )
  }

  cached = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 7200) * 1000,
  }
  return cached.token
}

/** 配置变更或测试推送遇到 40001 时，强制丢弃缓存重新获取 */
export function clearAccessTokenCache(): void {
  cached = null
}
