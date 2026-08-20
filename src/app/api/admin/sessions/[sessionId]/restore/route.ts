// @version v1.5.11
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// POST - 恢复软删除的会话
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { sessionId } = await params
    const success = await logManager.restoreLogSession(sessionId, {
      userId: user?.userId,
      username: user?.username,
    })

    if (!success) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 })
    }

    return NextResponse.json({ message: "会话已恢复" })
  } catch (error) {
    console.error("Admin restore session error:", error)
    return NextResponse.json({ error: "恢复会话失败" }, { status: 500 })
  }
}
