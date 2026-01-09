import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      )
    }

    // Convert username and password to uppercase
    const uppercaseUsername = username.toUpperCase()
    const uppercasePassword = password.toUpperCase()

    const isValid = await userManager.verifyPassword(uppercaseUsername, uppercasePassword)

    if (!isValid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      )
    }

    const user = await userManager.getUserByUsername(uppercaseUsername)

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // Return user info without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "登录失败" },
      { status: 500 }
    )
  }
}
