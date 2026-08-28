// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // 验证登录状态
  const user = await getAuthUser(request)
  const loginError = requireLogin(user)
  if (loginError.error) {
    return NextResponse.json({ error: loginError.error }, { status: 401 })
  }

  try {
    const users = await userManager.getUserOptions()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get user options error:", error)
    return NextResponse.json(
      { error: "获取用户选项失败" },
      { status: 500 }
    )
  }
}
