// @version v1.5.17
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// POST - 恢复软删除的记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; recordId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { recordId } = await params
    const success = await logManager.restoreLogRecord(recordId, {
      userId: user?.userId,
      username: user?.username,
    })

    if (!success) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    return NextResponse.json({ message: "记录已恢复" })
  } catch (error) {
    console.error("Admin restore record error:", error)
    return NextResponse.json({ error: "恢复记录失败" }, { status: 500 })
  }
}
