// @version v1.5.8
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function GET(request: NextRequest) {
  try {
    // 从中间件设置的用户信息头获取当前用户
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    
    console.log("Users GET - userId:", userId, "userRole:", userRole)

    if (!userId) {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }

    // 只有管理员可以查看用户列表
    if (userRole !== "admin") {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")

    // 仅允许合法的 role 枚举值，避免无效过滤
    const validRoles = ["admin", "user"]
    const roleFilter = role && validRoles.includes(role) ? role : undefined

    const users = await userManager.getUsers({
      filters: roleFilter ? { role: roleFilter } : undefined,
    })

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password: _, ...user }) => user)

    return NextResponse.json({ users: usersWithoutPasswords })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 从中间件设置的用户信息头获取当前用户
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")

    if (!userId) {
      return NextResponse.json({ error: "需要登录" }, { status: 401 })
    }

    // 只有管理员可以创建用户
    if (userRole !== "admin") {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 })
    }

    const body = await request.json()
    const { username, password, name, equipment, antenna, qth, role } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      )
    }

    const user = await userManager.createUser({
      username,
      password,
      name,
      equipment,
      antenna,
      qth,
      role: role || "user",
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    const errorMessage = error instanceof Error ? error.message : "创建用户失败"
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
