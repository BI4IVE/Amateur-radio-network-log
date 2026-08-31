"use client";

// @version v1.5.19
// 实况大屏共享数据 hook 与信号解析工具

import { useCallback, useEffect, useState } from "react";

export interface SessionInfo {
  id: string;
  controllerName?: string | null;
  title?: string | null;
  sessionTime?: string | null;
  controllerEquipment?: string | null;
  controllerAntenna?: string | null;
  controllerQth?: string | null;
}

export interface LiveRecord {
  id: string;
  sessionId?: string | null;
  callsign: string;
  qth?: string | null;
  equipment?: string | null;
  antenna?: string | null;
  power?: string | null;
  signal?: string | null;
  report?: string | null;
  remarks?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}

// 台网频率参数（硬编码兜底，优先使用后台 page_configs 的 screen 分类配置）
export const TX_FREQ = "434.110";
export const RX_FREQ = "439.110";
export const TX_TONE = "88.5";
export const SCREEN_TITLE_DEFAULT = "济南黄河业余无线电中继台BR4IN台网大屏";

// 大屏可配置项（来自后台「页面配置管理 → 大屏配置」）
export interface ScreenConfig {
  title: string;
  rxFreq: string;
  txFreq: string;
  tone: string;
  // 是否对外开放（true=任何人可看，false=仅登录用户可看）
  public: boolean;
}

// 拉取后台大屏配置，失败时使用硬编码兜底，确保大屏始终可渲染
export function useScreenConfig(): ScreenConfig {
  const [config, setConfig] = useState<ScreenConfig>({
    title: SCREEN_TITLE_DEFAULT,
    rxFreq: RX_FREQ,
    txFreq: TX_FREQ,
    tone: TX_TONE,
    public: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/page-configs", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = data.configs || {};
        if (cancelled) return;
        setConfig({
          title: map.screen_title || SCREEN_TITLE_DEFAULT,
          rxFreq: map.screen_rx_freq || RX_FREQ,
          txFreq: map.screen_tx_freq || TX_FREQ,
          tone: map.screen_tone || TX_TONE,
          public: map.screen_public === "true",
        });
      } catch {
        // 网络异常时保持兜底值
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

// 解析信号报告，支持 RS（2位）与 RST（3位，CW）
// R 可读性 1-5，S 信号强度 1-9，T 音质 1-9（仅 CW）
export interface ParsedSignal {
  strength: number;
  r: number;
  s: number;
  t: number;
  isCW: boolean;
}
export function parseSignal(sig?: string | null): ParsedSignal {
  if (!sig) return { strength: 0, r: 0, s: 0, t: 0, isCW: false };
  const digits = sig.replace(/\D/g, "");
  if (digits.length === 3 && /^[1-5][1-9][1-9]$/.test(digits)) {
    const r = Number(digits[0]);
    const s = Number(digits[1]);
    const t = Number(digits[2]);
    const strength = Math.min(1, Math.max(0, ((r - 1) * 9 + (s - 1)) / 36));
    return { strength, r, s, t, isCW: true };
  }
  if (digits.length === 2 && /^[1-5][1-9]$/.test(digits)) {
    const r = Number(digits[0]);
    const s = Number(digits[1]);
    const strength = Math.min(1, Math.max(0, ((r - 1) * 9 + (s - 1)) / 36));
    return { strength, r, s, t: 0, isCW: false };
  }
  return { strength: 0, r: 0, s: 0, t: 0, isCW: false };
}

// 信号强度标签（S 值标准表述）
export function signalStrengthLabel(sig?: string | null): string {
  const { s } = parseSignal(sig);
  if (s === 9) return "信号极强";
  if (s === 8) return "信号很强";
  if (s === 7) return "信号强";
  if (s === 6) return "信号较好";
  if (s === 5) return "信号中等";
  if (s === 4) return "信号较弱";
  if (s === 3) return "信号弱";
  if (s === 2) return "信号很弱";
  if (s === 1) return "信号极弱";
  return "--";
}

// R（可读性）标准表述：只基于 R 值（1-5）
export function readabilityLabel(sig?: string | null): string {
  const { r } = parseSignal(sig);
  if (r === 5) return "信号完全清晰可辨";
  if (r === 4) return "信号清晰";
  if (r === 3) return "信号勉强可辨";
  if (r === 2) return "信号困难可辨";
  if (r === 1) return "信号完全不可辨";
  return "--";
}

// 根据强度返回颜色（红→琥珀→绿）
export function signalColor(strength: number): string {
  if (strength >= 0.75) return "#34d399";
  if (strength >= 0.5) return "#a3e635";
  if (strength >= 0.25) return "#ffc14e";
  return "#ff5d5d";
}

// 数据 hook：加载 session + records，轮询刷新
export function useLiveData() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [records, setRecords] = useState<LiveRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const sesRes = await fetch("/api/sessions", { cache: "no-store" });
      if (sesRes.ok) {
        const sesData = await sesRes.json();
        const list = sesData.sessions || [];
        if (list.length > 0) {
          const s = list[0];
          setSession({
            id: s.id,
            controllerName: s.controllerName,
            title: s.title,
            sessionTime: s.sessionTime,
            controllerEquipment: s.controllerEquipment,
            controllerAntenna: s.controllerAntenna,
            controllerQth: s.controllerQth,
          });
          const recRes = await fetch(`/api/sessions/${s.id}/records`, {
            cache: "no-store",
          });
          if (recRes.ok) {
            const data = await recRes.json();
            const recs = Array.isArray(data.records) ? data.records : [];
            const active = recs.filter((r: LiveRecord) => !r.deletedAt);
            const sorted = [...active].sort((a, b) => {
              const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return tb - ta;
            });
            setRecords(sorted);
          }
        }
      }
      setError(null);
    } catch {
      setError("连接服务器失败");
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, [loadData]);

  return { session, records, error, reload: loadData };
}

// 在网呼号（去重）
export function useActiveCallers(records: LiveRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.callsign)));
}
