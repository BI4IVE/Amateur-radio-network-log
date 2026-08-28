// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database/userManager"
import { verifyPassword } from "@/lib/password"
import { getAuthUser, requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

// GET /api/debug/login-check?username=&password= —— 登录诊断
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  const guard = requireAdmin(user)
  if (guard.error) {
    return NextResponse.json({ error: "未授权" }, { status: 403 })
  }
  const username = req.nextUrl.searchParams.get("username") || ""
  const password = req.nextUrl.searchParams.get("password") || ""

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
