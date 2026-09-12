// @version v1.5.21
import { NextRequest, NextResponse } from "next/server"
import { checkSignature } from "@/lib/wechat/signature"
import { wechatBindingsManager } from "@/storage/database"

/**
 * [v1.5.21 微信推送] 公众号服务器回调
 *
 * GET  —— 服务器配置验证：校验 signature 后原样回显 echostr
 * POST —— 事件推送：关注 / 取关
 *
 * 该路径已在 middleware 的 publicPaths 放行（微信服务器无登录态）。
 * 采用明文模式，不做 AES 解密（公众号后台选「明文模式」即可）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const signature = searchParams.get("signature") ?? ""
  const timestamp = searchParams.get("timestamp") ?? ""
  const nonce = searchParams.get("nonce") ?? ""
  const echostr = searchParams.get("echostr") ?? ""

  if (!checkSignature(signature, timestamp, nonce)) {
    console.warn("[wechat.callback] signature 校验失败，拒绝服务器验证请求")
    return new NextResponse("signature mismatch", { status: 403 })
  }

  return new NextResponse(echostr)
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const signature = searchParams.get("signature") ?? ""
    const timestamp = searchParams.get("timestamp") ?? ""
    const nonce = searchParams.get("nonce") ?? ""

    if (!checkSignature(signature, timestamp, nonce)) {
      console.warn("[wechat.callback] signature 校验失败，忽略本次事件推送")
      return new NextResponse("signature mismatch", { status: 403 })
    }

    const xml = await request.text()
    const event = parseXmlField(xml, "Event")
    const openid = parseXmlField(xml, "FromUserName")

    if (openid && event) {
      if (event === "unsubscribe") {
        // 取关：绑定置为失效，避免持续无效推送（决策 9 = A）
        await wechatBindingsManager.setStatus(openid, "inactive")
        console.log(`[wechat.callback] 用户取关，绑定置失效: ${openid}`)
      } else if (event === "subscribe") {
        // 重新关注：只恢复「已失效」的绑定。
        // 绝不自动放行 pending（待审核）或 rejected（已拒绝），否则会绕过人工审核。
        const binding = await wechatBindingsManager.getByOpenid(openid)
        if (binding && binding.status === "inactive") {
          await wechatBindingsManager.setStatus(openid, "active")
          console.log(`[wechat.callback] 用户重新关注，恢复绑定: ${openid}`)
        }
      }
    }

    // 微信要求返回 success，否则会判定推送失败并重试
    return new NextResponse("success")
  } catch (error) {
    console.error("[wechat.callback] 处理事件推送失败:", error)
    // 出错也必须回 success，避免微信反复重试同一事件
    return new NextResponse("success")
  }
}

/** 解析微信 XML 中指定字段（兼容 CDATA 与普通文本两种写法） */
function parseXmlField(xml: string, field: string): string | null {
  const pattern = new RegExp(
    `<${field}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${field}>|<${field}>([\\s\\S]*?)</${field}>`
  )
  const match = xml.match(pattern)
  if (!match) return null
  return (match[1] ?? match[2] ?? "").trim() || null
}
