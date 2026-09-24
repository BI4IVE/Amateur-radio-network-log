// @version v1.5.23
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/AdminLayout"
import SetupGuide from "./SetupGuide"

type BindMode = "idcard" | "bindcode" | "manual"

type Settings = {
  pushEnabled: boolean
  templateId: string
  bindMode: BindMode
  bindCodeHours: number
  bindCodeLength: number
  allowSelfUnbind: boolean
  pushOnlyToday: boolean
  pushDedupe: boolean
  siteName: string
  bindNotice: string
  keywordMap: Record<string, string>
}

type EnvStatus = {
  env: {
    appId: boolean
    appSecret: boolean
    token: boolean
    encodingAesKey: boolean
    memberIdSalt: boolean
    templateIdEnv: boolean
  }
  pushEnabled: boolean
  templateId: string
  ready: boolean
}

const ENV_LABELS: {
  key: keyof EnvStatus["env"]
  label: string
  hint: string
}[] = [
  {
    key: "appId",
    label: "WECHAT_APPID",
    hint: "公众号后台 → 设置与开发 → 基本配置 → 公众号开发信息",
  },
  {
    key: "appSecret",
    label: "WECHAT_APPSECRET",
    hint: "同上位置的 AppSecret（只显示一次，注意保存）",
  },
  {
    key: "token",
    label: "WECHAT_TOKEN",
    hint: "必须与公众号「服务器配置」里填的令牌完全一致（区分大小写）",
  },
  {
    key: "encodingAesKey",
    label: "WECHAT_ENCODING_AES_KEY",
    hint: "公众号服务器配置页点「随机生成」得到的密钥（明文模式暂不使用）",
  },
  {
    key: "memberIdSalt",
    label: "MEMBER_ID_SALT",
    hint: "强随机字符串，仅「身份证后六位」方式需要；启用后不可更改",
  },
]

const BIND_MODES: { value: BindMode; label: string; desc: string }[] = [
  {
    value: "idcard",
    label: "身份证后六位",
    desc: "会员自助认证：需先在「会员对照表」导入呼号与身份证后六位哈希",
  },
  {
    value: "bindcode",
    label: "一次性绑定码",
    desc: "管理员在「绑定码」页为呼号生成绑定码，用户填呼号+绑定码绑定",
  },
  {
    value: "manual",
    label: "人工审核",
    desc: "用户提交呼号后进入待审核，管理员在「绑定管理」页审核通过",
  },
]

const FIELD_OPTIONS = [
  { value: "", label: "（不使用）" },
  { value: "callsign", label: "呼号" },
  { value: "qth", label: "QTH" },
  { value: "equipment", label: "设备" },
  { value: "antenna", label: "天馈" },
  { value: "signal", label: "信号报告" },
  { value: "report", label: "备注/报告" },
  { value: "time", label: "时间" },
]

const KEYWORDS = ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"]

