// @version v2.0.5
/**
 * [v2.0.4] 台网简报长图（1080 宽）
 *
 * 同一份绘制代码供两端复用：
 * - 前端：传 document.createElement('canvas') 工厂，预览 / 下载；
 * - 服务端：传 @napi-rs/canvas 的 createCanvas，直接输出 PNG 给微信长按保存。
 *
 * 排版注意：
 * - 所有文字统一走 T() 助手，显式指定字号/字重/颜色，并且每段前后不动 textBaseline，
 *   避免「画完标签云后全局基线变成 middle，导致后面文字整体上移」这类错位；
 * - 服务端没有中文粗体，fauxBold=true 时用描边模拟粗体（偏移极小，肉眼与粗体一致）。
 */

import type { SessionBrief } from "@/lib/me/brief"

const W = 1080
const PAD = 72
const CONTENT_W = W - PAD * 2
const FONT_STACK = '"BR4IN","PingFang SC","Microsoft YaHei",system-ui,sans-serif'

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

type Ctx = CanvasRenderingContext2D
type Factory = (w: number, h: number) => HTMLCanvasElement | unknown

type Opts = { showNames: boolean; fauxBold?: boolean }

type Chip = {
  text: string
  sub?: string
  size: number
  kind: "new" | "back" | "eq"
  /** 呼号与天数上下两排（回归标签用） */
  stack?: boolean
}

/** 统一文字绘制：字号 / 字重 / 颜色 / 是否加粗（服务端描边模拟） */
function T(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  faux = false,
  align: CanvasTextAlign = "start"
) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.fillStyle = color
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = align
  ctx.fillText(str, x, y)
  if (faux && weight >= 700) {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.6, size * 0.028)
    ctx.lineJoin = "round"
    ctx.strokeText(str, x, y)
  }
  ctx.textAlign = "start"
}

function measure(ctx: Ctx, str: string, size: number, weight: number) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  return ctx.measureText(str).width
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function chipWidth(ctx: Ctx, chip: Chip) {
  const main = measure(ctx, chip.text, chip.size, 900)
  const subSize = Math.round(chip.size * 0.55)
  const sub = chip.sub ? measure(ctx, chip.sub, subSize, 700) : 0
  if (chip.stack) {
    // 上下两排：宽度取两排里较宽的一个
    return Math.max(main, sub) + chip.size * 1.2
  }
  return main + sub + chip.size * (chip.sub ? 1.5 : 1.1)
}

function chipHeight(chip: Chip) {
  if (chip.stack) {
    const subSize = Math.round(chip.size * 0.55)
    return Math.round(chip.size * 1.35 + subSize * 1.7)
  }
  return Math.round(chip.size * 1.55)
}

function layoutChips(ctx: Ctx, chips: Chip[], maxW: number) {
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

  const height =
    lines.reduce((sum, l) => sum + l.height, 0) + Math.max(0, lines.length - 1) * gapY
  return { lines, height, gapX, gapY }
}

function drawChips(
  ctx: Ctx,
  chips: Chip[],
  x: number,
  y: number,
  maxW: number,
  faux: boolean
) {
  const { lines, gapX, gapY } = layoutChips(ctx, chips, maxW)
  let cursorY = y

  for (const line of lines) {
    let cursorX = x + Math.max(0, (maxW - line.width) / 2)
    for (const chip of line.chips) {
      const w = chipWidth(ctx, chip)
      const h = chipHeight(chip)
      const cy = cursorY + (line.height - h) / 2

      const bg = chip.kind === "back" ? C.amberSoft : chip.kind === "new" ? C.blueSoft : C.graySoft
      const border =
        chip.kind === "back" ? C.amberLine : chip.kind === "new" ? C.blueLine : C.grayLine
      const color = chip.kind === "back" ? C.amber : chip.kind === "new" ? C.blueInk : "#2a2f3d"

      roundRect(ctx, cursorX, cy, w, h, h / 2)
      ctx.fillStyle = bg
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = border
      ctx.stroke()

      const subColor = chip.kind === "back" ? "#c07a2a" : C.light
      const subSize = Math.round(chip.size * 0.55)

      if (chip.stack) {
        // 上下两排：呼号在上、天数在下，整体居中
        const centerX = cursorX + w / 2
        T(ctx, chip.text, centerX, cy + h * 0.44, chip.size, 900, color, faux, "center")
        if (chip.sub) {
          T(ctx, chip.sub, centerX, cy + h * 0.84, subSize, 700, subColor, faux, "center")
        }
      } else {
        const textX = cursorX + chip.size * 0.55
        const baseline = cy + h / 2 + chip.size * 0.36
        T(ctx, chip.text, textX, baseline, chip.size, 900, color, faux)

        if (chip.sub) {
          const subX = textX + measure(ctx, chip.text, chip.size, 900) + chip.size * 0.3
          T(ctx, chip.sub, subX, baseline - chip.size * 0.02, subSize, 700, subColor, faux)
        }
      }

      cursorX += w + gapX
    }
    cursorY += line.height + gapY
  }

  return y + layoutChips(ctx, chips, maxW).height
}

