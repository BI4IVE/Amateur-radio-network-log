"use client";

// @version v1.5.13
// 实况大屏 /live —— 明亮美观的现代化设计
// - 最新记录在最上面（按 sequence 降序）
// - SSE 实时推送（record_added/record_updated/record_deleted）
// - 明亮大气的浅色渐变风格

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 类型定义
interface LiveRecord {
  id: string;
  sequence: number;
  callsign: string;
  name?: string | null;
  qth?: string | null;
  band?: string | null;
  mode?: string | null;
  operator?: string | null;
  qsl?: string | null;
  notes?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}

interface SessionInfo {
  id: string;
  controllerName?: string | null;
  title?: string | null;
  sessionTime?: string | null;
}

// 主控时间格式化（北京时间）
function formatBeijing(iso?: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateBeijing(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function LivePage() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [records, setRecords] = useState<LiveRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const sequenceMapRef = useRef<Map<number, boolean>>(new Map());
  const recordIdsRef = useRef<Set<string>>(new Set());

  // 加载当前活跃会话并加载记录
  const loadData = useCallback(async (sessionId?: string) => {
    try {
      // 若无 sessionId，先从 /api/sessions 获取当前活跃会话
      let sid = sessionId;
      if (!sid) {
        const sesRes = await fetch("/api/sessions", { cache: "no-store" });
        if (sesRes.ok) {
          const sesData = await sesRes.json();
          const list = sesData.sessions || [];
          if (list.length > 0) {
            const active = list[0];
            setSession({
              id: active.id,
              controllerName: active.controllerName,
              title: active.title,
              sessionTime: active.sessionTime,
            });
            sid = active.id;
          } else {
            setError("当前没有进行中的台网会话");
            setLoading(false);
            return;
          }
        }
      }

      if (!sid) {
        setError("无法确定当前会话");
        setLoading(false);
        return;
      }

      // 加载记录
      const recRes = await fetch(`/api/sessions/${sid}/records`, { cache: "no-store" });
      if (recRes.ok) {
        const data = await recRes.json();
        const list = Array.isArray(data.records) ? data.records : [];
        // 最新在最上面：按 sequence 降序，过滤软删
        const active = list.filter((r: LiveRecord) => !r.deletedAt);
        const sorted = [...active].sort((a, b) => b.sequence - a.sequence);
        setRecords(sorted);
        sequenceMapRef.current = new Map(sorted.map((r) => [r.sequence, true]));
        recordIdsRef.current = new Set(sorted.map((r) => r.id));
        setError(null);
      }
      setLoading(false);
      setLastUpdate(new Date());
    } catch {
      setError("连接服务器失败");
      setLoading(false);
    }
  }, []);

  // 实时刷新：由于 /api/sessions 与记录接口需认证、且 SSE 需按 sessionId 建立，
  // 这里采用轻量轮询（每 2 秒）刷新，实现实时性且无需维护长连接，稳定可靠。
  useEffect(() => {
    loadData();

    const timer = setInterval(() => {
      loadData();
    }, 2000);

    setConnected(true);
    setLastUpdate(new Date());

    return () => {
      clearInterval(timer);
    };
  }, [loadData]);

  const totalCount = records.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-sky-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM8.25 10h7.5m-7.5 4h3.75" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">实况台网大屏</h1>
              <p className="text-xs text-slate-500">
                {session?.title || "台网日志实时显示"}
                {session?.controllerName ? ` · 主控：${session.controllerName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 连接状态 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-slate-200">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-xs font-medium text-slate-600">
                {connected ? "实时刷新中" : "连接中"}
              </span>
            </div>
            {lastUpdate && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                {formatBeijing(lastUpdate.toISOString())} 更新
              </span>
            )}
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition-all shadow-md font-medium"
            >
              返回首页
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-6xl mx-auto px-5 py-8">
        {error && (
          <div className="mb-6 px-5 py-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadData()} className="underline hover:text-amber-900">
              重试
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-4 border-sky-300 border-t-sky-600 rounded-full animate-spin mb-3" />
            <p>正在加载实况数据…</p>
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg shadow-sky-100 border border-sky-100 p-5">
                <p className="text-xs text-slate-500 mb-1">累计记录</p>
                <p className="text-3xl font-bold text-sky-600">{totalCount}</p>
              </div>
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg shadow-sky-100 border border-sky-100 p-5">
                <p className="text-xs text-slate-500 mb-1">最新呼号</p>
                <p className="text-3xl font-bold text-indigo-600 truncate">
                  {records.length > 0 ? records[0].callsign : "--"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg shadow-sky-100 border border-sky-100 p-5">
                <p className="text-xs text-slate-500 mb-1">最高序号</p>
                <p className="text-3xl font-bold text-violet-600">
                  {records.length > 0 ? records[0].sequence : "--"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg shadow-sky-100 border border-sky-100 p-5">
                <p className="text-xs text-slate-500 mb-1">台网日期</p>
                <p className="text-3xl font-bold text-blue-600">
                  {session?.sessionTime ? formatDateBeijing(session.sessionTime) : "--"}
                </p>
              </div>
            </div>

            {/* 记录列表 */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl shadow-sky-100 border border-sky-100 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white flex items-center justify-between">
                <h2 className="font-bold text-lg">最新台网记录</h2>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full">最新在上</span>
              </div>

              <div className="max-h-[65vh] overflow-y-auto">
                {records.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    <p>暂无记录，等待主控录入第一条记录…</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {records.map((rec, idx) => (
                      <li
                        key={rec.id || rec.sequence}
                        className={`px-5 py-4 flex items-center gap-4 transition-colors hover:bg-sky-50/60 ${
                          idx === 0 ? "bg-sky-50/40" : ""
                        }`}
                      >
                        {/* 序号徽章 */}
                        <span className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold text-white bg-gradient-to-br from-sky-400 to-blue-500 shadow-sm">
                          {rec.sequence}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-slate-800 tracking-wide">
                              {rec.callsign}
                            </span>
                            {rec.name && (
                              <span className="text-sm text-slate-500">{rec.name}</span>
                            )}
                            {idx === 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-500 rounded-full">
                                最新
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            {rec.qth && (
                              <span className="inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                {rec.qth}
                              </span>
                            )}
                            {rec.band && (
                              <span className="inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788" />
                                </svg>
                                {rec.band}
                              </span>
                            )}
                            {rec.mode && (
                              <span className="inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                                {rec.mode}
                              </span>
                            )}
                            {rec.operator && (
                              <span className="inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                                {rec.operator}
                              </span>
                            )}
                            {rec.qsl && (
                              <span className="inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                {rec.qsl}
                              </span>
                            )}
                          </div>
                          {rec.notes && (
                            <p className="mt-1 text-xs text-slate-400">{rec.notes}</p>
                          )}
                        </div>

                        <span className="shrink-0 text-xs text-slate-400 font-mono">
                          {formatBeijing(rec.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              页面每 2 秒自动刷新最新记录 · 数据由主控实时录入
            </p>
          </>
        )}
      </main>
    </div>
  );
}
