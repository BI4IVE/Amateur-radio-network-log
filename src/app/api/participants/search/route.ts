// @version v1.5.20
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
    const searchParams = request.nextUrl.searchParams
    const callsign = searchParams.get("callsign")

    if (!callsign || callsign.length < 2) {
      return NextResponse.json({ participants: [] })
    }

    // Get all participants and filter by callsign (contains)
    const allParticipants = await participantManager.getParticipants({
      limit: 1000,
    })

    const filtered = allParticipants.filter((p) =>
      p.callsign.toLowerCase().includes(callsign.toLowerCase())
    )

    // Limit to 10 results
    const limited = filtered.slice(0, 10)

    return NextResponse.json({ participants: limited })
  } catch (error) {
    console.error("Search participants error:", error)
    return NextResponse.json(
      { error: "搜索参与人员失败" },
      { status: 500 }
    )
  }
}
