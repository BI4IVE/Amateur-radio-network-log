"use client";

// @version v1.5.20
// 实况大屏 /live —— 多模板容器
// 支持 默认大屏 / 默认大屏M（竖屏）/ 极简大屏 / 街机大屏 / 手机版 五种模板，右上角下拉切换（URL ?screen= 记忆）

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./live.css";
import { useLiveData, useActiveCallers, useScreenConfig } from "./liveData";
import DefaultScreen from "./screens/DefaultScreen";
import MinimalScreen from "./screens/MinimalScreen";
import ArcadeScreen from "./screens/ArcadeScreen";
import PortraitScreen from "./screens/PortraitScreen";

export type ScreenType = "default" | "defaultM" | "minimal" | "arcade" | "portrait";

// 右上角下拉：仅电脑版模板
const SCREEN_OPTIONS: { value: ScreenType; label: string }[] = [
  { value: "default", label: "默认大屏" },
  { value: "defaultM", label: "默认大屏M" },
  { value: "minimal", label: "极简大屏" },
  { value: "arcade", label: "街机大屏" },
];

// 底部切换：手机版专属（竖屏入口互切 + 回到电脑版）
const PORTRAIT_OPTIONS: { value: ScreenType; label: string }[] = [
  { value: "defaultM", label: "默认大屏M" },
  { value: "portrait", label: "手机版" },
  { value: "default", label: "电脑版" },
];

export default function LivePage() {
  const router = useRouter();
  const { session, records, error } = useLiveData();
  const screenConfig = useScreenConfig();

  // 登录态（用于私有大屏遮罩判断 + 脱敏判定，与后台一致：localStorage 存 user）
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    const check = () => setLoggedIn(!!localStorage.getItem("user"));
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  // 公开版对 QTH 脱敏：仅保留前 4 个字，超出的不显示（防止地理位置被细化泄露）
  // 登录态优先：已登录用户始终看完整 QTH；仅「匿名 + 开放」组合才脱敏
  const maskQthOn = screenConfig.public === true && !loggedIn;
  const maskQth = (q?: string | null): string | null | undefined => {
    if (!q) return q;
    return [...q].slice(0, 4).join("");
  };
  const displaySession = session
    ? { ...session, controllerQth: maskQthOn ? maskQth(session.controllerQth) : session.controllerQth }
    : null;
  const displayRecords = maskQthOn
    ? records.map((r) => ({ ...r, qth: maskQth(r.qth) }))
    : records;
  const activeCallers = useActiveCallers(displayRecords);
  const latestParticipant = displayRecords[0] || null;

  const [screen, setScreen] = useState<ScreenType>("default");
  const [localTime, setLocalTime] = useState("");

  // 大屏设为私有且未登录时，显示「需登录」遮罩（不跳转）
  const needLogin = screenConfig.public === false && !loggedIn;

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
      {needLogin ? (
        <div className="live-locked-overlay">
          <div className="live-locked-card">
            <div className="live-locked-mark">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
                <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h2 className="live-locked-title">大屏未到公开时间</h2>
            <p className="live-locked-desc">
              当前大屏仅为内部使用。<br />
              开放时间可以关注公众号。
            </p>
            <button className="live-locked-btn" onClick={() => router.push("/login")}>
              登录查看
            </button>
            <a className="live-locked-foot" href="/">返回站点首页</a>
          </div>
        </div>
      ) : (
      <>
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
      {(screen === "defaultM" || screen === "portrait") && (
        <PortraitScreen
          {...commonProps}
          currentScreen={screen}
          onChangeScreen={changeScreen}
        />
      )}
      {screen === "minimal" && <MinimalScreen {...commonProps} />}
      {screen === "arcade" && <ArcadeScreen {...commonProps} />}
      </>
      )}
    </div>
  );
}
