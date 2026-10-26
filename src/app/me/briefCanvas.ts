// @version v2.0.4
/**
 * [v2.0.4] 台网简报长图（canvas 绘制，1080 宽）
 *
 * 为什么自己画而不是截图：项目没有 html2canvas 依赖，证书也是 canvas 画的，
 * 这里沿用同一套做法，导出 PNG 与页面预览完全一致。
 *
 * 布局（自上而下）：渐变头 → 人数大卡 → 信号分布 → 本期参与设备 → 本期亮点 → 页脚
 * 标签有上限：新面孔 8、回归 6、设备 6；超出显示「等 N 位」。
 */

import type { SessionBrief } from "@/lib/me/brief"

const W = 1080
const PAD = 72
const CONTENT_W = W - PAD * 2

const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'

const C = {
  ink: "#111318",
  sub: "#6b7080",
  light: "#9aa0b2",
  line: "#eef0f5",
  indigo: "#4f46e5",
  indigoDeep: "#312e81",
  amber: "#b45309",
  amberSoft: "#fff7ed",
  amberLine: "#fde9c8",
  blueSoft: "#eef2ff",
  blueLine: "#dde2ff",
  blueInk: "#4338ca",
  graySoft: "#f4f5f9",
  grayLine: "#e9ebf2",
}

type Chip = { text: string; sub?: string; size: number; kind: "new" | "back" | "eq" }

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function chipFont(size: number) {
  return `900 ${size}px ${FONT}`
}

function chipWidth(ctx: CanvasRenderingContext2D, chip: Chip) {
  ctx.font = chipFont(chip.size)
  const w = ctx.measureText(chip.text).width + chip.size * 1.1
  if (!chip.sub) return w
  ctx.font = `700 ${Math.round(chip.size * 0.55)}px ${FONT}`
  return w + ctx.measureText(chip.sub).width + chip.size * 0.5
}

function chipHeight(chip: Chip) {
  return Math.round(chip.size * 1.55)
}

function layoutChips(ctx: CanvasRenderingContext2D, chips: Chip[], maxW: number) {
  const gapX = 18
  const gapY = 16
  const lines: { chips: Chip[]; width: number; height: number }[] = []
  let cur: Chip[] = []
  let curW = 0
  let curH = 0

  for (const chip of chips) {
    const w = chipWidth(ctx, chip)
    const h = chipHeight(chip)
    if (cur.length > 0 && curW + gapX + w > maxW) {
      lines.push({ chips: cur, width: curW, height: curH })
      cur = []
      curW = 0
      curH = 0
    }
    curW += (cur.length > 0 ? gapX : 0) + w
    curH = Math.max(curH, h)
    cur.push(chip)
  }
  if (cur.length > 0) lines.push({ chips: cur, width: curW, height: curH })

  const height = lines.reduce((sum, l) => sum + l.height, 0) + Math.max(0, lines.length - 1) * gapY
  return { lines, height, gapX, gapY }
}

function drawChips(
  ctx: CanvasRenderingContext2D,
  chips: Chip[],
  x: number,
  y: number,
  maxW: number
) {
  const { lines, gapX, gapY } = layoutChips(ctx, chips, maxW)
  let cursorY = y

  for (const line of lines) {
    let cursorX = x + Math.max(0, (maxW - line.width) / 2)
    for (const chip of line.chips) {
      const w = chipWidth(ctx, chip)
      const h = chipHeight(chip)
      const cy = cursorY + (line.height - h) / 2

      ctx.beginPath()
      const bg =
        chip.kind === "back" ? C.amberSoft : chip.kind === "new" ? C.blueSoft : C.graySoft
      const border =
        chip.kind === "back" ? C.amberLine : chip.kind === "new" ? C.blueLine : C.grayLine
      roundRect(ctx, cursorX, cy, w, h, h / 2)
      ctx.fillStyle = bg
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = border
      ctx.stroke()

      const color =
        chip.kind === "back" ? C.amber : chip.kind === "new" ? C.blueInk : "#2a2f3d"
      ctx.fillStyle = color
      ctx.textBaseline = "middle"
      ctx.font = chipFont(chip.size)
      const textX = cursorX + chip.size * 0.55
      ctx.fillText(chip.text, textX, cy + h / 2 + 1)

      if (chip.sub) {
        ctx.font = `700 ${Math.round(chip.size * 0.55)}px ${FONT}`
        ctx.fillStyle = chip.kind === "back" ? "#c07a2a" : C.light
        const subX = textX + chipWidth(ctx, { ...chip, sub: undefined }) - chip.size * 0.55 + chip.size * 0.3
        ctx.fillText(chip.sub, subX, cy + h / 2 + 2)
      }

      cursorX += w + gapX
    }
    cursorY += line.height + gapY
  }

  return y + layoutChips(ctx, chips, maxW).height
}

