// @version v1.5.10
import { NextRequest, NextResponse } from "next/server"
import { participantManager } from "@/storage/database"
import { getAuthUser, requireUser, requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const callsign = searchParams.get("callsign") ?? undefined
    const name = searchParams.get("name") ?? undefined
    const limit = searchParams.get("limit")

    const participants = await participantManager.getParticipants({
      filters: { callsign, name },
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    return NextResponse.json({ participants })
  } catch (error) {
    console.error("Get participants error:", error)
    return NextResponse.json(
      { error: "获取参与者列表失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const user = await getAuthUser(request)
    const authError = requireUser(user)
    if (authError.error) {
      return NextResponse.json({ error: authError.error }, { status: 401 })
    }

    const { userRole: _, ...participantData } = body
    const participant = await participantManager.createParticipant(participantData)

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    console.error("Create participant error:", error)
    return NextResponse.json(
      { error: "创建参与者失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "缺少参与者 ID" }, { status: 400 })
    }

    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    await participantManager.deleteParticipant(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete participant error:", error)
    return NextResponse.json(
      { error: "删除参与者失败" },
      { status: 500 }
    )
  }
}
