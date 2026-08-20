// @version v1.5.13
// 简单的 token 认证工具（兼容 Edge runtime）
// 使用 Base64 编码的 JSON 作为 token，配合 HMAC 签名

// [v1.5.13 安全] JWT_SECRET 必须显式配置，禁止硬编码默认值（高危：默认密钥可被伪造签名）。
// 缺失时直接抛错，迫使部署方在 .env 中配置，避免静默使用弱密钥。
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error(
    "[安全] 未配置 JWT_SECRET 环境变量。请在 .env 中设置强随机密钥后再启动服务。"
  )
}

// UTF-8 safe Base64 (btoa/atob do not support multibyte chars like Chinese)
function utf8Btoa(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}
function utf8Atob(b64: string): string {
  return decodeURIComponent(escape(atob(b64)))
}
function bytesToB64(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export interface JwtPayload {
  userId: string
  username: string
  role: string
  name?: string
  exp: number
}

// 简单的 HMAC 签名（使用 Web Crypto API）
async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(JWT_SECRET)
  const messageData = encoder.encode(data)
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  
  const signature = await crypto.subtle.sign("HMAC", key, messageData)
  return bytesToB64(new Uint8Array(signature))
}

// 验证 HMAC 签名
async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const expectedSignature = await hmacSign(data)
  return expectedSignature === signature
}

export async function signToken(payload: Omit<JwtPayload, "exp">): Promise<string> {
  const header = utf8Btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadWithExp = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
  }
  const payloadStr = utf8Btoa(JSON.stringify(payloadWithExp))
  const signature = await hmacSign(`${header}.${payloadStr}`)
  return `${header}.${payloadStr}.${signature}`
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    
    const [header, payload, signature] = parts
    
    // 验证签名
    const isValid = await hmacVerify(`${header}.${payload}`, signature)
    if (!isValid) return null
    
    // 解析 payload
    const decoded = JSON.parse(utf8Atob(payload)) as JwtPayload
    
    // 检查过期
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return decoded
  } catch {
    return null
  }
}

export async function getAuthUser(request: { headers: Headers }): Promise<JwtPayload | null> {
  // 从 Authorization header 获取 token
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const payload = await verifyToken(token)
    if (payload) return payload
  }

  // [v1.5.13 安全] 不再信任 x-user-* header。
  // 这些 header 仅由本服务 middleware 在内部注入（见 src/middleware.ts），
  // 但客户端请求无法伪造经签名验证的 Bearer token / cookie，
  // 合法身份只能经由 verifyToken 校验，杜绝伪造 x-user-* 绕过鉴权的高危漏洞。

  // 从 cookie 获取 token
  const cookieHeader = request.headers.get("cookie")
  if (cookieHeader) {
    const cookies: Record<string, string> = {}
    cookieHeader.split(";").forEach(c => {
      const idx = c.indexOf("=")
      if (idx === -1) return
      const k = c.slice(0, idx).trim()
      const v = c.slice(idx + 1).trim()
      cookies[k] = decodeURIComponent(v)
    })
    if (cookies.token) {
      const payload = await verifyToken(cookies.token)
      if (payload) return payload
    }
  }

  return null
}

// 检查用户是否为管理员
export function requireAdmin(user: JwtPayload | null): { error?: string } {
  if (!user) return { error: "需要登录" }
  if (user.role !== "admin") return { error: "需要管理员权限" }
  return {}
}

// 检查用户是否已登录
export function requireAuth(user: JwtPayload | null): { error?: string } {
  if (!user) return { error: "需要登录" }
  return {}
}

// 检查用户是否有权限（admin 或 user）
export function requireUser(user: JwtPayload | null): { error?: string } {
  if (!user) return { error: "需要登录" }
  if (user.role !== "admin" && user.role !== "user") return { error: "需要用户权限" }
  return {}
}

// 别名，兼容旧代码
export const getUserFromRequest = getAuthUser

// 别名，兼容旧代码（requireLogin 与 requireAuth 行为一致）
export const requireLogin = requireAuth
