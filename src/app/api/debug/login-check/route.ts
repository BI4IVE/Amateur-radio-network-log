import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')
    const password = searchParams.get('password')

    if (!username || !password) {
      return NextResponse.json({
        status: "error",
        message: "请提供 username 和 password 参数",
        example: "/api/debug/login-check?username=admin&password=admin123"
      })
    }

    // Step 1: Try to find user
    console.log("Step 1: Looking for user:", username)
    const user = await userManager.getUserByUsername(username)
    console.log("Found user:", user ? { id: user.id, username: user.username } : null)

    if (!user) {
      // Try to list all users for debugging
      const allUsers = await userManager.getUsers({ limit: 10 })
      return NextResponse.json({
        status: "user_not_found",
        search_username: username,
        search_username_uppercase: username.toUpperCase(),
        search_username_lowercase: username.toLowerCase(),
        existing_users: allUsers.map(u => ({ username: u.username, name: u.name }))
      })
    }

    // Step 2: Verify password
    const isValid = await userManager.verifyPassword(username, password)

    return NextResponse.json({
      status: "success",
      found_user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      password_check: {
        provided_password: password,
        provided_password_uppercase: password.toUpperCase(),
        provided_password_lowercase: password.toLowerCase(),
        stored_password: user.password,
        stored_password_uppercase: user.password.toUpperCase(),
        stored_password_lowercase: user.password.toLowerCase(),
        is_valid: isValid
      },
      notes: [
        "系统已支持大小写不敏感登录",
        "用户名: admin 和 ADMIN 都可以",
        "密码: admin123 和 ADMIN123 都可以"
      ]
    })
  } catch (error) {
    console.error("Login check error:", error)
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      details: String(error)
    })
  }
}
