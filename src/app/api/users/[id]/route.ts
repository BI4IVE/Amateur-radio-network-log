import { NextRequest, NextResponse } from "next/server"
import { userManager } from "@/storage/database"
import { getUserFromRequest } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 权限检查：管理员可以查看任何用户，普通用户只能查看自己
    if (currentUser.role !== "admin" && currentUser.userId !== id) {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      )
    }

    const user = await userManager.getUserById(id)

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "获取用户失败" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 权限检查：管理员可以修改任何用户，普通用户只能修改自己
    if (currentUser.role !== "admin" && currentUser.userId !== id) {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      )
    }

    const body = await request.json()
    // 移除可能传入的 userRole 参数
    const { userRole: _, ...userData } = body

    // 如果修改了密码，需要哈希
    if (userData.password) {
      const { hashPassword } = await import("@/lib/password")
      userData.password = await hashPassword(userData.password)
    }

    const user = await userManager.updateUser(id, userData)

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { password: __, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 权限检查：只有管理员可以删除用户
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "需要管理员权限" },
        { status: 403 }
      )
    }

    const success = await userManager.deleteUser(id)

    if (!success) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 })
  }
}
