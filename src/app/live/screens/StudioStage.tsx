"use client";

// @version v2.0.3
/**
 * 播控台画布：固定设计尺寸 + 等比缩放
 *
 * 为什么不用 vmin 直接跟视口：直播推流时窗口比例、浏览器缩放、录屏软件画布
 * 都跟设计稿不一致，用视口单位会导致内部重排、错位。这里改成固定画布
 * （横屏 1920×1080 / 竖屏 1080×1920），内部单位 --u = 画布短边 1%，
 * 外层用 transform: scale() 等比贴合屏幕，永不错版。
 */

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  width: number;
  height: number;
  /** 布局变体：st-land / st-port */
  variant: string;
  /**
   * 适配方式：
   * - contain（默认）：完整显示画布，比例不符时留黑边；
   * - cover：铺满屏幕，超出部分裁掉（手机竖屏用，避免缩得太小 + 大黑边）。
   * cover 只在「视口本身是竖屏」时生效，横屏预览仍走 contain。
   */
  fit?: "contain" | "cover";
  children: ReactNode;
}

export default function StudioStage({ width, height, variant, fit = "contain", children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layout = () => {
      const el = ref.current;
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const portraitViewport = vh > vw;
      const useCover = fit === "cover" && portraitViewport;
      const scale = useCover
        ? Math.max(vw / width, vh / height)
        : Math.min(vw / width, vh / height);
      el.style.setProperty("--s", scale.toFixed(4));
    };
    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("orientationchange", layout);
    return () => {
      window.removeEventListener("resize", layout);
      window.removeEventListener("orientationchange", layout);
    };
  }, [width, height, fit]);

  const style = {
    width: `${width}px`,
    height: `${height}px`,
    "--u": `${Math.min(width, height) / 100}px`,
  } as CSSProperties;

  return (
    <div className="st-viewport">
      <div ref={ref} className={`st-root st-stage ${variant}`} data-theme="day" style={style}>
        {children}
      </div>
    </div>
  );
}
