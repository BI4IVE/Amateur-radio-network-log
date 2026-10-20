// @version v2.0.1
/**
 * [个人中心] 微信登录会话
 *
 * 与主控台的 token 完全分离：
 * - 主控 token：账号密码登录，存 cookie `token`，7 天
 * - 微信会话：静默授权拿 openid 后签发，存 cookie `wx_session`，90 天
 *
 * 为什么必须有服务端会话：
 * 绑定页此前把 openid 放在 sessionStorage、靠 ?openid= 传参，任何人拿到 openid
 * 就能查绑定信息。个人中心涉及「我的记录/我的档案」，身份必须由签名 Cookie 决定，
 * 接口一律不接受客户端传入的 openid / 呼号。
 *
 * 签名复用 JWT_SECRET（已强制配置），HMAC-SHA256，Web Crypto 实现（Edge 可用）。
 */

/** 会话有效期：90 天（产品决策，见《个人中心》方案） */
export const WX_SESSION_MAX_AGE = 90 * 24 * 60 * 60

const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  throw new Error(
    "[安全] 未配置 JWT_SECRET 环境变量，无法签发微信会话。请在 .env 中设置强随机密钥。"
  )
}

export const WX_SESSION_COOKIE = "wx_session"
export const WX_OAUTH_STATE_COOKIE = "wx_oauth_state"

export type WechatSession = {
  openid: string
  exp: number
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64urlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  const bin = atob(normalized + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  )
  return bytesToB64url(new Uint8Array(signature))
}

/** 解析 Cookie 头为对象（只做一次解码，避免值里含 % 时二次解码报错） */
export function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(";")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const raw = part.slice(idx + 1).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(raw)
    } catch {
      out[key] = raw
    }
  }
  return out
}

/** 签发 90 天微信会话 token（payload.signature） */
export async function signWechatSession(openid: string): Promise<string> {
  const payload: WechatSession = {
    openid,
    exp: Math.floor(Date.now() / 1000) + WX_SESSION_MAX_AGE,
  }
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)))
  return `${body}.${await hmac(body)}`
}

/** 校验会话，失败一律返回 null（不区分「无 cookie / 签名错 / 过期」） */
export async function readWechatSession(request: {
  headers: Headers
}): Promise<WechatSession | null> {
  const cookies = parseCookieHeader(request.headers.get("cookie"))
  const raw = cookies[WX_SESSION_COOKIE]
  if (!raw) return null

  const idx = raw.lastIndexOf(".")
  if (idx <= 0) return null
  const body = raw.slice(0, idx)
  const signature = raw.slice(idx + 1)
  if (!body || !signature) return null

  if ((await hmac(body)) !== signature) return null

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(body))
    ) as Partial<WechatSession>
    if (typeof payload.openid !== "string" || !payload.openid) return null
    if (typeof payload.exp !== "number") return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    return { openid: payload.openid, exp: payload.exp }
  } catch {
    return null
  }
}

function baseCookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ]
  // 生产走 HTTPS；本地 http 下带 Secure 会让 cookie 直接失效
  if (process.env.NODE_ENV === "production") parts.push("Secure")
  return parts.join("; ")
}

export function wechatSessionCookie(token: string): string {
  return baseCookie(WX_SESSION_COOKIE, token, WX_SESSION_MAX_AGE)
}

export function clearWechatSessionCookie(): string {
  return baseCookie(WX_SESSION_COOKIE, "", 0)
}

/** OAuth state 短期 Cookie（5 分钟），防 CSRF 与授权码串用 */
export function oauthStateCookie(state: string): string {
  return baseCookie(WX_OAUTH_STATE_COOKIE, state, 300)
}

export function clearOauthStateCookie(): string {
  return baseCookie(WX_OAUTH_STATE_COOKIE, "", 0)
}
