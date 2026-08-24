// @version v1.5.16
import { NextRequest, NextResponse } from "next/server"
import { logManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"

// GET - 回收站：已软删除的台网会话
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const items = await logManager.getDeletedSessions()
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error("Admin recycle error:", error)
    return NextResponse.json({ error: "获取回收站失败" }, { status: 500 })
  }
}
