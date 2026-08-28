// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"
import { getAuthUser, requireLogin, requireAdmin } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 验证管理员权限
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const participant = await participantManager.updateParticipant(id, body)

    if (!participant) {
      return NextResponse.json({ error: "参与者不存在" }, { status: 404 })
    }

    return NextResponse.json({ participant })
  } catch (error) {
    console.error("Update participant error:", error)
    return NextResponse.json(
      { error: "更新参与者失败" },
      { status: 500 }
    )
  }
}
