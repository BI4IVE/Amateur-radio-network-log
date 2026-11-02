"use client"

// @version v2.0.6
/**
 * 后台「支持记录」
 *
 * 会员中心 → 支持记录：录入 / 查询 / 删除台友对台网的赞助（现金、物资、场地）。
 * - 分页 + 搜索（呼号 / 备注 / 方式）+ 类型 & 年份筛选，避免"无限拉长"；
 * - 顶部按类型汇总（个人 / 汇总 / 合计），金额只在这里出现；
 * - 个人中心只看最近一年的金额，档位按次数算。
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "@/components/AdminLayout"

interface DonationItem {
  id: string
  callsign: string
  amount: number | null
  donatedAt: string
  channel: string | null
  note: string | null
  anonymous: boolean
  kind: string
  createdBy: string | null
}

interface Summary {
  person: { count: number; amount: number }
  aggregate: { count: number; amount: number }
  all: { count: number; amount: number }
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
  const [total, setTotal] = useState(0)
  const [amount, setAmount] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  // 查询条件
  const [q, setQ] = useState("")
  const [kind, setKind] = useState("")
  const [year, setYear] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (q.trim()) params.set("q", q.trim())
      if (kind) params.set("kind", kind)
      if (year) params.set("year", year)

      const res = await fetch(`/api/admin/donations?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "读取失败")
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(Number(data.total) || 0)
      setAmount(Number(data.amount) || 0)
      setSummary(data.summary ?? null)
      setYears(Array.isArray(data.years) ? data.years : [])
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "读取失败" })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, q, kind, year])

  useEffect(() => {
    load()
  }, [load])

  // 搜索输入防抖，避免每敲一个字就请求
  const [qInput, setQInput] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [qInput])

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
      setPage(1)
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

  const cards = useMemo(
    () => [
      { label: "个人捐助", count: summary?.person.count ?? 0, amt: summary?.person.amount ?? 0, tone: "text-emerald-600" },
      { label: "汇总/其他", count: summary?.aggregate.count ?? 0, amt: summary?.aggregate.amount ?? 0, tone: "text-gray-500" },
      { label: "合计", count: summary?.all.count ?? 0, amt: summary?.all.amount ?? 0, tone: "text-indigo-600" },
    ],
    [summary]
  )

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">支持记录</h1>
          <p className="text-sm text-gray-500 mt-1">
            记录台友对台网的赞助（现金 / 物资 / 场地）。档位按「次数」计算，与金额无关；个人中心只展示最近一年的金额。
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

        {/* 汇总卡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-xl font-bold tabular-nums mt-1 ${c.tone}`}>
                ¥{c.amt.toFixed(2)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.count} 条</p>
            </div>
          ))}
        </div>

        {/* 录入 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">录入一条</h2>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">呼号</label>
              <input
                value={form.callsign}
                onChange={(e) => setForm({ ...form, callsign: e.target.value.toUpperCase() })}
                placeholder="BI4IVE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金额</label>
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
            <div>
              <label className="block text-xs text-gray-500 mb-1">类型</label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                <option value="person">个人捐助</option>
                <option value="aggregate">汇总/其他</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">用途备注</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="电费 / 天线 / 年会场地"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
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

        {/* 查询条 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mb-3 flex flex-wrap items-center gap-2">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="搜索呼号 / 备注 / 方式"
            className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          />
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          >
            <option value="">全部类型</option>
            <option value="person">个人捐助</option>
            <option value="aggregate">汇总/其他</option>
          </select>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          >
            <option value="">全部年份</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                每页 {n} 条
              </option>
            ))}
          </select>
          {(qInput || kind || year) && (
            <button
              onClick={() => {
                setQInput("")
                setKind("")
                setYear("")
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              清空
            </button>
          )}
        </div>

        {/* 列表 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">
              记录（{total} 条{year ? ` · ${year} 年` : ""}
              {kind ? ` · ${kind === "person" ? "个人捐助" : "汇总/其他"}` : ""}）
            </h2>
            <span className="text-xs text-gray-500">金额合计 ¥{amount.toFixed(2)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">呼号</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">方式</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">金额</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">用途</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                      没有符合条件的记录
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 tabular-nums">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2 text-gray-600 tabular-nums whitespace-nowrap">
                        {it.donatedAt}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <a
                          href={`/admin/participants/${encodeURIComponent(it.callsign)}`}
                          className="text-indigo-600 hover:underline"
                          title="查看会员详情"
                        >
                          {it.callsign}
                        </a>
                        {it.anonymous ? (
                          <span className="ml-1.5 text-[10px] text-gray-400">匿名</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{it.channel || "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-900 tabular-nums font-semibold">
                        {it.amount === null ? "—" : `¥${it.amount}`}
                      </td>
                      <td
                        className="px-3 py-2 text-gray-600 max-w-[240px] truncate"
                        title={it.note || ""}
                      >
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

          {/* 分页 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-xs text-gray-500">
              第 {page} / {totalPages} 页 · 共 {total} 条
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
