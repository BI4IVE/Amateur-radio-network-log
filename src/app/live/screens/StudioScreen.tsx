"use client";

// @version v2.0.3
/**
 * 播控台大屏（横屏）
 *
 * 与其它模板的区别：不是卡片堆叠，而是「电台播控台」——巨大呼号 + 实时频谱 +
 * 边缘信息栏 + 跑马灯。最近记录不再逐条罗列（首页给「最近报到」5 条即可）。
 *
 * 仅登录可用：由 live/page.tsx 的 LOGIN_ONLY_SCREENS 白名单拦截，匿名访问会先被遮罩。
 */

import { useEffect, useRef, useState } from "react";
import {
  LiveRecord,
  SessionInfo,
  ScreenConfig,
} from "../liveData";
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

const BAR_COUNT = 46;

export default function StudioScreen({
  session,
  records,
  latestParticipant,
  localTime,
  screenConfig,
}: Props) {
  const current = latestParticipant ?? records[0] ?? null;
  const total = records.length;
  const recent = records.slice(0, 5);
  const qthRef = useRef<HTMLSpanElement>(null);
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.3)
  );

  // QTH 自适应（换人或换屏都重算）
  useEffect(() => {
    fitFieldText(qthRef.current, 2.15, 1.5);
  }, [current?.id, current?.qth]);

  useEffect(() => {
    const onResize = () => fitFieldText(qthRef.current, 2.15, 1.5);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 频谱：轻量随机游走，纯装饰
  useEffect(() => {
    const timer = setInterval(() => {
      setBars((prev) =>
        prev.map((v, i) => {
          const center = 1 - Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
          const target = Math.max(
            0.06,
            Math.min(1, 0.16 + center * 0.46 + (Math.random() - 0.5) * 0.4)
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

  const host = session?.controllerName || "—";
  const title = session?.title || "今日台网";

  if (!session) {
    return (
      <div className="st-root st-land" data-theme="day">
        <div className="st-empty">今日暂无台网</div>
      </div>
    );
  }

  return (
    <div className="st-root st-land" data-theme="day">
      {/* 左侧竖排 */}
      <div className="st-rail">
        <div className="brand">BR4IN</div>
        <div className="tick" />
        <div className="side">台网 · 直播</div>
      </div>

      {/* 顶部 */}
      <div className="st-topbar">
        <div className="st-live">
          <i />
          <b>ON AIR</b>
        </div>
        <div className="st-where">
          济南黄河业余无线电中继台 · <em>{title}</em>
        </div>
        <div className="st-spacer" />
        <div className="st-clock">
          <div className="t st-mono">{timeText}</div>
          <div className="d">{dateText}</div>
        </div>
      </div>

      {/* 中央：当前报到者 */}
      <div className="st-hero">
        <div className="st-kicker">
          <span className="ln" />
          <span>NOW CHECKED IN</span>
          <span className="n st-mono">{total > 0 ? `第 ${total} 位` : "等待报到"}</span>
          <span className="ln r" />
        </div>

        <div className={`st-call ${current ? "" : "empty"}`}>
          {current?.callsign || "—"}
        </div>

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

        <div className="st-spectrum">
          {bars.map((h, i) => (
            <span key={i} style={{ height: `${Math.round(h * 100)}%`, opacity: 0.3 + h * 0.7 }} />
          ))}
        </div>
      </div>

      {/* 右侧信息 */}
      <div className="st-side">
        <div className="st-block">
          <div className="label">参与人数</div>
          <div className="big st-mono">
            {total}
            <small>人</small>
          </div>
        </div>

        <div className="st-block">
          <div className="label">主控 / 频率</div>
          <div className="st-kv">
            <span className="k">主控</span>
            <span className="v">{host}</span>
          </div>
          <div className="st-kv">
            <span className="k">TX</span>
            <span className="v accent st-mono">{screenConfig.txFreq}</span>
          </div>
          <div className="st-kv">
            <span className="k">RX</span>
            <span className="v accent st-mono">{screenConfig.rxFreq}</span>
          </div>
          <div className="st-kv">
            <span className="k">TONE</span>
            <span className="v accent st-mono">{screenConfig.tone}</span>
          </div>
        </div>

        <div className="st-block">
          <div className="label">最近报到</div>
          <div className="st-recent">
            {recent.length === 0 ? (
              <div className="st-rc">
                <span className="cs" style={{ color: "var(--muted)" }}>暂无</span>
              </div>
            ) : (
              recent.map((r, i) => (
                <div className={`st-rc ${i === 0 ? "top" : ""}`} key={r.id}>
                  <span className="idx st-mono">{String(total - i).padStart(2, "0")}</span>
                  <span className="cs">{r.callsign}</span>
                  <span className="sg st-mono">{r.signal || "—"}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 跑马灯 */}
      <div className="st-marquee">
        <div className="inner">
          本场台网由 <b>{host}</b> 主控 · 频率 <b>{screenConfig.txFreq}</b> 收发{" "}
          <b>{screenConfig.rxFreq}</b> 亚音 <b>{screenConfig.tone}</b> · 请按顺序报呼号、QTH、设备、
          天馈、功率与信号报告 · 通联结束后请守听下一轮 · 历史记录与规则详见 <b>个人中心</b> ·
        </div>
      </div>
    </div>
  );
}
