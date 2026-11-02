"use client"

// @version v2.0.6
/**
 * 后台「支持记录」
 *
 * 会员中心 → 支持记录：录入 / 删除台友对台网的赞助（现金、物资、场地）。
 * 金额只在这里出现（对账用）；个人中心只显示最近一年的金额，档位按次数算。
 */

import { useCallback, useEffect, useState } from "react"
import AdminLayout from "@/components/AdminLayout"

interface DonationItem {
  id: string
  callsign: string
  amount: number | null
  donatedAt: string
  channel: string | null
  note: string | null
  anonymous: boolean
  /** person = 个人捐助；aggregate = 汇总/其他收入 */
  kind: string
  createdBy: string | null
}

const CHANNELS = ["微信", "现金", "物资", "场地", "其他"]

function today(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export default function DonationsPage() {
  const [items, setItems] = useState<DonationItem[]>([])
  const [amountTotal, setAmountTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const [form, setForm] = useState({
    callsign: "",
    amount: "",
    donatedAt: today(),
    channel: "微信",
    note: "",
    anonymous: false,
    kind: "person",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/donations?limit=300")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "读取失败")
      setItems(Array.isArray(data.items) ? data.items : [])
      setAmountTotal(Number(data.amountTotal) || 0)
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "读取失败" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    if (!form.callsign.trim()) {
      setMessage({ type: "err", text: "请填写呼号" })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callsign: form.callsign.trim().toUpperCase(),
          amount: form.amount.trim() === "" ? null : Number(form.amount),
          donatedAt: form.donatedAt,
          channel: form.channel,
          note: form.note.trim() || null,
          anonymous: form.anonymous,
          kind: form.kind,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "录入失败")
      setMessage({ type: "ok", text: `已记录 ${form.callsign.trim().toUpperCase()} 的支持` })
      setForm((f) => ({ ...f, callsign: "", amount: "", note: "" }))
      await load()
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "录入失败" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string, callsign: string) => {
    if (!confirm(`确认删除 ${callsign} 的这条支持记录？`)) return
    try {
      const res = await fetch(`/api/admin/donations/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "删除失败")
      await load()
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "删除失败" })
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">支持记录</h1>
          <p className="text-sm text-gray-500 mt-1">
            记录台友对台网的赞助（现金 / 物资 / 场地）。档位按「次数」计算，与金额无关；
            个人中心只展示最近一年的金额。
          </p>
        </div>

        {message ? (
          <div
            className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {/* 录入 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">录入一条</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-500 mb-1">呼号</label>
              <input
                value={form.callsign}
                onChange={(e) => setForm({ ...form, callsign: e.target.value.toUpperCase() })}
                placeholder="BI4IVE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金额（可不填）</label>
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="物资留空"
                inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">日期</label>
              <input
                type="date"
                value={form.donatedAt}
                onChange={(e) => setForm({ ...form, donatedAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">方式</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">用途备注</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="电费 / 天线 / 年会场地"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">类型</label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                <option value="person">个人捐助</option>
                <option value="aggregate">汇总/其他收入</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.anonymous}
                onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
              />
              匿名（感谢墙不显示呼号）
            </label>
            <button
              onClick={submit}
              disabled={saving}
              className="ml-auto px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>

        {/* 列表 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">
              记录（{items.length} 条）
            </h2>
            <span className="text-xs text-gray-500">
              金额合计 ¥{amountTotal.toFixed(2)}（仅后台可见）
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">呼号</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">方式</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">金额</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">用途</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">录入人</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      还没有记录
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600 tabular-nums whitespace-nowrap">
                        {it.donatedAt}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {it.callsign}
                        {it.anonymous ? (
                          <span className="ml-1.5 text-[10px] text-gray-400">匿名</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{it.channel || "-"}</td>
                      <td className="px-3 py-2 text-gray-900 tabular-nums">
                        {it.amount === null ? "—" : `¥${it.amount}`}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">
                        {it.note || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            it.kind === "aggregate"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {it.kind === "aggregate" ? "汇总" : "个人"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{it.createdBy || "-"}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => remove(it.id, it.callsign)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