export function renderBrief(
  data: SessionBrief,
  opts: Opts,
  make: Factory
): HTMLCanvasElement | unknown {
  const faux = !!opts.fauxBold
  const measureCanvas = make(W, 10) as { getContext: (t: "2d") => Ctx | null }
  const mc = measureCanvas.getContext("2d")
  if (!mc) throw new Error("canvas 不可用")

  const date = new Date(data.sessionTime)
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
  }).format(date)
  const weekText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
  }).format(date)
  const timeText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
  const ymText = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
  }).format(date)

  // ---------- 标签素材 ----------
  const nameChips: Chip[] = opts.showNames
    ? data.newFaces.names.map((cs, i) => ({
        text: cs,
        size: i < 2 ? 32 : 25,
        kind: "new" as const,
      }))
    : []
  const backChips: Chip[] = opts.showNames
    ? data.returning.items.map((r, i) => ({
        text: r.callsign,
        sub: `${r.days} 天`,
        size: i === 0 ? 42 : i === 1 ? 32 : 25,
        kind: "back" as const,
        // 呼号与天数分两排，避免挤在一行
        stack: true,
      }))
    : []
  const eqChips: Chip[] = data.equipments.map((e, i) => ({
    text: e.name,
    sub: String(e.count),
    size: i === 0 ? 42 : i < 3 ? 32 : 25,
    kind: "eq" as const,
  }))
  const highlightChips = [...backChips, ...nameChips]

  // ---------- 预排版 ----------
  const signalRows = data.signals.slice(0, 6)
  const signalBlockH = signalRows.length * 74
  const nameLayout = layoutChips(mc, highlightChips, CONTENT_W - 72)
  const eqLayout = layoutChips(mc, eqChips, CONTENT_W - 72)

  const headerH = 400
  const cardH = 176
  const cardY = headerH - 88
  const bodyStart = cardY + cardH + 56
  const sectionTitleH = 78

  let bodyH = 0
  bodyH += sectionTitleH + signalBlockH + 40
  bodyH += sectionTitleH + (eqChips.length > 0 ? eqLayout.height + 68 : 90) + 40
  bodyH += sectionTitleH + (highlightChips.length > 0 ? nameLayout.height + 100 : 90) + 40

  const footerH = 170
  const totalH = bodyStart + bodyH + footerH

  // ---------- 画布 ----------
  const canvas = make(W, totalH) as {
    width: number
    height: number
    getContext: (t: "2d") => Ctx | null
  }
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas 不可用")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, totalH)

  // 头部渐变
  const grad = ctx.createLinearGradient(0, 0, W, headerH)
  grad.addColorStop(0, "#4f46e5")
  grad.addColorStop(0.55, "#3730a3")
  grad.addColorStop(1, "#312e81")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, headerH)

  ctx.globalAlpha = 0.07
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(W - 60, -60, 220, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-40, headerH + 40, 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  T(ctx, "B R 4 I N   台 网 简 报", PAD, 92, 22, 600, "rgba(255,255,255,0.78)", faux)
  T(ctx, `${dateText} · ${weekText}`, PAD, 182, 62, 900, "#ffffff", faux)
  T(
    ctx,
    `${data.title || "每日台网"} · 济南黄河业余无线电中继台`,
    PAD,
    232,
    24,
    400,
    "rgba(255,255,255,0.82)",
    faux
  )
  T(ctx, "434.110 / 439.110 · 亚音 88.5", PAD, 268, 22, 400, "rgba(255,255,255,0.62)", faux)

  // 人数卡
  ctx.save()
  ctx.shadowColor = "rgba(30,27,75,0.16)"
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 10
  ctx.fillStyle = "#ffffff"
  roundRect(ctx, PAD, cardY, CONTENT_W, cardH, 26)
  ctx.fill()
  ctx.restore()

  const bigNum = String(data.people)
  T(ctx, bigNum, PAD + 46, cardY + 118, 116, 900, C.indigoDeep, faux)
  const numW = measure(ctx, bigNum, 116, 900)
  T(ctx, "人", PAD + 46 + numW + 12, cardY + 118, 28, 800, C.light, faux)

  const metaX = PAD + 46 + numW + 96
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(metaX - 44, cardY + 36)
  ctx.lineTo(metaX - 44, cardY + cardH - 36)
  ctx.stroke()

  T(ctx, "主控", metaX, cardY + 62, 22, 400, C.sub, faux)
  T(ctx, data.controller || "—", metaX + 76, cardY + 64, 36, 900, C.ink, faux)
  T(ctx, `台网时间 ${timeText}`, metaX, cardY + 122, 23, 400, C.sub, faux)

  // ---------- 正文 ----------
  let y = bodyStart

  const sectionTitle = (title: string, en: string) => {
    ctx.fillStyle = C.indigo
    roundRect(ctx, PAD, y + 2, 8, 30, 4)
    ctx.fill()
    T(ctx, title, PAD + 24, y + 30, 30, 900, C.ink, faux)
    const tw = measure(ctx, title, 30, 900)
    T(ctx, en, PAD + 24 + tw + 28, y + 29, 18, 400, "#b6bac7", faux)
    y += sectionTitleH
  }

  sectionTitle("信号分布", "SIGNAL")
  const maxSignal = Math.max(1, ...signalRows.map((s) => s.count))
  for (let i = 0; i < signalRows.length; i++) {
    const s = signalRows[i]
    const isTop = i === 0
    T(ctx, s.label, PAD, y + 30, 26, 900, isTop ? C.amber : C.indigoDeep, faux)

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
    const countX = trackX + trackW + 26
    T(ctx, String(s.count), countX, y + 32, 28, 900, C.ink, faux)
    const cw = measure(ctx, String(s.count), 28, 900)
    T(ctx, `位 · ${pct}%`, countX + cw + 8, y + 31, 21, 400, C.sub, faux)
    y += 74
  }
  y += 40

  sectionTitle("本期参与设备", "EQUIPMENT")
  if (eqChips.length > 0) {
    drawChips(ctx, eqChips, PAD + 36, y, CONTENT_W - 72, faux)
    y += eqLayout.height + 68
  } else {
    T(ctx, "本期未记录设备", PAD, y + 30, 24, 400, C.light, faux)
    y += 90
  }
  y += 40

  sectionTitle("本期亮点", "HIGHLIGHT")
  if (highlightChips.length > 0) {
    const legendY = y + 14
    ctx.beginPath()
    ctx.arc(PAD + 8, legendY - 6, 6, 0, Math.PI * 2)
    ctx.fillStyle = "#818cf8"
    ctx.fill()
    T(ctx, `新面孔 ${data.newFaces.total} 位`, PAD + 24, legendY, 20, 400, C.sub, faux)

    const l1 = PAD + 24 + measure(ctx, `新面孔 ${data.newFaces.total} 位`, 20, 400) + 40
    ctx.beginPath()
    ctx.arc(l1, legendY - 6, 6, 0, Math.PI * 2)
    ctx.fillStyle = "#fbbf24"
    ctx.fill()
    T(ctx, `老友回归 ${data.returning.total} 位`, l1 + 16, legendY, 20, 400, C.sub, faux)

    y += 48
    drawChips(ctx, highlightChips, PAD + 36, y, CONTENT_W - 72, faux)
    y += nameLayout.height + 20

    const restNames = opts.showNames ? data.newFaces.total - data.newFaces.names.length : 0
    const restBack = opts.showNames ? data.returning.total - data.returning.items.length : 0
    const rest: string[] = []
    if (restNames > 0) rest.push(`新面孔还有 ${restNames} 位`)
    if (restBack > 0) rest.push(`回归还有 ${restBack} 位`)
    if (rest.length > 0) {
      T(ctx, `${rest.join(" · ")}（未展示）`, PAD + 36, y + 14, 19, 400, C.light, faux)
      y += 34
    }
  } else {
    T(ctx, "本期没有新面孔与回归", PAD, y + 30, 24, 400, C.light, faux)
    y += 90
  }

  // ---------- 页脚 ----------
  const footY = totalH - footerH + 34
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(PAD, footY)
  ctx.lineTo(W - PAD, footY)
  ctx.stroke()
  ctx.setLineDash([])

  // 页脚信息放右下角（不再显示网址）
  T(ctx, "济南黄河业余无线电台网", W - PAD, footY + 46, 23, 900, C.ink, faux, "right")
  T(
    ctx,
    `本期由 ${data.controller || "—"} 主控 · ${ymText}`,
    W - PAD,
    footY + 82,
    19,
    400,
    C.light,
    faux,
    "right"
  )

  return canvas
}

/** 浏览器端工厂 */
export function domCanvasFactory(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return c
}
