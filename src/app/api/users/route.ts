import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")

    const users = await userManager.getUsers({
      filters: role ? { role: role as any } : undefined,
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
    const body = await request.json()
    const user = await userManager.createUser(body)

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: "创建用户失败" },
      { status: 500 }
    )
  }
}
