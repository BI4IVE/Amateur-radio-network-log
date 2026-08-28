"use client";

// @version v1.5.18
// 街机大屏：复古街机风（A9 参考），霓虹粉/青/黄 + CRT 扫描线 + 像素风

import {
  LiveRecord,
  SessionInfo,
  ScreenConfig,
  parseSignal,
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
}

export default function ArcadeScreen({
  session,
  records,
  activeCallers,
  latestParticipant,
  error,
  localTime,
  screenConfig,
}: Props) {
  const { strength } = parseSignal(latestParticipant?.signal);
  const segs = Math.max(1, Math.round(strength * 10));

  // 今日日期+时间
  const now = new Date();
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${localTime || "--:--:--"}`;

  return (
    <div className="ac-root">
      <div className="ac-scan"></div>
      <div className="ac-scan2"></div>
      <div className="ac-crt"></div>

      <main className="ac-hud">
        <header className="ac-title">
          <h1>{screenConfig.title}</h1>
          <div className="ac-sub">台网大屏 · 每日大屏 · ARCADE MODE</div>
          <div className="ac-freqs">
            <span className="ac-fq">接收 <b>{screenConfig.rxFreq}MHz</b></span>
            <span className="ac-fq">发射 <b>{screenConfig.txFreq}MHz</b></span>
            <span className="ac-fq">亚音 <b>{screenConfig.tone}</b></span>
          </div>
        </header>

        <section className="ac-game">
          {/* 左：主屏幕 */}
          <div className="ac-screen">
            <div className="ac-screen-head">
              <span>当前主控 · {session?.controllerName || "--"}</span>
              <span>{localTime || "--:--:--"}</span>
            </div>
            <div className="ac-pixel-cs">{latestParticipant?.callsign || "--"}</div>
            <div className="ac-pixel-sub">当前参与者 · PLAYER 1</div>
            <div className="ac-pixel-badge">{readabilityLabel(latestParticipant?.signal)}</div>

            <div className="ac-info-pixels">
              <div className="ac-px"><span>QTH</span><b>{latestParticipant?.qth || "--"}</b></div>
              <div className="ac-px"><span>使用设备</span><b>{latestParticipant?.equipment || "--"}</b></div>
              <div className="ac-px"><span>天馈</span><b>{latestParticipant?.antenna || "--"}</b></div>
              <div className="ac-px"><span>功率</span><b>{latestParticipant?.power || "--"}</b></div>
            </div>

            <div className="ac-scan-block">
              <div className="ac-scan-title">SCAN <b>当前参与者信号强度</b></div>
              <div className="ac-hp">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="ac-hp-seg"
                    style={{ opacity: i < segs ? 1 : 0.12 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 右：侧屏 */}
          <div className="ac-side">
            <div className="ac-side-screen">
              <div className="ac-side-head">
                <span>台网总人数</span><span>STATIONS</span>
              </div>
              <div className="ac-count-big">{activeCallers.length}</div>
              <div className="ac-count-note">ON AIR</div>
              <div className="ac-mini-row">
                <div className="ac-mini"><b>{records.length}</b><span>RECORDS</span></div>
                <div className="ac-mini"><b>{activeCallers.length}</b><span>ACTIVE</span></div>
                <div className="ac-mini"><b>{records[0]?.callsign || "--"}</b><span>LATEST</span></div>
              </div>
              <div className="ac-roster">
                <div className="ac-rhead"><span>RECENT CHECK-INS</span><span>LIVE</span></div>
                <div className="ac-rlist">
                  {records.length === 0 ? (
                    <div style={{ color: "var(--dim)", fontSize: 12 }}>等待主控录入记录…</div>
                  ) : (
                    records.map((r, i) => (
                      <div className="ac-rx" key={r.id || i}>
                        <span className="ac-rx-cs">{r.callsign}</span>
                        <span className="ac-rx-sg">{r.signal || ""}</span>
                        <span className="ac-rx-q">{r.qth || ""}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="ac-footer">
          <b className="ac-foot-date">{todayStr}</b>
          {error && <span className="ac-error">{error}</span>}
        </footer>
      </main>
    </div>
  );
}
