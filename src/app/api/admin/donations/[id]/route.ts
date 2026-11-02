// @version v2.0.6
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/permissions-server"
import { donationManager } from "@/storage/database"

/** DELETE 需要 donation.manage：删除一条支持记录（录错了用） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission(request, "donation.manage")
  if (guard.error) return guard.error

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "缺少记录 id" }, { status: 400 })
    }
    const ok = await donationManager.remove(id)
    if (!ok) {
      return NextResponse.json({ error: "记录不存在或已删除" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Delete donation error:", error)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
