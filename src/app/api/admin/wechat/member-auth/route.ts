// @version v1.5.24
import { NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import { wechatMemberAuthManager } from "@/storage/database"
import { hashMemberId } from "@/lib/wechat/config"

/**
 * [v1.5.21 微信推送] 会员对照表管理（绑定方式 = idcard 时使用）
 *
 * GET    ?callsign=&limit=&offset=  列表（只返回哈希，不返回明文）
 * POST   { rows: [{ callsign, idLast6, name? }] }  导入（哈希在服务端计算）
 * DELETE ?callsign=xxx              删除某呼号的对照记录
 *
 * 安全要点：身份证后六位随请求传来仅用于即时计算哈希，
 * 计算完即丢弃，明文绝不落库、绝不写日志。
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const callsign = searchParams.get("callsign") || undefined
    const limit = Number(searchParams.get("limit") ?? 50) || 50
    const offset = Number(searchParams.get("offset") ?? 0) || 0

    const result = await wechatMemberAuthManager.list({ limit, offset, callsign })
    return NextResponse.json(result)
  } catch (error) {
    console.error("List member auth error:", error)
    return NextResponse.json({ error: "获取会员对照表失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      rows?: { callsign?: string; idLast6?: string; name?: string }[]
    }

    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: "没有可导入的数据" }, { status: 400 })
    }

    const importedBy =
      (user as { userId?: string; id?: string } | null)?.userId ?? undefined

    // 在服务端计算哈希；SALT 缺失时 hashMemberId 会抛错，转成明确提示
    const payload = rows.map((r) => ({
      callsign: (r.callsign ?? "").trim().toUpperCase(),
      idHash: hashMemberId(String(r.idLast6 ?? "").trim()),
      name: r.name?.trim() || null,
      importedBy: importedBy ?? null,
    }))

    // 用原始值校验：空后六位也会算出哈希，若不拦下会静默导入无效记录
    const hasEmpty = rows.some(
      (r) =>
        !(r.callsign ?? "").trim() || String(r.idLast6 ?? "").trim() === ""
    )
    if (hasEmpty) {
      return NextResponse.json(
        { error: "存在呼号或身份证后六位为空的行" },
        { status: 400 }
      )
    }

    const count = await wechatMemberAuthManager.importRows(payload, importedBy)
    return NextResponse.json({ ok: true, count }, { status: 201 })
  } catch (error) {
    console.error("Import member auth error:", error)
    const message = error instanceof Error ? error.message : "导入失败"
    if (message.includes("MEMBER_ID_SALT")) {
      return NextResponse.json(
        { error: "服务器未配置 MEMBER_ID_SALT，无法导入" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    const callsign = request.nextUrl.searchParams.get("callsign")
    if (!callsign) {
      return NextResponse.json({ error: "缺少 callsign" }, { status: 400 })
    }

    // 呼号统一按大写存储，删除时同样归一化，避免大小写不一致导致删不掉
    const ok = await wechatMemberAuthManager.removeByCallsign(
      callsign.trim().toUpperCase()
    )
    return NextResponse.json({ ok })
  } catch (error) {
    console.error("Delete member auth error:", error)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
