// @version v1.5.24
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database/userManager"
import { verifyPassword } from "@/lib/password"
import { getAuthUser, requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

// POST /api/debug/login-check —— 登录诊断（仅管理员）
// [安全] 密码改为 POST + JSON 请求体传递，不再走 URL query，
// 避免密码被写入浏览器历史、Nginx/代理日志与 APM 系统。
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  const guard = requireAdmin(user)
  if (guard.error) {
    return NextResponse.json({ error: "未授权" }, { status: 403 })
  }

  let username = ""
  let password = ""
  try {
    const body = await req.json()
    username = typeof body?.username === "string" ? body.username : ""
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    return NextResponse.json(
      { error: "请求体需为 JSON：{ username, password }" },
      { status: 400 }
    )
  }

  const targetUser = await userManager.getUserByUsername(username)
  if (!targetUser) {
    return NextResponse.json({
      username,
      exists: false,
      passwordMatch: false,
      message: "用户不存在",
    })
  }

  const match = await verifyPassword(password, targetUser.password)
  return NextResponse.json({
    username,
    exists: true,
    passwordMatch: match,
    role: targetUser.role,
    passwordHashed: targetUser.password.startsWith("$2a$") || targetUser.password.startsWith("$2b$"),
    message: match ? "密码正确" : "密码错误",
  })
}
