// @version v1.5.25
"use client"

import { useState, useEffect } from "react"

/**
 * [v1.5.21 微信推送] 接入引导组件
 *
 * 目的：让完全没接触过公众号配置的人，照着本页就能完成接入。
 * 关键值（回调 URL、绑定页地址、授权域名）全部按**当前访问的站点自动生成**，
 * 避免手抄域名出错（测试站与正式站会自动显示各自的域名）。
 */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert("复制失败，请手动选中后复制")
    }
  }

  return (
    <button
      onClick={copy}
      className="ml-3 px-2 py-1 text-xs border border-gray-300 rounded shrink-0 hover:bg-gray-50"
    >
      {copied ? "已复制" : "复制"}
    </button>
  )
}

function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

function ValueRow({
  title,
  value,
  note,
}: {
  title: string
  value: string
  note?: string
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
      <div className="min-w-0">
        <div className="text-xs text-black">{title}</div>
        <div className="font-mono text-sm break-all text-black">{value}</div>
        {note && <div className="text-xs text-black mt-1">{note}</div>}
      </div>
      <CopyButton text={value} />
    </div>
  )
}

export default function SetupGuide() {
  const [origin, setOrigin] = useState("")
  const [host, setHost] = useState("")
  const [token, setToken] = useState("")
  const [salt, setSalt] = useState("")
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOrigin(window.location.origin)
    setHost(window.location.hostname)
  }, [])

  const callbackUrl = origin ? `${origin}/api/wechat/callback` : "（加载中）"
  const bindUrl = origin ? `${origin}/wechat/bind` : "（加载中）"
  const authDomain = host || "（加载中）"

  const envText = [
    "WECHAT_APPID=公众号后台「基本配置 → 公众号开发信息」里的 AppID",
    "WECHAT_APPSECRET=同上位置的 AppSecret（只显示一次，注意保存）",
    token
      ? `WECHAT_TOKEN=${token}`
      : "WECHAT_TOKEN=点上方「生成 Token」按钮，把生成的值填在这里",
    "WECHAT_ENCODING_AES_KEY=公众号服务器配置页点「随机生成」得到的密钥",
    "WECHAT_TEMPLATE_ID=模板消息选用后的模板ID（留空也行，可在下方页面直接填）",
    salt
      ? `MEMBER_ID_SALT=${salt}`
      : "MEMBER_ID_SALT=点上方「生成 SALT」按钮（仅身份证方式需要，启用后不可更改）",
  ].join("\n")

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black">
            接入引导（按顺序做，照抄即可）
          </h3>
          <p className="text-sm text-black mt-1">
            下面的地址已按当前站点自动生成；在测试站打开就是测试站域名，在正式站打开就是正式站域名。
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-sm text-indigo-600 shrink-0 ml-4"
        >
          {open ? "收起" : "展开"}
        </button>
      </div>

      {open && (
        <div className="space-y-5">
          {/* 一、自动生成的关键值 */}
          <div>
            <div className="text-sm font-medium text-black mb-2">
              ① 本站对应的三个配置值（直接复制，不要手打）
            </div>
            <div className="space-y-2">
              <ValueRow
                title="服务器配置 URL（填到公众号「设置与开发 → 基本配置 → 服务器配置」的地址栏）"
                value={callbackUrl}
              />
              <ValueRow
                title="H5 绑定页地址（填到公众号「自定义菜单」的跳转网页）"
                value={bindUrl}
              />
              <ValueRow
                title="网页授权域名（填到公众号「功能设置 → 网页授权域名」，只填域名本身）"
                value={authDomain}
                note="注意：不带 https:// 、不带任何路径"
              />
            </div>
          </div>

          {/* 二、一键生成密钥 */}
          <div>
            <div className="text-sm font-medium text-black mb-2">
              ② 一键生成两个密钥
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setToken(randomString(32))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                生成 Token
              </button>
              <button
                onClick={() => setSalt(randomString(48))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                生成 SALT
              </button>
            </div>
            <div className="space-y-2 mt-3">
              <ValueRow
                title="WECHAT_TOKEN（同时填到公众号「服务器配置」的令牌栏，两边必须完全一致）"
                value={token || "尚未生成"}
              />
              <ValueRow
                title="MEMBER_ID_SALT（仅「身份证后六位」方式需要；一旦启用不可更改）"
                value={salt || "尚未生成"}
              />
            </div>
          </div>

          {/* 三、步骤 */}
          <div>
            <div className="text-sm font-medium text-black mb-2">
              ③ 公众号后台操作步骤
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-black">
              <li>
                确认公众号是<b>认证服务号</b>，并已开通「模板消息」功能插件（个人订阅号不支持本功能）。
              </li>
              <li>
                确认域名已完成 <b>ICP 备案</b> 且站点支持 HTTPS（微信强制要求）。
              </li>
              <li>
                公众号后台 → 设置与开发 → 基本配置 → 服务器配置：地址填上面「服务器配置 URL」，
                令牌填上面生成的 Token，消息加解密方式选 <b>明文模式</b>。
                <span className="text-red-600">
                  （重要：必须等本系统已在服务器部署并启动后，再点「启用」，否则会提示 token 验证失败）
                </span>
              </li>
              <li>
                公众号后台 → 设置与开发 → 公众号设置 → 功能设置 → 网页授权域名：
                填上面的「网页授权域名」。需先下载验证文件放到项目源码的{" "}
                <b>public/</b> 目录并重新构建部署，确认浏览器能打开该文件后再点保存。
              </li>
              <li>
                公众号后台 → 内容与互动 → 自定义菜单：新增菜单「绑定台网通知」，
                类型选「跳转网页」，地址填上面的「H5 绑定页地址」。
              </li>
              <li>
                把下面「服务器 .env 内容」追加到服务器项目根目录的 .env，
                然后重启服务（测试站：pm2 restart test-log；正式站：pm2 restart radio-log）。
              </li>
              <li>
                回到本页：填写「模板ID」、设置「模板字段映射」与「绑定认证方式」，
                最后用页面底部的「测试推送」验证是否打通。
              </li>
            </ol>
          </div>

          {/* 四、.env 模板 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-black">
                ④ 服务器 .env 需要追加的内容
              </span>
              <CopyButton text={envText} />
            </div>
            <pre className="p-3 bg-gray-50 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap text-black">
              {envText}
            </pre>
          </div>

          <p className="text-xs text-black">
            模板选用、keyword 映射说明、错误码排查等完整内容见项目文档{" "}
            <b>docs/11-wechat-push.md</b>。
          </p>
        </div>
      )}
    </div>
  )
}
