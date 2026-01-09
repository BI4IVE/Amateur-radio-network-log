import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { participantManager } from "@/storage/database"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()

    // Add record to session
    const record = await logManager.createLogRecord({
      sessionId,
      callsign: body.callsign,
      qth: body.qth || null,
      equipment: body.equipment || null,
      antenna: body.antenna || null,
      power: body.power || null,
      signal: body.signal || null,
      report: body.report || null,
      remarks: body.remarks || null,
    })

    // Update or create participant in database
    const existingParticipant = await participantManager.getParticipantByCallsign(
      body.callsign
    )

    const participantData = {
      callsign: body.callsign,
      name: body.qth?.split(" ")[0] || body.callsign,
      qth: body.qth || null,
      equipment: body.equipment || null,
      antenna: body.antenna || null,
      power: body.power || null,
      signal: body.signal || null,
      report: body.report || null,
      remarks: body.remarks || null,
    }

    let updatedParticipant
    if (existingParticipant) {
      // Update existing participant with latest data
      updatedParticipant = await participantManager.updateParticipant(
        existingParticipant.id,
        participantData
      )
    } else {
      // Create new participant
      updatedParticipant = await participantManager.createParticipant(
        participantData
      )
    }

    return NextResponse.json({
      record,
      participant: updatedParticipant,
      updated: !!existingParticipant,
    })
  } catch (error) {
    console.error("Add record with participant error:", error)
    return NextResponse.json(
      { error: "添加记录失败" },
      { status: 500 }
    )
  }
}