export function renderBrief(data: SessionBrief, opts: { showNames: boolean }): HTMLCanvasElement {
  const measure = document.createElement("canvas").getContext("2d")
  if (!measure) throw new Error("canvas 不可用")

  const date = new Date(data.sessionTime)
  const beijing = (d: Date) =>
    new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "long",
      day: "numeric",
    }).format(d)
  const week = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(date)
  const timeText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)

  // ---------- 标签素材 ----------
  const nameChips: Chip[] = data.newFaces.names.map((cs, i) => ({
    text: cs,
    size: i < 2 ? 32 : 25,
    kind: "new" as const,
  }))
  const backChips: Chip[] =
    opts.showNames && data.returning.items.length > 0
      ? data.returning.items.map((r, i) => ({
          text: r.callsign,
          sub: `${r.days}天`,
          size: i === 0 ? 42 : i === 1 ? 32 : 25,
          kind: "back" as const,
        }))
      : []

  const eqChips: Chip[] = data.equipments.map((e, i) => ({
    text: e.name,
    sub: String(e.count),
    size: i === 0 ? 42 : i < 3 ? 32 : 25,
    kind: "eq" as const,
  }))

  const highlightChips = [...backChips, ...nameChips]

  // ---------- 预排版（算高度） ----------
  const signalRows = data.signals.slice(0, 6)
  const signalBlockH = signalRows.length * 74

  const nameLayout = layoutChips(measure, highlightChips, CONTENT_W - 72)
  const eqLayout = layoutChips(measure, eqChips, CONTENT_W - 72)

  const headerH = 420
  const cardH = 190
  const sectionTitleH = 78

  let bodyH = 0
  bodyH += sectionTitleH + signalBlockH + 40
  bodyH += sectionTitleH + (data.equipments.length > 0 ? eqLayout.height + 68 : 90) + 40
  bodyH += sectionTitleH + (highlightChips.length > 0 ? nameLayout.height + 68 : 90) + 40

  const footerH = 190
  const totalH = headerH + cardH + 40 + bodyH + footerH

  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = totalH
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas 不可用")

  // ---------- 背景 ----------
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, totalH)

  // ---------- 头部渐变 ----------
  const grad = ctx.createLinearGradient(0, 0, W, headerH)
  grad.addColorStop(0, "#4f46e5")
  grad.addColorStop(0.55, "#3730a3")
  grad.addColorStop(1, "#312e81")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, headerH)

  ctx.globalAlpha = 0.07
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(W - 60, -60, 230, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-40, headerH + 40, 190, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "rgba(255,255,255,0.75)"
  ctx.font = `600 22px ${FONT}`
  ctx.fillText("B R 4 I N   台 网 简 报", PAD, 96)

  ctx.fillStyle = "#ffffff"
  ctx.font = `900 64px ${FONT}`
  ctx.fillText(`${beijing(date)} · ${week}`, PAD, 190)

  ctx.fillStyle = "rgba(255,255,255,0.82)"
  ctx.font = `400 24px ${FONT}`
  const subtitle = data.title || "每日台网"
  ctx.fillText(
    `${subtitle} · 济南黄河业余无线电中继台 · 434.110 / 439.110 · 亚音 88.5`,
    PAD,
    244
  )

  // ---------- 人数卡 ----------
  const cardY = headerH - 96
  ctx.save()
  ctx.shadowColor = "rgba(30,27,75,0.18)"
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 12
  ctx.fillStyle = "#ffffff"
  roundRect(ctx, PAD, cardY, CONTENT_W, cardH, 28)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = C.indigoDeep
  ctx.font = `900 132px ${FONT}`
  ctx.textBaseline = "alphabetic"
  ctx.fillText(String(data.people), PAD + 48, cardY + 132)

  const numW = ctx.measureText(String(data.people)).width
  ctx.fillStyle = C.light
  ctx.font = `800 28px ${FONT}`
  ctx.fillText("人", PAD + 48 + numW + 12, cardY + 132)

  const metaX = PAD + 48 + numW + 90
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(metaX - 44, cardY + 42)
  ctx.lineTo(metaX - 44, cardY + cardH - 42)
  ctx.stroke()

  ctx.fillStyle = C.sub
  ctx.font = `400 24px ${FONT}`
  ctx.fillText("主控", metaX, cardY + 74)
  ctx.fillStyle = C.ink
  ctx.font = `900 38px ${FONT}`
  ctx.fillText(data.controller || "—", metaX + 90, cardY + 76)

  ctx.fillStyle = C.sub
  ctx.font = `400 24px ${FONT}`
  ctx.fillText(`开台 ${timeText} · 记录 ${data.people} 条`, metaX, cardY + 136)

  // ---------- 正文 ----------
  let y = headerH + 40

  const drawSectionTitle = (title: string, en: string) => {
    ctx.fillStyle = C.indigo
    roundRect(ctx, PAD, y + 4, 8, 30, 4)
    ctx.fill()
    ctx.fillStyle = C.ink
    ctx.font = `900 30px ${FONT}`
    ctx.fillText(title, PAD + 24, y + 30)
    ctx.fillStyle = "#b6bac7"
    ctx.font = `400 18px ${FONT}`
    ctx.fillText(en, PAD + 24 + ctx.measureText(title).width + 70, y + 29)
    y += sectionTitleH
  }

  // 信号分布
  drawSectionTitle("信号分布", "SIGNAL")
  const maxSignal = Math.max(1, ...signalRows.map((s) => s.count))
  signalRows.forEach((s, i) => {
    const isTop = i === 0
    ctx.fillStyle = isTop ? C.amber : C.indigoDeep
    ctx.font = `900 26px ${FONT}`
    ctx.fillText(s.label, PAD, y + 30)

    const trackX = PAD + 170
    const trackW = CONTENT_W - 170 - 230
    ctx.fillStyle = "#f2f3f8"
    roundRect(ctx, trackX, y + 8, trackW, 30, 15)
    ctx.fill()

    const barW = Math.max(16, (s.count / maxSignal) * trackW)
    const barGrad = ctx.createLinearGradient(trackX, 0, trackX + barW, 0)
    if (isTop) {
      barGrad.addColorStop(0, "#fbbf24")
      barGrad.addColorStop(1, "#d97706")
    } else {
      barGrad.addColorStop(0, "#818cf8")
      barGrad.addColorStop(1, "#4f46e5")
    }
    ctx.fillStyle = barGrad
    roundRect(ctx, trackX, y + 8, barW, 30, 15)
    ctx.fill()

    const pct = data.people > 0 ? Math.round((s.count / data.people) * 100) : 0
    ctx.fillStyle = C.ink
    ctx.font = `900 28px ${FONT}`
    const countText = `${s.count}`
    const countW = ctx.measureText(countText).width
    ctx.fillText(countText, trackX + trackW + 26, y + 32)
    ctx.fillStyle = C.sub
    ctx.font = `400 22px ${FONT}`
    ctx.fillText(`位 · ${pct}%`, trackX + trackW + 26 + countW + 6, y + 31)

    y += 74
  })
  y += 40

  // 本期参与设备
  drawSectionTitle("本期参与设备", "EQUIPMENT")
  if (eqChips.length > 0) {
    drawChips(ctx, eqChips, PAD + 36, y, CONTENT_W - 72)
    y += eqLayout.height + 68
  } else {
    ctx.fillStyle = C.light
    ctx.font = `400 24px ${FONT}`
    ctx.fillText("本期未记录设备", PAD, y + 30)
    y += 90
  }
  y += 40

  // 本期亮点
  drawSectionTitle("本期亮点", "HIGHLIGHT")
  if (highlightChips.length > 0) {
    // 图例
    const legendY = y + 6
    ctx.beginPath()
    ctx.arc(PAD + 8, legendY, 6, 0, Math.PI * 2)
    ctx.fillStyle = "#818cf8"
    ctx.fill()
    ctx.fillStyle = C.sub
    ctx.font = `400 20px ${FONT}`
    ctx.fillText(`新面孔 ${data.newFaces.total} 位`, PAD + 24, legendY + 7)

    const legend2X = PAD + 24 + ctx.measureText(`新面孔 ${data.newFaces.total} 位`).width + 40
    ctx.beginPath()
    ctx.arc(legend2X, legendY, 6, 0, Math.PI * 2)
    ctx.fillStyle = "#fbbf24"
    ctx.fill()
    ctx.fillStyle = C.sub
    ctx.fillText(`老友回归 ${data.returning.total} 位`, legend2X + 16, legendY + 7)

    y += 44
    drawChips(ctx, highlightChips, PAD + 36, y, CONTENT_W - 72)
    y += nameLayout.height + 24

    // 「等 N 位」提示
    const restNames = data.newFaces.total - data.newFaces.names.length
    const restBack = opts.showNames ? data.returning.total - data.returning.items.length : 0
    const restParts: string[] = []
    if (restNames > 0) restParts.push(`新面孔还有 ${restNames} 位`)
    if (restBack > 0) restParts.push(`回归还有 ${restBack} 位`)
    if (restParts.length > 0) {
      ctx.fillStyle = C.light
      ctx.font = `400 20px ${FONT}`
      ctx.fillText(`${restParts.join(" · ")}（未展示）`, PAD + 36, y + 22)
      y += 40
    }
  } else {
    ctx.fillStyle = C.light
    ctx.font = `400 24px ${FONT}`
    ctx.fillText("本期没有新面孔与回归", PAD, y + 30)
    y += 90
  }

  // ---------- 页脚 ----------
  const footY = totalH - footerH + 40
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(PAD, footY)
  ctx.lineTo(W - PAD, footY)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = C.ink
  ctx.font = `900 24px ${FONT}`
  ctx.fillText("济南黄河业余无线电台网", PAD, footY + 52)

  ctx.fillStyle = C.light
  ctx.font = `400 19px ${FONT}`
  ctx.fillText(
    `log.br4in.cn · 本期由 ${data.controller || "—"} 主控 · ${beijing(date)}`,
    PAD,
    footY + 90
  )

  return canvas
}
