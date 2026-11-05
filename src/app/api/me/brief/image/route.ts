// @version v2.0.6
/**
 * [v2.0.4] 台网简报图片托管
 *
 * 为什么这么做：微信内置浏览器会拦截 <a download>（提示"请到浏览器中保存"），
 * 而用户不能离开微信（登录态绑定在微信授权 Cookie 上）。
 * 解决办法是把图存成一个真实的 https 地址，微信里长按图片即可「保存到相册 / 发送给朋友」。
 *
 * POST  /api/me/brief/image?sessionId=xxx   前端画好的 PNG（dataURL）→ 返回可访问 URL
 * GET   /api/me/brief/image?id=xxx          读取并输出 PNG
 *
 * 存储：系统临时目录 br4in-brief/{uuid}.png，由调用方随机 id 访问，不落数据库。
 * 权限：POST 复用简报权限（本场主控或管理员）；GET 凭随机 id 读取。
 */

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { randomUUID } from "crypto"
import { resolveBrief } from "@/lib/me/briefAuth"

const DIR = path.join(os.tmpdir(), "br4in-brief")
const MAX_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveBrief(request)
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, needLogin: auth.needLogin ?? false },
        { status: auth.status }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { image?: string }
    const matched = /^data:image\/png;base64,(.+)$/.exec(String(body.image || ""))
    if (!matched) {
      return NextResponse.json({ error: "图片格式不正确" }, { status: 400 })
    }

    const buf = Buffer.from(matched[1], "base64")
    if (buf.length === 0) {
      return NextResponse.json({ error: "图片为空" }, { status: 400 })
    }
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "图片过大" }, { status: 413 })
    }

    await fs.mkdir(DIR, { recursive: true })
    const id = randomUUID()
    await fs.writeFile(path.join(DIR, `${id}.png`), buf)

    return NextResponse.json({ url: `/api/me/brief/image?id=${id}` })
  } catch (error) {
    console.error("[me.brief.image] 保存图片失败:", error)
    return NextResponse.json({ error: "保存简报图片失败" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || ""
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "参数不正确" }, { status: 400 })
  }
  try {
    const buf = await fs.readFile(path.join(DIR, `${id}.png`))
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "图片不存在或已过期" }, { status: 404 })
  }
}
