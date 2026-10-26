// @version v2.0.4
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, type JwtPayload } from "@/lib/auth"
import { userManager } from "@/storage/database"
import {
  effectivePermissions,
  isRole,
  type PermissionKey,
  type Role,
} from "./permissions"

/**
 * 服务端权限判断
 *
 * 为什么每次查库而不是只信 JWT：
 * 超管改了某人的权限后，必须尽快生效；JWT 里只有登录那一刻的快照。
 * 这里加 60 秒内存缓存，既保证「改完最多 1 分钟生效」，又不会每个请求都打库；
 * 用户管理接口在保存权限后会主动清缓存，所以实际是立即生效。
 */

const CACHE_TTL = 60_000

type CacheEntry = { perms: Set<string>; role: Role; at: number }
const cache = new Map<string, CacheEntry>()

export function clearPermissionCache(userId?: string): void {
  if (userId) cache.delete(userId)
  else cache.clear()
}

export async function getPermissionsForUser(
  userId: string,
  tokenRole: string
): Promise<{ perms: Set<string>; role: Role }> {
  const now = Date.now()
  const hit = cache.get(userId)
  if (hit && now - hit.at < CACHE_TTL) {
    return { perms: hit.perms, role: hit.role }
  }

  let role: Role = isRole(tokenRole) ? tokenRole : "user"
  let perms = new Set<string>(effectivePermissions(role, null))

  try {
    const user = await userManager.getUserById(userId)
    if (user) {
      role = isRole(user.role) ? user.role : "user"
      perms = new Set<string>(effectivePermissions(role, user.permissions))
    }
  } catch (error) {
    // 查库失败时退回 token 里的角色默认权限，避免整站不可用
    console.error("[permissions] 读取用户权限失败，回退角色默认值:", error)
  }

  cache.set(userId, { perms, role, at: now })
  return { perms, role }
}

export type GuardResult =
  | { user: JwtPayload; perms: Set<string>; role: Role; error?: undefined }
  | { error: NextResponse; user?: undefined; perms?: undefined; role?: undefined }

/** 需要某个权限点 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionKey
): Promise<GuardResult> {
  const user = await getAuthUser(request)
  if (!user) {
    return { error: NextResponse.json({ error: "需要登录" }, { status: 401 }) }
  }

  const { perms, role } = await getPermissionsForUser(user.userId, user.role)
  if (!perms.has(permission)) {
    return { error: NextResponse.json({ error: "无此操作权限" }, { status: 403 }) }
  }

  return { user, perms, role }
}

/** 需要任意一个权限点（用于「查看或编辑」二选一的场景） */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: PermissionKey[]
): Promise<GuardResult> {
  const user = await getAuthUser(request)
  if (!user) {
    return { error: NextResponse.json({ error: "需要登录" }, { status: 401 }) }
  }

  const { perms, role } = await getPermissionsForUser(user.userId, user.role)
  if (!permissions.some((p) => perms.has(p))) {
    return { error: NextResponse.json({ error: "无此操作权限" }, { status: 403 }) }
  }

  return { user, perms, role }
}

/**
 * 兼容旧写法的权限检查：返回 `{ error?: string }`，与 requireAdmin 签名一致。
 * 用于把大量 `requireAdmin(user)` 平滑替换为 `await checkPermission(request, "xxx")`，
 * 调用方原有的 `if (adminError.error) return json(..., { status: 403 })` 无需改动。
 */
export async function checkPermission(
  request: NextRequest,
  permission: PermissionKey
): Promise<{ error?: string }> {
  const user = await getAuthUser(request)
  if (!user) return { error: "需要登录" }

  const { perms } = await getPermissionsForUser(user.userId, user.role)
  if (!perms.has(permission)) return { error: "无此操作权限" }

  return {}
}

/** 仅登录（不要求具体权限点） */
export async function requireLoginUser(
  request: NextRequest
): Promise<GuardResult> {
  const user = await getAuthUser(request)
  if (!user) {
    return { error: NextResponse.json({ error: "需要登录" }, { status: 401 }) }
  }
  const { perms, role } = await getPermissionsForUser(user.userId, user.role)
  return { user, perms, role }
}
