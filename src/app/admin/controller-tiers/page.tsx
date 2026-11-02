"use client"

// @version v2.0.5
/**
 * 后台「主控等级」设置
 *
 * 主控成长线的门槛不写死：这里改完保存即生效，个人中心下次打开就按新门槛分级。
 * 规则：2–6 级、场次严格递增、名称不超过 8 字。
 */

import { useEffect, useState } from "react"
import AdminLayout from "@/components/AdminLayout"

interface Tier {
  label: string
  min: number
}

const DEFAULTS: Tier[] = [
  { label: "初登场", min: 1 },
  { label: "见习主控", min: 10 },
  { label: "常任主控", min: 25 },
  { label: "资深主控", min: 50 },
  { label: "台网支柱", min: 100 },
]

export default function ControllerTiersPage() {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [isDefault, setIsDefault] = useState(true)

  useEffect(() => {
    fetch("/api/admin/controller-tiers")
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "读取失败")
        setTiers(Array.isArray(data.tiers) && data.tiers.length ? data.tiers : DEFAULTS)
        setIsDefault(!!data.isDefault)
      })
      .catch((e) => setMessage({ type: "err", text: e.message || "读取失败" }))
      .finally(() => setLoading(false))
  }, [])

  const update = (index: number, patch: Partial<Tier>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)))
    setMessage(null)
  }

  const addRow = () => {
    if (tiers.length >= 6) return
    const last = tiers[tiers.length - 1]
    setTiers([...tiers, { label: "", min: (last?.min ?? 0) + 10 }])
  }

  const removeRow = (index: number) => {
    if (tiers.length <= 2) return
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/controller-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      setTiers(data.tiers)
      setIsDefault(false)
      setMessage({ type: "ok", text: "已保存，个人中心即刻按新门槛分级" })
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "保存失败" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">主控等级</h1>
          <p className="text-sm text-gray-600 mt-1">
            主控成长线的门槛，改完保存即生效。场次按「已开台的台网场数」统计，预告不计。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">等级与门槛</h2>
            <span className="text-xs text-gray-500">
              {isDefault ? "当前使用默认值（尚未保存过）" : "当前使用自定义门槛"}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 py-6">加载中…</p>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr_140px_72px] gap-3 pb-2 text-xs text-gray-500">
                <span>等级名称</span>
                <span>达到场次</span>
                <span />
              </div>

              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-[1fr_140px_72px] gap-3 items-center"
                  >
                    <input
                      value={tier.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder={`第 ${i + 1} 级名称`}
                      maxLength={8}
                      className="px-3 py-2 border border-gray-300 rounded-lg outline-none text-black"
                    />
                    <input
                      type="number"
                      min={1}
                      value={tier.min}
                      onChange={(e) => update(i, { min: Number(e.target.value) })}
                      className="px-3 py-2 border border-gray-300 rounded-lg outline-none text-black"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={tiers.length <= 2}
                      className="text-xs text-red-500 disabled:text-gray-300"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={addRow}
                  disabled={tiers.length >= 6}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 disabled:opacity-40"
                >
                  + 添加一级
                </button>
                <span className="text-xs text-gray-500">最多 6 级，场次必须严格递增</span>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "保存中…" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTiers(DEFAULTS)
                    setMessage(null)
                  }}
                  className="px-4 py-2.5 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700"
                >
                  恢复默认
                </button>
              </div>

              {message ? (
                <p
                  className={`mt-4 text-sm ${
                    message.type === "ok" ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {message.text}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 leading-6">
          提示：门槛调小，已达标的人会立即升级；调大则可能降级（例如「见习主控」从 10 改到 11，
          原本 10 场的人会回到「初登场」）。历史数据不用重算，页面会按新门槛实时计算。
        </div>
      </div>
    </AdminLayout>
  )
}
