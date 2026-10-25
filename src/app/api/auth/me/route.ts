// @version v2.0.3
import { NextRequest, NextResponse } from "next/server"
import { requireLoginUser } from "@/lib/permissions-server"
import { userManager } from "@/storage/database"

/**
 * [v1.5.29 权限] GET /api/auth/me
 *
 * 返回当前登录用户的资料、角色与「最终权限点集合」。
 * 后台布局用它渲染菜单；与 JWT 里的 role 快照相比，这里读的是最新权限。
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireLoginUser(request)
    if ("error" in auth) return auth.error

    const user = await userManager.getUserById(auth.user.userId)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { password: _password, permissions: _permissions, ...profile } = user

    return NextResponse.json({
      user: profile,
      role: auth.role,
      permissions: Array.from(auth.perms),
    })
  } catch (error) {
    console.error("[auth.me] 获取当前用户失败:", error)
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 })
  }
}
