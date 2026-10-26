"use client";

// @version v2.0.4
/**
 * 播控台大屏（竖屏 9:16 · 竖屏直播用）
 *
 * 版式（自上而下）：
 *   顶部状态 → 信息条 → 当前报到者（频谱作背景）→ 字段卡 → 跑马灯 → 参与者滚动播报
 *
 * 底部滚动条只显示「呼号 / 设备 / 天馈 / 信号」四项，其余字段不上屏，
 * 保证竖屏直播画面信息密度合适、单行不折行。
 *
 * 画布固定 1080×1920，等比缩放贴合推流画布，不做窗口自适应。
 * 仅登录可用：由 live/page.tsx 的 LOGIN_ONLY_SCREENS 白名单拦截。
 */

import { useEffect, useRef, useState } from "react";
import { LiveRecord, SessionInfo, ScreenConfig } from "../liveData";
import { fitCallSign, fitFieldText } from "./studioFit";
import StudioStage from "./StudioStage";

interface Props {
  session: SessionInfo | null;
  records: LiveRecord[];
  activeCallers: string[];
  latestParticipant: LiveRecord | null;
  error: string | null;
  localTime: string;
  screenConfig: ScreenConfig;
}

const BAR_COUNT = 40;

export default function StudioPortraitScreen({
  session,
  records,
  latestParticipant,
  localTime,
  screenConfig,
}: Props) {
  const current = latestParticipant ?? records[0] ?? null;
  const total = records.length;
  const host = session?.controllerName || "—";
  const title = session?.title || "今日台网";

  const qthRef = useRef<HTMLSpanElement>(null);
  const callRef = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.3)
  );

  useEffect(() => {
    fitFieldText(qthRef.current, 2.6, 1.8);
    fitCallSign(callRef.current, 20, 11);
  }, [current?.id, current?.qth, current?.callsign]);

  useEffect(() => {
    const onResize = () => {
      fitFieldText(qthRef.current, 2.6, 1.8);
      fitCallSign(callRef.current, 20, 11);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBars((prev) =>
        prev.map((v, i) => {
          const center = 1 - Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
          const target = Math.max(
            0.06,
            Math.min(1, 0.16 + center * 0.5 + (Math.random() - 0.5) * 0.4)
          );
          return v + (target - v) * 0.45;
        })
      );
    }, 160);
    return () => clearInterval(timer);
  }, []);

  const timeText = (localTime || "--:--").slice(0, 5);
  const now = new Date();
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
  const dateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")} ${week}`;

  // 底部滚动播报：只保留四项（呼号 / 设备 / 天馈 / 信号）
  const rows = records.map((r) => ({
    id: r.id,
    callsign: r.callsign,
    equipment: r.equipment || "—",
    antenna: r.antenna || "—",
    signal: r.signal || "—",
  }));
  // 滚动速度按行数换算，保证人多时也不会快到看不清
  const rollDuration = Math.max(14, rows.length * 1.2);

  if (!session) {
    return (
      <StudioStage width={1080} height={1920} variant="st-port">
        <div className="st-empty">今日暂无台网</div>
      </StudioStage>
    );
  }

  return (
    <StudioStage width={1080} height={1920} variant="st-port">
      {/* 顶部 */}
      <div className="st-top">
        <div className="st-live">
          <i />
          <b>ON AIR</b>
        </div>
        <div className="site">
          BR4IN · <em>{title}</em>
        </div>
        <div className="st-spacer" />
        <div className="st-clock">
          <div className="t st-mono">{timeText}</div>
          <div className="d">{dateText}</div>
        </div>
      </div>

      {/* 信息条 */}
      <div className="st-strip">
        <div className="st-st">
          <span className="k">参与</span>
          <span className="v accent st-mono">{total}</span>
        </div>
        <div className="st-st">
          <span className="k">主控</span>
          <span className="v">{host}</span>
        </div>
        <div className="st-st">
          <span className="k">TX / RX</span>
          <span className="v accent st-mono">{screenConfig.txFreq}</span>
        </div>
        <div className="st-st">
          <span className="k">TONE</span>
          <span className="v accent st-mono">{screenConfig.tone}</span>
        </div>
      </div>

      {/* 当前报到者 */}
      <div className="st-hero">
        <div className="st-spectrum">
          {bars.map((h, i) => (
            <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
        </div>
        <div className="st-kicker">
          <span className="ln" />
          <span>NOW CHECKED IN</span>
          <span className="n st-mono">{total > 0 ? `第 ${total} 位` : "等待报到"}</span>
          <span className="ln r" />
        </div>
        <div ref={callRef} className={`st-call ${current ? "" : "empty"}`}>
          {current?.callsign || "—"}
        </div>
      </div>

      {/* 字段卡 */}
      <div className="st-fields">
        <div className="st-field qth">
          <span className="k">QTH</span>
          <span className="v" ref={qthRef} title={current?.qth || ""}>
            {current?.qth || "—"}
          </span>
        </div>
        <div className="st-field">
          <span className="k">设备</span>
          <span className="v">{current?.equipment || "—"}</span>
        </div>
        <div className="st-field">
          <span className="k">天馈</span>
          <span className="v">{current?.antenna || "—"}</span>
        </div>
        <div className="st-field">
          <span className="k">功率</span>
          <span className="v">{current?.power || "—"}</span>
        </div>
        <div className="st-field">
          <span className="k">信号</span>
          <span className="v sig st-mono">{current?.signal || "—"}</span>
        </div>
      </div>

      {/* 跑马灯 */}
      <div className="st-marquee">
        <div className="inner">
          本场台网由 <b>{host}</b> 主控 · 频率 <b>{screenConfig.txFreq}</b> 收发{" "}
          <b>{screenConfig.rxFreq}</b> 亚音 <b>{screenConfig.tone}</b> · 请按顺序报呼号、QTH、设备、
          天馈、功率与信号报告 · 历史记录与规则详见 <b>个人中心</b> ·
        </div>
      </div>

      {/* 底部：参与者滚动播报（呼号 / 设备 / 天馈 / 信号） */}
      <div className="st-roll">
        {rows.length === 0 ? (
          <div className="st-roll-empty">暂无参与记录</div>
        ) : (
          <div
            className="st-roll-inner"
            style={{ animationDuration: `${rollDuration}s` }}
          >
            {[...rows, ...rows].map((r, i) => (
              <div className="st-roll-row" key={`${r.id}-${i}`}>
                <span className="cs">{r.callsign}</span>
                <span className="eq">{r.equipment}</span>
                <span className="ant">{r.antenna}</span>
                <span className="sg st-mono">{r.signal}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudioStage>
  );
}
