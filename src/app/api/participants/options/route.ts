import { NextResponse } from "next/server"
import { participantManager } from "@/storage/database"

export async function GET() {
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
