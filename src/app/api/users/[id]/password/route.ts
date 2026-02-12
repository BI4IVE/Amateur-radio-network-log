import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { password } = body

    if (!password || password.trim().length === 0) {
      return NextResponse.json(
        { error: "密码不能为空" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少为6位" },
        { status: 400 }
      )
    }

    const user = await userManager.getUserById(id)

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // Update password
    await userManager.updateUser(id, { password })

    return NextResponse.json({ message: "密码修改成功" })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json(
      { error: "修改密码失败" },
      { status: 500 }
    )
  }
}
