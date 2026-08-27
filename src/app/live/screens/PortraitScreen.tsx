"use client";

// @version v1.5.17
// 默认大屏 M 版（竖屏 / 手机）：在默认大屏基础上重排为单栏竖屏，适合手机观看

import { useEffect, useRef } from "react";
import type { ScreenType } from "../page";
import {
  LiveRecord,
  SessionInfo,
  ScreenConfig,
  parseSignal,
  signalColor,
  readabilityLabel,
} from "../liveData";

interface Props {
  session: SessionInfo | null;
  records: LiveRecord[];
  activeCallers: string[];
  latestParticipant: LiveRecord | null;
  error: string | null;
  localTime: string;
  screenConfig: ScreenConfig;
  onChangeScreen: (s: ScreenType) => void;
  currentScreen: string;
}

const PORTRAIT_SWITCH: { value: ScreenType; label: string }[] = [
  { value: "defaultM", label: "默认大屏M" },
  { value: "portrait", label: "手机版" },
  { value: "default", label: "电脑版" },
];

export default function PortraitScreen({
  session,
  records,
  activeCallers,
  latestParticipant,
  error,
  localTime,
  screenConfig,
  onChangeScreen,
  currentScreen,
}: Props) {
  const starCvRef = useRef<HTMLCanvasElement>(null);
  const spCvRef = useRef<HTMLCanvasElement>(null);
  const signalRingRef = useRef<HTMLCanvasElement>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  // 星空粒子
  useEffect(() => {
    const cv = starCvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let stars: { x: number; y: number; r: number; a: number; tw: number }[] = [];
    const resize = () => {
      const root = cv.parentElement;
      cv.width = root ? root.clientWidth : window.innerWidth;
      cv.height = root ? root.clientHeight : window.innerHeight;
      stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.6 + 0.15,
        tw: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const s of stars) {
        const alpha = s.a * (0.6 + 0.4 * Math.sin(t / 900 + s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(214, 240, 228, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // 频谱
  useEffect(() => {
    const cv = spCvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const N = 72;
    let bars = Array.from({ length: N }, () => Math.random());
    let raf = 0;
    const draw = () => {
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== w) { cv.width = w; cv.height = h; }
      ctx.clearRect(0, 0, w, h);
      const bw = w / N;
      for (let i = 0; i < N; i++) {
        const target =
          Math.abs(Math.sin(i * 0.18 + performance.now() / 900)) * 0.7 +
          Math.random() * 0.4;
        bars[i] += (Math.min(1, target) - bars[i]) * 0.16;
        const bh = Math.max(3, bars[i] * (h - 6));
        const grad = ctx.createLinearGradient(0, h, 0, h - bh);
        grad.addColorStop(0, "rgba(125,232,184,0.95)");
        grad.addColorStop(1, "rgba(255,193,78,0.55)");
        ctx.fillStyle = grad;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 信号质量环
  useEffect(() => {
    const cv = signalRingRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { strength, r, s, t, isCW } = parseSignal(latestParticipant?.signal);
    const color = signalColor(strength);
    let raf = 0;
    const size = cv.width || 220;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 12;
    let fill = 0;
    const draw = (t2: number) => {
      ctx.clearRect(0, 0, size, size);
      fill += (strength - fill) * 0.06;
      const startAngle = -Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(125, 232, 184, 0.12)";
      ctx.lineWidth = 14;
      ctx.stroke();
      const endAngle = startAngle + fill * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const ticks = 20;
      for (let i = 0; i < ticks; i++) {
        const ang = startAngle + (i / ticks) * Math.PI * 2;
        const lit = i / ticks <= fill;
        const tickRadius = radius + 14;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(ang) * tickRadius,
          cy + Math.sin(ang) * tickRadius,
          lit ? 3 : 1.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = lit ? color : "rgba(125, 232, 184, 0.18)";
        ctx.fill();
      }
      const scanAngle = startAngle + ((t2 / 2600) % 1) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, scanAngle - 0.18, scanAngle + 0.18);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [latestParticipant?.signal]);

  return (
    <div className="live-root live-portrait">
      <canvas id="stars" ref={starCvRef}></canvas>
      <div className="scanlines"></div>
      <div className="vignette" />

      <main className="hud portrait-hud">
        {/* 顶栏 */}
        <header className="topbar portrait-topbar">
          <div className="brand">
            <div className="brand-mark">◈</div>
            <div>
              <h1>{screenConfig.title}</h1>
            </div>
          </div>
          <div className="topmeta portrait-topmeta">
            <div className="meta-item">
              <span className="meta-label">接收频率</span>
              <span className="meta-value">{screenConfig.rxFreq}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">发射频率</span>
              <span className="meta-value amber">{screenConfig.txFreq}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">发射亚音</span>
              <span className="meta-value">{screenConfig.tone}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">LOCAL</span>
              <span className="meta-value">{localTime || "--:--:--"}</span>
            </div>
          </div>
        </header>

        {/* 当前主控 */}
        <section className="panel control">
          <div className="panel-head">
            <span className="panel-title">当前主控：{session?.controllerName || "----"}</span>
            <span className="panel-tag">ON AIR</span>
          </div>
          <div className="callsign-wrap">
            <div className="callsign">{latestParticipant?.callsign || "----"}</div>
            <div className="callsign-sub">当前参与者 · 最新录入</div>
          </div>
          <div className="radar-wrap">
            <div className="signal-ring-wrap">
              <canvas className="signal-ring" ref={signalRingRef} width="220" height="220" />
              <div className="signal-ring-center">
                <div className="signal-ring-num">{latestParticipant?.signal || "--"}</div>
                <div className="signal-ring-r-s">
                  {latestParticipant?.signal
                    ? (() => {
                        const p = parseSignal(latestParticipant.signal);
                        if (p.isCW && p.t > 0) return `R${p.r} · S${p.s} · T${p.t}`;
                        if (p.r > 0) return `R${p.r} · S${p.s}`;
                        return latestParticipant.signal;
                      })()
                    : "--"}
                </div>
              </div>
            </div>
            <div className="radar-note">
              <div className="radar-note-title">▲ 当前参与者信号质量</div>
              <div className="radar-quality-bar">
                <span className="quality-label">信号强度</span>
                <span className="quality-value">
                  {readabilityLabel(latestParticipant?.signal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 当前参与者信息 */}
        <section className="panel">
          <div className="panel-head">
            <span className="panel-title">当前参与者信息</span>
            <span className="panel-tag">INFO</span>
          </div>
          <div className="info-grid">
            <div className="info-cell">
              <span className="info-label">QTH</span>
              <span className="info-value">{latestParticipant?.qth || "--"}</span>
            </div>
            <div className="info-cell">
              <span className="info-label">使用设备</span>
              <span className="info-value">{latestParticipant?.equipment || "--"}</span>
            </div>
            <div className="info-cell">
              <span className="info-label">天馈</span>
              <span className="info-value">{latestParticipant?.antenna || "--"}</span>
            </div>
            <div className="info-cell">
              <span className="info-label">功率</span>
              <span className="info-value">{latestParticipant?.power || "--"}</span>
            </div>
          </div>
        </section>

        {/* 台网总人数 */}
        <section className="panel headcount">
          <div className="panel-head">
            <span className="panel-title">NET POPULATION · 台网总人数</span>
            <span className="panel-tag warn">ON AIR</span>
          </div>
          <div className="count-row">
            <div className="count-big">
              <span className="num">{activeCallers.length}</span>
            </div>
            <div className="count-unit">
              STATIONS
              <br />
              在线呼号
            </div>
          </div>
          <div className="count-bar">
            <div
              className="fill"
              style={{ width: `${Math.min(100, (activeCallers.length / 60) * 100)}%` }}
            />
          </div>
          <div className="mini-stats">
            <div className="mini">
              <b>{records.length}</b>
              <span>RECORDS 记录</span>
            </div>
            <div className="mini">
              <b>{activeCallers.length}</b>
              <span>ACTIVE 在线</span>
            </div>
            <div className="mini">
              <b>{records.length ? records[0].callsign : "--"}</b>
              <span>LATEST 最新呼号</span>
            </div>
          </div>
        </section>

        {/* 最近记录 */}
        <section className="panel roster">
          <div className="roster-head">
            <span>RECENT RECORDS · 最近记录</span>
            <span>LIVE</span>
          </div>
          <div className="roster-scroll">
            <div className="roster-list">
              {records.length === 0 ? (
                <div className="roster-empty">等待主控录入记录…</div>
              ) : (
                records.map((r, i) => (
                  <div className="rx-line" key={r.id || i} style={{ animationDelay: `${i * 0.03}s` }}>
                    <span className="cs">{r.callsign}</span>
                    <span className="sig">#{records.length - i}</span>
                    <span className="geo">{r.qth || r.equipment || r.signal || ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 频谱 + 日期 */}
        <section className="panel spectrum">
          <div className="panel-head">
            <span className="panel-title">模拟真实频谱展示</span>
            <span className="panel-tag">LIVE</span>
          </div>
          <canvas id="spectrum" ref={spCvRef}></canvas>
          <div className="ticker">
            <span className="dot"></span>
            <span className="tick-date">{todayStr}</span>
          </div>
        </section>

        {/* 底部切换：手机版专属（默认大屏M / 手机版 / 电脑版） */}
        <div className="portrait-switch">
          <span className="portrait-switch-label">切换样式</span>
          <div className="portrait-switch-tabs">
            {PORTRAIT_SWITCH.map((o) => (
              <button
                key={o.value}
                type="button"
                className={
                  "portrait-switch-tab" +
                  (currentScreen === o.value ? " active" : "")
                }
                onClick={() => onChangeScreen(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="live-actions">
            <span className="live-error">{error}</span>
          </div>
        )}
      </main>
    </div>
  );
}
