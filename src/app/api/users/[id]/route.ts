// @version v1.5.29
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { getAuthUser } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import {
  clearPermissionCache,
  getPermissionsForUser,
} from "@/lib/permissions-server"
import {
  effectivePermissions,
  isRole,
  parsePermissions,
} from "@/lib/permissions"

/**
 * [v1.5.29 权限] 单个用户读写
 *
 * 关键约束（以前没有）：
 * 1. 改角色 / 改权限点 需要 user.manage（默认只有超管）
 * 2. 普通用户改自己只能改联系方式，不能给自己提权
 * 3. 超管账号只能被超管操作
 * 4. 不允许降级 / 删除最后一个超管，避免系统锁死
 */

async function superAdminCount(): Promise<number> {
  const list = await userManager.getUsers({ filters: { role: "superadmin" } })
  return list.length
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getAuthUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { perms } = await getPermissionsForUser(
      currentUser.userId,
      currentUser.role
    )
    const isSelf = currentUser.userId === id
    if (!isSelf && !perms.has("user.manage")) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const user = await userManager.getUserById(id)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { password: _password, ...rest } = user
    return NextResponse.json({
      user: {
        ...rest,
        permissions: effectivePermissions(user.role, user.permissions),
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "获取用户失败" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getAuthUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { perms, role: operatorRole } = await getPermissionsForUser(
      currentUser.userId,
      currentUser.role
    )
    const isSelf = currentUser.userId === id
    const canManage = perms.has("user.manage")

    if (!isSelf && !canManage) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const target = await userManager.getUserById(id)
    if (!target) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 超管账号只有超管能动
    if (target.role === "superadmin" && operatorRole !== "superadmin") {
      return NextResponse.json(
        { error: "只有超级管理员可以修改超级管理员账号" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { userRole: _ignored, ...raw } = body as Record<string, unknown>

    const data: Record<string, unknown> = {}
    const PROFILE_FIELDS = ["name", "equipment", "antenna", "qth"] as const

    if (canManage) {
      for (const key of PROFILE_FIELDS) {
        if (raw[key] !== undefined) data[key] = raw[key]
      }

      if (raw.role !== undefined) {
        if (!isRole(raw.role)) {
          return NextResponse.json({ error: "角色不合法" }, { status: 400 })
        }
        if (raw.role === "superadmin" && operatorRole !== "superadmin") {
          return NextResponse.json(
            { error: "只有超级管理员可以设置超级管理员" },
            { status: 403 }
          )
        }
        // 降级最后一个超管会让系统再也无法管理用户
        if (
          target.role === "superadmin" &&
          raw.role !== "superadmin" &&
          (await superAdminCount()) <= 1
        ) {
          return NextResponse.json(
            { error: "系统至少需要保留一个超级管理员" },
            { status: 400 }
          )
        }
        data.role = raw.role
        // 只改角色、没显式给权限时，回到该角色的默认模板，
        // 避免「管理员」还挂着主控的 7 项权限这种反直觉状态
        if (raw.permissions === undefined) {
          data.permissions = null
        }
      }

      if (raw.permissions !== undefined) {
        data.permissions =
          raw.permissions === null
            ? null
            : JSON.stringify(parsePermissions(raw.permissions))
      }
    } else {
      // 改自己：只允许联系方式，防止自助提权
      for (const key of PROFILE_FIELDS) {
        if (raw[key] !== undefined) data[key] = raw[key]
      }
      if (raw.role !== undefined || raw.permissions !== undefined) {
        return NextResponse.json(
          { error: "无权修改自己的角色或权限" },
          { status: 403 }
        )
      }
      if (raw.password !== undefined) {
        return NextResponse.json(
          { error: "请使用「修改密码」功能" },
          { status: 400 }
        )
      }
    }

    if (canManage && typeof raw.password === "string" && raw.password) {
      data.password = await hashPassword(raw.password)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 })
    }

    const user = await userManager.updateUser(id, data)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 权限/角色变了要立刻生效，不能等 60 秒缓存过期
    clearPermissionCache(id)

    const { password: _password, ...rest } = user
    return NextResponse.json({
      user: {
        ...rest,
        permissions: effectivePermissions(user.role, user.permissions),
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getAuthUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { perms } = await getPermissionsForUser(
      currentUser.userId,
      currentUser.role
    )
    if (!perms.has("user.manage")) {
      return NextResponse.json({ error: "需要用户管理权限" }, { status: 403 })
    }

    if (currentUser.userId === id) {
      return NextResponse.json(
        { error: "不能删除当前登录的账号" },
        { status: 400 }
      )
    }

    const target = await userManager.getUserById(id)
    if (!target) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    if (target.role === "superadmin" && (await superAdminCount()) <= 1) {
      return NextResponse.json(
        { error: "系统至少需要保留一个超级管理员" },
        { status: 400 }
      )
    }

    const success = await userManager.deleteUser(id)
    if (!success) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    clearPermissionCache(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 })
  }
}
