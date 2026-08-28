// @version v1.5.18
import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // 验证登录状态
    const user = await getAuthUser(request)
    const loginError = requireLogin(user)
    if (loginError.error) {
      return NextResponse.json({ error: loginError.error }, { status: 401 })
    }

    const body = await request.json()
    const participant = await participantManager.upsertParticipant(body)

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    console.error("Upsert participant error:", error)
    return NextResponse.json(
      { error: "更新或创建参与者失败" },
      { status: 500 }
    )
  }
}
