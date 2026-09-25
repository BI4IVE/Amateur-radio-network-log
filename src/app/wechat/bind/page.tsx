// @version v1.5.25
"use client"

import { useState, useEffect } from "react"

type BindMode = "idcard" | "bindcode" | "manual"

type BindState = {
  openid: string
  status: string | null // active / pending / rejected / inactive / null
  callsign: string | null
  bindMode: BindMode
  siteName: string
  bindNotice: string
  allowSelfUnbind: boolean
}

/**
 * [v1.5.21 微信推送] 用户端 H5 绑定页
 *
 * 页面形态完全由后台设置决定（面向多中继台通用）：
 * - bindMode 决定显示哪种认证表单
 * - status 决定显示已绑定 / 待审核 / 已拒绝 等状态
 * - siteName、bindNotice、allowSelfUnbind 均来自后台配置
 */
export default function WechatBindPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<BindState | null>(null)

  const [callsign, setCallsign] = useState("")
  const [idLast6, setIdLast6] = useState("")
  const [bindCode, setBindCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      // 微信 code 一次性有效，刷新页面后即失效，因此把 openid 缓存在会话中
      const cachedOpenid = sessionStorage.getItem("wechat_openid")

      const query = code
        ? `code=${encodeURIComponent(code)}`
        : cachedOpenid
        ? `openid=${encodeURIComponent(cachedOpenid)}`
        : null

      if (!query) {
        const redirectUri = window.location.origin + window.location.pathname
        try {
          const res = await fetch(
            `/api/wechat/authorize-url?redirect_uri=${encodeURIComponent(redirectUri)}`
          )
          const data = await res.json()
          if (data.url) {
            window.location.href = data.url
            return
          }
          setError(data.error || "无法发起微信授权")
        } catch {
          setError("无法发起微信授权，请稍后重试")
        } finally {
          setLoading(false)
        }
        return
      }

      try {
        const res = await fetch(`/api/wechat/status?${query}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "查询绑定状态失败")
        if (data.openid) sessionStorage.setItem("wechat_openid", data.openid)
        setState({
          openid: data.openid,
          status: data.status ?? null,
          callsign: data.callsign ?? null,
          bindMode: data.bindMode,
          siteName: data.siteName,
          bindNotice: data.bindNotice,
          allowSelfUnbind: Boolean(data.allowSelfUnbind),
        })
      } catch (e) {
        // 缓存失效时清除，下次进入重新走授权流程
        sessionStorage.removeItem("wechat_openid")
        setError(e instanceof Error ? e.message : "查询绑定状态失败")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleBind = async () => {
    if (!callsign.trim()) {
      setMessage("请填写呼号")
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/wechat/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openid: state?.openid,
          callsign: callsign.trim(),
          idLast6: idLast6.trim(),
          bindCode: bindCode.trim(),
        }),
      })
      const data = await res.json()

      if (data.ok) {
        setState((prev) =>
          prev ? { ...prev, status: data.status, callsign: data.callsign } : prev
        )
        setMessage(
          data.status === "pending"
            ? "已提交，等待管理员审核通过后生效。"
            : "绑定成功！主控台提交您的参与记录后会自动收到微信回执。"
        )
        setIdLast6("")
        setBindCode("")
      } else {
        setMessage(data.error || "绑定失败")
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "绑定失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnbind = async () => {
    if (!confirm("确定解绑吗？解绑后将不再收到台网参与回执。")) return
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/wechat/unbind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openid: state?.openid }),
      })
      const data = await res.json()
      if (data.ok) {
        setState((prev) => (prev ? { ...prev, status: "inactive", callsign: null } : prev))
        setMessage("已解绑，可重新绑定其他呼号。")
      } else {
        setMessage(data.error || "解绑失败")
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "解绑失败")
    } finally {
      setSubmitting(false)
    }
  }

  /** 是否处于「已生效」状态（可正常接收推送） */
  const isActive = state?.status === "active"

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4">
      <div className="w-full max-w-md mt-8 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-black">绑定台网通知</h1>
          <p className="text-sm text-black mt-1">{state?.siteName || "业余无线电台网"}</p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-black text-sm">
            正在识别您的微信身份...
          </div>
        )}

        {error && (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-xs text-black mt-2">
              如已在微信客户端内打开仍出现此提示，请联系管理员。
            </p>
          </div>
        )}

        {!loading && !error && state && (
          <>
            {isActive ? (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-lg font-semibold text-black">
                    已绑定呼号 {state.callsign}
                  </div>
                  <p className="text-sm text-black mt-1">
                    主控台提交您的参与记录后，将自动收到微信回执。
                  </p>
                </div>
                {state.allowSelfUnbind ? (
                  <button
                    onClick={handleUnbind}
                    disabled={submitting}
                    className="w-full py-2.5 border border-red-300 text-red-600 rounded-lg text-sm disabled:opacity-50"
                  >
                    {submitting ? "处理中..." : "解除绑定"}
                  </button>
                ) : (
                  <p className="text-xs text-black text-center">
                    如需解绑或变更呼号，请联系管理员。
                  </p>
                )}
              </div>
            ) : state.status === "pending" ? (
              <div className="bg-white rounded-lg shadow p-6 text-center space-y-2">
                <div className="text-3xl">⏳</div>
                <div className="text-lg font-semibold text-black">
                  绑定申请审核中
                </div>
                <p className="text-sm text-black">
                  呼号 {state.callsign} 已提交，等待管理员审核通过后即可生效。
                </p>
              </div>
            ) : state.status === "rejected" ? (
              <div className="bg-white rounded-lg shadow p-6 text-center space-y-2">
                <div className="text-3xl">❌</div>
                <div className="text-lg font-semibold text-black">绑定申请未通过</div>
                <p className="text-sm text-black">
                  呼号 {state.callsign} 的申请被拒绝，请核对呼号后重新提交，或联系管理员。
                </p>
                <button
                  onClick={() => setState((prev) => (prev ? { ...prev, status: null } : prev))}
                  className="w-full mt-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm"
                >
                  重新申请
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                {state.bindNotice && (
                  <p className="text-sm text-black bg-gray-50 rounded-lg p-3">
                    {state.bindNotice}
                  </p>
                )}

                <div>
                  <label className="block text-sm font-medium text-black mb-1">呼号</label>
                  <input
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="如 BI4IVE"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>

                {state.bindMode === "idcard" && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      身份证后六位
                    </label>
                    <input
                      value={idLast6}
                      onChange={(e) => setIdLast6(e.target.value)}
                      placeholder="用于核验身份"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-black mt-1">
                      仅用于核验身份，系统只存储加盐哈希，不会保存明文。
                    </p>
                  </div>
                )}

                {state.bindMode === "bindcode" && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">绑定码</label>
                    <input
                      value={bindCode}
                      onChange={(e) => setBindCode(e.target.value)}
                      placeholder="管理员发放的绑定码"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-black mt-1">
                      绑定码与呼号一一对应，使用后立即失效。
                    </p>
                  </div>
                )}

                {state.bindMode === "manual" && (
                  <p className="text-xs text-black">
                    提交后需管理员审核，审核通过后即可收到台网回执。
                  </p>
                )}

                <button
                  onClick={handleBind}
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? "提交中..." : state.bindMode === "manual" ? "提交申请" : "绑定"}
                </button>
              </div>
            )}
          </>
        )}

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes("成功") || message.includes("已解绑") || message.includes("已提交")
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
