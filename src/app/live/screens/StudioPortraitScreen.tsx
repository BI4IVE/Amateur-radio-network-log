"use client";

// @version v2.0.3
/**
 * 播控台大屏（竖屏 9:16）
 *
 * 与横屏同一套视觉语言，但重排为上下叠层：
 *   顶部状态 → 信息条 → 当前报到者（频谱作背景）→ 字段卡 → 跑马灯 → 评论区
 *
 * 评论区为「系统播报」：谁签到就播一条，不接收外部输入（避免公网刷屏）。
 * 仅登录可用：由 live/page.tsx 的 LOGIN_ONLY_SCREENS 白名单拦截。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { LiveRecord, SessionInfo, ScreenConfig } from "../liveData";
import { fitFieldText } from "./studioFit";

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
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.3)
  );

  useEffect(() => {
    fitFieldText(qthRef.current, 2.2, 1.5);
  }, [current?.id, current?.qth]);

  useEffect(() => {
    const onResize = () => fitFieldText(qthRef.current, 2.2, 1.5);
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

  // 评论流：主控开场一条 + 最近 4 位签到播报（按时间正序，最新的在底部）
  const comments = useMemo(() => {
    const list: { key: string; by: string; text: string; host?: boolean }[] = [
      { key: "host-intro", by: host, text: `开始台网 · ${total} 人已签到`, host: true },
    ];
    records
      .slice(0, 4)
      .reverse()
      .forEach((r) => {
        list.push({
          key: r.id,
          by: r.callsign,
          text: `${r.qth ? `${r.qth} · ` : ""}信号 ${r.signal || "—"}`,
        });
      });
    return list.slice(-5);
  }, [records, host, total]);

  const timeText = (localTime || "--:--").slice(0, 5);
  const now = new Date();
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
  const dateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")} ${week}`;

  if (!session) {
    return (
      <div className="st-root st-port" data-theme="day">
        <div className="st-empty">今日暂无台网</div>
      </div>
    );
  }

  return (
    <div className="st-root st-port" data-theme="day">
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
        <div className={`st-call ${current ? "" : "empty"}`}>{current?.callsign || "—"}</div>
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

      {/* 评论区（系统播报） */}
      <div className="st-comments">
        {comments.map((c) => (
          <div className={`st-cm ${c.host ? "host" : ""}`} key={c.key}>
            <span className="av">{[...c.by][0] || "·"}</span>
            <span className="body">
              <b>{c.by}</b>
              {c.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
