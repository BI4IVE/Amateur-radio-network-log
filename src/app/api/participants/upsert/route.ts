import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if participant exists by callsign
    const existingParticipant = await participantManager.getParticipantByCallsign(
      body.callsign
    )

    let participant
    if (existingParticipant) {
      // Update existing participant
      participant = await participantManager.updateParticipant(
        existingParticipant.id,
        body
      )
    } else {
      // Create new participant
      participant = await participantManager.createParticipant(body)
    }

    return NextResponse.json({
      participant,
      updated: !!existingParticipant,
    })
  } catch (error) {
    console.error("Upsert participant error:", error)
    return NextResponse.json(
      { error: "更新参与人员失败" },
      { status: 500 }
    )
  }
}
