// @version v2.0.5
/**
 * [v2.0.4] 台网简报数据 GET /api/me/brief?sessionId=xxx
 *
 * 权限：本场主控本人，或管理员/超管（见 briefAuth）。
 * 返回聚合数据 + 可选场次列表；图片由 /api/me/brief/image 直接输出 PNG。
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveBrief } from "@/lib/me/briefAuth"

export async function GET(request: NextRequest) {
  try {
    const result = await resolveBrief(request)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, needLogin: result.needLogin ?? false },
        { status: result.status }
      )
    }

    return NextResponse.json({
      brief: result.brief,
      sessions: result.sessions,
      isAdmin: result.isAdmin,
    })
  } catch (error) {
    console.error("[me.brief] 生成简报数据失败:", error)
    return NextResponse.json({ error: "生成简报数据失败" }, { status: 500 })
  }
}
