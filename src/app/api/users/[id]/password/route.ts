// @version v2.0.3
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { getAuthUser } from "@/lib/auth"
import { verifyPassword, hashPassword } from "@/lib/password"
import { getPermissionsForUser } from "@/lib/permissions-server"

/**
 * [v1.5.29 权限] 修改密码
 *
 * 规则：
 * - 改自己：需要旧密码（防止 cookie 被盗后直接改密码）
 * - 改他人：需要 user.manage；目标是超管时，操作者也必须是超管
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { oldPassword, password } = body

    if (!password || String(password).trim().length === 0) {
      return NextResponse.json({ error: "新密码不能为空" }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "密码长度至少为6位" }, { status: 400 })
    }

    const isSelf = authUser.userId === id
    const user = await userManager.getUserById(id)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    if (!isSelf) {
      const { perms, role } = await getPermissionsForUser(
        authUser.userId,
        authUser.role
      )
      if (!perms.has("user.manage")) {
        return NextResponse.json({ error: "无权修改他人密码" }, { status: 403 })
      }
      if (user.role === "superadmin" && role !== "superadmin") {
        return NextResponse.json(
          { error: "只有超级管理员可以重置超级管理员的密码" },
          { status: 403 }
        )
      }
    }

    // 修改自己的密码需要验证旧密码
    if (isSelf) {
      if (!oldPassword) {
        return NextResponse.json({ error: "请输入当前密码" }, { status: 400 })
      }
      const isValid = await verifyPassword(oldPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: "当前密码错误" }, { status: 400 })
      }
    }

    // [v1.5.29 修复] 写入前必须哈希：updateUser 只做 schema 校验，不会自动哈希
    await userManager.updateUser(id, { password: await hashPassword(password) })

    return NextResponse.json({ message: "密码修改成功" })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 })
  }
}
