import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const participant = await participantManager.getParticipantById(id)

    if (!participant) {
      return NextResponse.json(
        { error: "参与人员不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ participant })
  } catch (error) {
    console.error("Get participant error:", error)
    return NextResponse.json(
      { error: "获取参与人员失败" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const participant = await participantManager.updateParticipant(id, body)

    if (!participant) {
      return NextResponse.json(
        { error: "参与人员不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ participant })
  } catch (error) {
    console.error("Update participant error:", error)
    return NextResponse.json(
      { error: "更新参与人员失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await participantManager.deleteParticipant(id)

    if (!success) {
      return NextResponse.json(
        { error: "参与人员不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "参与人员已删除" })
  } catch (error) {
    console.error("Delete participant error:", error)
    return NextResponse.json(
      { error: "删除参与人员失败" },
      { status: 500 }
    )
  }
}
