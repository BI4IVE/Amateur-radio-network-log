// @version v2.0.0
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/permissions-server"
import { logManager } from "@/storage/database"
import { eq } from "drizzle-orm"
import { logSessions } from "@/storage/database/shared/schema"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // [v1.5.29 权限] 主控可开启预告的台网
  const auth = await requirePermission(_req, "ops.schedule")
  if ("error" in auth) return auth.error

  const session = await logManager.getLogSessionById(id)
  if (!session) {
    return NextResponse.json({ success: false, error: "预告不存在" }, { status: 404 })
  }
  if (session.status !== "scheduled") {
    return NextResponse.json(
      { success: false, error: "该台网已开始或已结束，无法重复开始" },
      { status: 400 }
    )
  }

  const started = await logManager.startScheduledSession(id)
  if (!started) {
    return NextResponse.json({ success: false, error: "开始台网失败" }, { status: 500 })
  }

  return NextResponse.json({ success: true, session: started })
}
