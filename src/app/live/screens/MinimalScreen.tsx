"use client";

// @version v1.5.16
// 极简大屏：黑白高对比极简风（A8 参考）

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
}

export default function MinimalScreen({
  session,
  records,
  activeCallers,
  latestParticipant,
  error,
  localTime,
  screenConfig,
}: Props) {
  const { strength } = parseSignal(latestParticipant?.signal);
  const color = signalColor(strength);

  // 今日日期
  const now = new Date();
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  return (
    <div className="mn-root">
      <main className="mn-hud">
        {/* 顶栏 */}
        <header className="mn-top">
          <div className="mn-brand">
            <span className="mn-title">{screenConfig.title}</span>
            <span className="mn-sub">济南黄河业余无线电中继台 · 每日大屏</span>
          </div>
          <div className="mn-meta">
            <span>RX {screenConfig.rxFreq}</span>
            <span>TX {screenConfig.txFreq}</span>
            <span>CT {screenConfig.tone}</span>
            <span className="mn-clock">{localTime || "--:--:--"}</span>
          </div>
        </header>

        <section className="mn-grid">
          {/* 左：当前参与者 + 信号 */}
          <div className="mn-panel mn-main">
            <div className="mn-panel-label">当前主控：{session?.controllerName || "--"}</div>
            <div className="mn-callsign">{latestParticipant?.callsign || "--"}</div>
            <div className="mn-callsign-sub">当前参与者 · 最新录入</div>

            <div className="mn-info">
              <div className="mn-cell">
                <span>QTH</span>
                <b>{latestParticipant?.qth || "--"}</b>
              </div>
              <div className="mn-cell">
                <span>使用设备</span>
                <b>{latestParticipant?.equipment || "--"}</b>
              </div>
              <div className="mn-cell">
                <span>天馈</span>
                <b>{latestParticipant?.antenna || "--"}</b>
              </div>
              <div className="mn-cell">
                <span>功率</span>
                <b>{latestParticipant?.power || "--"}</b>
              </div>
            </div>

            {/* 信号强度（极简横向条） */}
            <div className="mn-signal">
              <div className="mn-signal-row">
                <span>信号强度</span>
                <b>{readabilityLabel(latestParticipant?.signal)}</b>
              </div>
              <div className="mn-bar">
                <div
                  className="mn-bar-fill"
                  style={{ width: `${strength * 100}%`, background: color }}
                />
              </div>
            </div>
          </div>

          {/* 右：人数 + 记录 */}
          <div className="mn-side">
            <div className="mn-panel mn-count">
              <div className="mn-panel-label">台网总人数</div>
              <div className="mn-count-big">{activeCallers.length}</div>
              <div className="mn-count-sub">STATIONS 在线呼号</div>
              <div className="mn-minis">
                <div className="mn-mini"><b>{records.length}</b><span>记录</span></div>
                <div className="mn-mini"><b>{activeCallers.length}</b><span>在线</span></div>
                <div className="mn-mini"><b>{records[0]?.callsign || "--"}</b><span>最新</span></div>
              </div>
            </div>

            <div className="mn-panel mn-roster">
              <div className="mn-panel-label">最近记录</div>
              <div className="mn-list">
                {records.length === 0 ? (
                  <div className="mn-empty">等待主控录入记录…</div>
                ) : (
                  records.map((r, i) => (
                    <div className="mn-row" key={r.id || i}>
                      <span className="mn-row-cs">{r.callsign}</span>
                      <span className="mn-row-num">#{records.length - i}</span>
                      <span className="mn-row-geo">{r.qth || r.signal || ""}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="mn-foot">
          <span className="mn-foot-date">{todayStr}</span>
          {error && <span className="mn-error">{error}</span>}
        </footer>
      </main>
    </div>
  );
}
