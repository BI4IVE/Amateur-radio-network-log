import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function GET() {
  try {
    const users = await userManager.getUsers({ limit: 20 })

    // Only return safe information (no passwords)
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      created_at: user.createdAt
    }))

    return NextResponse.json({
      count: safeUsers.length,
      users: safeUsers
    })
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
    const body = await request.json()
    const { username, password, name, role } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await userManager.getUserByUsername(username)
    if (existingUser) {
      // Update existing user's password
      const updatedUser = await userManager.updateUser(existingUser.id, {
        password: password
      })

      const { password: _, ...userWithoutPassword } = updatedUser!

      return NextResponse.json({
        message: "用户密码已更新",
        user: userWithoutPassword
      })
    }

    // Create new user
    const newUser = await userManager.createUser({
      username: username.toUpperCase(),
      password: password,
      name: name || username,
      role: role || "user"
    })

    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json({
      message: "用户创建成功",
      user: userWithoutPassword
    })
  } catch (error) {
    console.error("Create/Update user error:", error)
    return NextResponse.json(
      { error: "操作失败" },
      { status: 500 }
    )
  }
}
