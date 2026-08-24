// @version v1.5.16
import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { getAuthUser } from "@/lib/auth"
import { verifyPassword, hashPassword } from "@/lib/password"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证登录状态
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json(
        { error: "需要登录" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { oldPassword, password } = body

    if (!password || password.trim().length === 0) {
      return NextResponse.json(
        { error: "新密码不能为空" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少为6位" },
        { status: 400 }
      )
    }

    // 权限检查：只能修改自己的密码，管理员可以修改任何人的密码
    if (authUser.userId !== id && authUser.role !== "admin") {
      return NextResponse.json(
        { error: "无权修改他人密码" },
        { status: 403 }
      )
    }

    const user = await userManager.getUserById(id)

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 修改自己的密码需要验证旧密码
    if (authUser.userId === id) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: "请输入旧密码" },
          { status: 400 }
        )
      }

      const isValid = await verifyPassword(oldPassword, user.password)
      if (!isValid) {
        return NextResponse.json(
          { error: "旧密码错误" },
          { status: 400 }
        )
      }
    }

    // 更新密码（会自动哈希）
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
