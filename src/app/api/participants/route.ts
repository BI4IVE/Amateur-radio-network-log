import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const callsign = searchParams.get("callsign")
    const name = searchParams.get("name")

    const participants = await participantManager.getParticipants({
      filters: {
        callsign: callsign || undefined,
        name: name || undefined,
      },
    })

    return NextResponse.json({ participants })
  } catch (error) {
    console.error("Get participants error:", error)
    return NextResponse.json(
      { error: "获取参与人员列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const participant = await participantManager.createParticipant(body)

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    console.error("Create participant error:", error)
    return NextResponse.json(
      { error: "创建参与人员失败" },
      { status: 500 }
    )
  }
}
