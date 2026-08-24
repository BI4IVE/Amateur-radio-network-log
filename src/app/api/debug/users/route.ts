// @version v1.5.16
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database/userManager"
import { hashPassword } from "@/lib/password"
import { getAuthUser, requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

// GET /api/debug/users —— 返回所有用户（含 created_at）
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const guard = requireAdmin(user)
  if (guard.error) {
    return NextResponse.json({ error: "未授权" }, { status: 403 })
  }
  const users = await userManager.getUsers({ limit: 1000 })
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      created_at: u.createdAt,
    })),
  })
}

// POST /api/debug/users —— 按用户名创建或更新用户
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const guard = requireAdmin(user)
  if (guard.error) {
    return NextResponse.json({ error: "未授权" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { username, password, name, role: newRole } = body
    if (!username) {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 })
    }
    const existing = await userManager.getUserByUsername(username)
    if (existing) {
      const data: { name?: string; role?: string; password?: string } = {}
      if (name !== undefined) data.name = name
      if (newRole !== undefined) data.role = newRole
      if (password) data.password = await hashPassword(password) // 仅在提供时更新密码
      await userManager.updateUser(existing.id, data)
      return NextResponse.json({ message: `用户 ${username} 已更新` })
    }
    if (!password) {
      return NextResponse.json({ error: "创建用户时密码必填" }, { status: 400 })
    }
    await userManager.createUser({
      username,
      password: await hashPassword(password),
      name: name || username,
      role: newRole || "user",
    })
    return NextResponse.json({ message: `用户 ${username} 已创建` })
  } catch (e) {
    console.error("debug/users POST error:", e)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
