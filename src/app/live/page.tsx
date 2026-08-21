"use client";

// @version v1.5.15
// 实况大屏 /live —— 多模板容器
// 支持 默认大屏 / 极简大屏 / 街机大屏 三种模板，右上角下拉切换（URL ?screen= 记忆）

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./live.css";
import { useLiveData, useActiveCallers, useScreenConfig } from "./liveData";
import DefaultScreen from "./screens/DefaultScreen";
import MinimalScreen from "./screens/MinimalScreen";
import ArcadeScreen from "./screens/ArcadeScreen";

export type ScreenType = "default" | "minimal" | "arcade";

const SCREEN_OPTIONS: { value: ScreenType; label: string }[] = [
  { value: "default", label: "默认大屏" },
  { value: "minimal", label: "极简大屏" },
  { value: "arcade", label: "街机大屏" },
];

export default function LivePage() {
  const router = useRouter();
  const { session, records, error } = useLiveData();
  const activeCallers = useActiveCallers(records);
  const latestParticipant = records[0] || null;
  const screenConfig = useScreenConfig();

  const [screen, setScreen] = useState<ScreenType>("default");
  const [localTime, setLocalTime] = useState("");

  // 从 URL 读取模板，默认 default
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("screen") as ScreenType | null;
    if (s && SCREEN_OPTIONS.some((o) => o.value === s)) {
      setScreen(s);
    }
  }, []);

  // 时钟
  useEffect(() => {
    const t = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 切换模板：更新 URL（不刷新页面）
  const changeScreen = useCallback(
    (s: ScreenType) => {
      setScreen(s);
      const params = new URLSearchParams(window.location.search);
      params.set("screen", s);
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", url);
    },
    []
  );

  const commonProps = {
    session,
    records,
    activeCallers,
    latestParticipant,
    error,
    localTime,
    screenConfig,
  };

  return (
    <div className="live-shell">
      {/* 右上角：模板切换下拉 */}
      <div className="live-screen-switch">
        <select
          value={screen}
          onChange={(e) => changeScreen(e.target.value as ScreenType)}
          className="live-screen-select"
          title="切换大屏模板"
        >
          {SCREEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* 左下角：返回首页（悬浮） */}
      <button onClick={() => router.push("/")} className="live-home-fab">
        ← 返回首页
      </button>

      {screen === "default" && <DefaultScreen {...commonProps} />}
      {screen === "minimal" && <MinimalScreen {...commonProps} />}
      {screen === "arcade" && <ArcadeScreen {...commonProps} />}
    </div>
  );
}
