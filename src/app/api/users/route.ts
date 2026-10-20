// @version v1.5.29
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { hashPassword } from "@/lib/password"
import { requirePermission } from "@/lib/permissions-server"
import { effectivePermissions, isRole, parsePermissions } from "@/lib/permissions"

/**
 * [v1.5.29 权限] 用户管理接口
 *
 * 统一要求 user.manage 权限（默认只有超管拥有）。
 * 之前的实现只判断 role === "admin"，任何管理员都能建号、改角色、重置密码，
 * 等于谁都能复制出同级权限；现在这条线收到超管手里。
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "user.manage")
    if ("error" in auth) return auth.error

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")
    const roleFilter = isRole(role) ? role : undefined

    const users = await userManager.getUsers({
      filters: roleFilter ? { role: roleFilter } : undefined,
    })

    const list = users.map(({ password: _password, ...user }) => ({
      ...user,
      // 返回「最终生效的权限点」，前端勾选矩阵直接用
      permissions: effectivePermissions(user.role, user.permissions),
    }))

    return NextResponse.json({ users: list })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "user.manage")
    if ("error" in auth) return auth.error

    const body = await request.json()
    const { username, password, name, equipment, antenna, qth } = body
    const role = isRole(body.role) ? body.role : "user"

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      )
    }

    if (role === "superadmin" && auth.role !== "superadmin") {
      return NextResponse.json(
        { error: "只有超级管理员可以创建超级管理员" },
        { status: 403 }
      )
    }

    // permissions 传入则按权限点过滤后落库；不传则沿用角色默认模板
    const permissions =
      body.permissions === undefined || body.permissions === null
        ? null
        : JSON.stringify(parsePermissions(body.permissions))

    const user = await userManager.createUser({
      username,
      password: await hashPassword(password),
      name: name || username,
      equipment,
      antenna,
      qth,
      role,
      permissions,
    })

    const { password: _password, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        user: {
          ...userWithoutPassword,
          permissions: effectivePermissions(user.role, user.permissions),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create user error:", error)
    const errorMessage = error instanceof Error ? error.message : "创建用户失败"
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
