// @version v1.5.20
// 大屏数据公开访问控制
// 后台「页面配置管理 → 大屏配置 → screen_public」控制：
//   true  = 大屏对外开放，任何人（含匿名）可读取大屏数据
//   false = 大屏私有，仅登录用户可读取（默认）
// 写操作（创建会话/记录）不受此开关影响，始终要求登录。

import { pageConfigManager } from "@/storage/database"
import { getAuthUser, type JwtPayload } from "@/lib/auth"

// 读取大屏是否对外开放（缓存 30s，降低数据库压力）
let cachedPublic: boolean | null = null
let cacheTime = 0
const CACHE_TTL = 30 * 1000

export async function isScreenPublic(): Promise<boolean> {
  const now = Date.now()
  if (cachedPublic !== null && now - cacheTime < CACHE_TTL) {
    return cachedPublic
  }
  try {
    const c = await pageConfigManager.getConfigByKey("screen_public")
    cachedPublic = c?.value === "true"
  } catch {
    cachedPublic = false
  }
  cacheTime = now
  return cachedPublic
}

// 与前端 live/page.tsx 的 maskQth 保持一致：仅保留前 4 个字，防止地理位置被细化泄露。
// 放在服务端是为了在「匿名 + 公开」组合下，即使直接调用 API 也无法拿到完整 QTH。
export function maskQthValue(q?: string | null): string | null | undefined {
  if (!q) return q
  return [...q].slice(0, 4).join("")
}

// 大屏数据读取鉴权：已登录用户一律放行；未登录时仅当 screen_public=true 放行。
// maskQth：仅当「匿名 + 公开」时为 true，调用方须据此对 QTH 做服务端脱敏。
export async function screenReadAuth(
  request: Request
): Promise<{ ok: boolean; user: JwtPayload | null; maskQth: boolean }> {
  const user = await getAuthUser(request)
  if (user) return { ok: true, user, maskQth: false }
  const pub = await isScreenPublic()
  if (pub) return { ok: true, user: null, maskQth: true }
  return { ok: false, user: null, maskQth: false }
}