export default function WechatConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)

  // 测试推送
  const [testOpenid, setTestOpenid] = useState("")
  const [testCallsign, setTestCallsign] = useState("")
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userStr)
    if (user.role !== "admin") {
      alert("无权访问此页面")
      router.push("/")
      return
    }
    loadAll()
  }, [router])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch("/api/admin/wechat/settings"),
        fetch("/api/admin/wechat/status"),
      ])
      const settingsData = await settingsRes.json()
      const statusData = await statusRes.json()
      if (settingsData.settings) setSettings(settingsData.settings)
      if (!statusRes.ok) throw new Error(statusData.error || "加载状态失败")
      setEnvStatus(statusData)
    } catch (error) {
      console.error("Load wechat config error:", error)
      alert("加载微信配置失败")
    } finally {
      setLoading(false)
    }
  }

  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/wechat/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      alert("配置已保存，立即生效")
      loadAll()
    } catch (error) {
      console.error("Save wechat settings error:", error)
      alert(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleTestPush = async () => {
    if (!testOpenid.trim() && !testCallsign.trim()) {
      alert("请填写 openid 或呼号")
      return
    }
    setPushing(true)
    setPushResult(null)
    try {
      const res = await fetch("/api/admin/wechat/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openid: testOpenid.trim(),
          callsign: testCallsign.trim(),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setPushResult(`推送成功！消息 ID：${data.msgid || "-"}，请查看微信是否收到。`)
      } else {
        setPushResult(`推送失败：${data.errcode ?? ""} ${data.errmsg || data.error || ""}`)
      }
    } catch (error) {
      setPushResult(`推送异常：${error instanceof Error ? error.message : "未知错误"}`)
    } finally {
      setPushing(false)
    }
  }

  if (loading || !settings) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-black">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">微信推送配置</h2>
            <p className="text-sm text-black mt-1">
              所有业务参数均可在此修改，无需改代码或改 .env（密钥类除外）
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>

        {/* 0. 接入引导（自动生成当前站点配置值 + 分步说明） */}
        <SetupGuide />

        {/* 1. 服务器 .env 检查 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-black mb-1">
            1. 服务器 .env 密钥配置
          </h3>
          <p className="text-sm text-black mb-4">
            密钥类配置需写入服务器 .env 并重启服务，此处只显示是否已配置（不显示明文）。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ENV_LABELS.map((item) => {
              const ok = envStatus?.env[item.key]
              return (
                <div key={item.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                  <span className={`text-lg leading-none ${ok ? "text-green-600" : "text-red-500"}`}>
                    {ok ? "✔" : "✘"}
                  </span>
                  <div>
                    <div className="font-mono text-sm text-black">{item.label}</div>
                    <div className="text-xs text-black">{item.hint}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. 推送基础设置 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-black">2. 推送开关与模板</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushEnabled}
              onChange={(e) => patch("pushEnabled", e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-black">启用模板消息推送</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-black mb-1">站点 / 组织名称</label>
            <input
              value={settings.siteName}
              onChange={(e) => patch("siteName", e.target.value)}
              placeholder="显示在微信绑定页"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">模板ID</label>
            <input
              value={settings.templateId}
              onChange={(e) => patch("templateId", e.target.value)}
              placeholder="公众号后台选用模板后的模板ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
            />
          </div>
        </div>

        {/* 3. 模板 keyword 映射 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h3 className="text-lg font-semibold text-black">3. 模板字段映射</h3>
          <p className="text-sm text-black">
            按公众号模板实际的 keyword 顺序，选择每个 keyword 对应的数据字段；不用的选「（不使用）」。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KEYWORDS.map((kw) => (
              <div key={kw} className="flex items-center gap-3">
                <span className="w-24 text-sm font-mono text-black">{kw}</span>
                <select
                  value={settings.keywordMap?.[kw] ?? ""}
                  onChange={(e) => {
                    const next = { ...(settings.keywordMap || {}) }
                    if (e.target.value) next[kw] = e.target.value
                    else delete next[kw]
                    patch("keywordMap", next)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 绑定方式 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-black">4. 绑定认证方式</h3>
          <div className="space-y-2">
            {BIND_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                  settings.bindMode === mode.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="bindMode"
                  checked={settings.bindMode === mode.value}
                  onChange={() => patch("bindMode", mode.value)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-black">{mode.label}</div>
                  <div className="text-xs text-black">{mode.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {settings.bindMode === "bindcode" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-black mb-1">绑定码长度（位）</label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={settings.bindCodeLength}
                  onChange={(e) => patch("bindCodeLength", Number(e.target.value) || 6)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  有效期（小时，0=长期）
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.bindCodeHours}
                  onChange={(e) => patch("bindCodeHours", Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1">绑定页说明文案</label>
            <textarea
              value={settings.bindNotice}
              onChange={(e) => patch("bindNotice", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowSelfUnbind}
              onChange={(e) => patch("allowSelfUnbind", e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-black">允许用户自助解绑</span>
          </label>
        </div>

        {/* 5. 推送规则 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h3 className="text-lg font-semibold text-black">5. 推送规则</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushOnlyToday}
              onChange={(e) => patch("pushOnlyToday", e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-black">
              仅推送「今天」的台网场次（关闭后补录历史记录也会推送）
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushDedupe}
              onChange={(e) => patch("pushDedupe", e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-black">
              同一场次同一呼号只推一次（关闭后主控每次修改都会推送）
            </span>
          </label>
        </div>

        {/* 6. 测试推送 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-black">6. 测试推送</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">OpenID（二选一）</label>
              <input
                value={testOpenid}
                onChange={(e) => setTestOpenid(e.target.value)}
                placeholder="微信用户 openid"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">呼号（二选一）</label>
              <input
                value={testCallsign}
                onChange={(e) => setTestCallsign(e.target.value)}
                placeholder="如 BI4IVE（需已绑定且状态为已生效）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleTestPush}
            disabled={pushing}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {pushing ? "发送中..." : "发送测试消息"}
          </button>
          {pushResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                pushResult.includes("成功") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {pushResult}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
