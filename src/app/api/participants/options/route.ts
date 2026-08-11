import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"
import { getAuthUser, requireLogin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // 验证登录状态
  const user = await getAuthUser(request)
  const loginError = requireLogin(user)
  if (loginError.error) {
    return NextResponse.json({ error: loginError.error }, { status: 401 })
  }

  try {
    const participants = await participantManager.getParticipantOptions()
    return NextResponse.json({ participants })
  } catch (error) {
    console.error("Get participant options error:", error)
    return NextResponse.json(
      { error: "获取参与人员选项失败" },
      { status: 500 }
    )
  }
}
