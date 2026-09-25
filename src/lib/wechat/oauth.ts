// @version v1.5.25
import { getWechatEnv } from "./config"

/**
 * [v1.5.21 微信推送] 网页授权（snsapi_base 静默授权）
 *
 * 静默授权用户无感知、不会看到授权弹窗，但只能拿到 openid（拿不到昵称头像），
 * 对本项目而言 openid 已足够，因此不用 snsapi_userinfo。
 */

/** 生成跳转微信的授权 URL，redirectUri 需为已备案域名下的地址 */
export function buildAuthorizeUrl(
  redirectUri: string,
  state = "bind"
): string {
  const { appId } = getWechatEnv()
  if (!appId) {
    throw new Error("未配置 WECHAT_APPID，无法生成授权链接")
  }

  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "snsapi_base",
    state,
  })
  return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`
}

/** 用 code 换取 openid（snsapi_base 只返回 openid / unionid） */
export async function codeToOpenid(
  code: string
): Promise<{ openid: string; unionid?: string }> {
  const { appId, appSecret } = getWechatEnv()
  if (!appId || !appSecret) {
    throw new Error("未配置 WECHAT_APPID / WECHAT_APPSECRET")
  }

  const params = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    code,
    grant_type: "authorization_code",
  })

  const res = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`
  )
  const json = (await res.json()) as {
    openid?: string
    unionid?: string
    errcode?: number
    errmsg?: string
  }

  if (!json.openid) {
    throw new Error(
      `网页授权失败: ${json.errcode ?? "unknown"} ${json.errmsg ?? ""}`
    )
  }
  return { openid: json.openid, unionid: json.unionid }
}
