import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await userManager.getUserById(id)

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: "获取用户失败" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const user = await userManager.updateUser(id, body)

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: "更新用户失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await userManager.deleteUser(id)

    if (!success) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "用户已删除" })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: "删除用户失败" },
      { status: 500 }
    )
  }
}
