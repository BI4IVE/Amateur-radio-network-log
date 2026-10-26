"use client";

// @version v2.0.3
/**
 * 播控台画布
 *
 * 单位 --u = 画布短边 1%：
 * - 横屏（1920×1080）：固定画布 + transform 缩放，保证推流时任何窗口都不错版；
 * - 竖屏（fill 模式）：画布直接铺满视口，内部按 1fr 分配剩余高度，
 *   这样在手机/竖屏显示器上正好一屏，不会出现"又窄又长"的黑边条。
 */

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  width: number;
  height: number;
  /** 布局变体：st-land / st-port */
  variant: string;
  /**
   * 适配方式：
   * - contain（默认）：固定画布完整显示，比例不符留黑边（横屏用）；
   * - fill：画布铺满视口，尺寸随屏幕变化，正好一屏（竖屏用）；
   * - cover：固定画布铺满，超出裁掉（视口为竖屏时生效）。
   */
  fit?: "contain" | "cover" | "fill";
  children: ReactNode;
}

export default function StudioStage({
  width,
  height,
  variant,
  fit = "contain",
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isFill = fit === "fill";

  useLayoutEffect(() => {
    const layout = () => {
      const el = ref.current;
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (isFill) {
        // 铺满：宽高等于视口，单位随短边缩放，不缩放
        el.style.width = `${vw}px`;
        el.style.height = `${vh}px`;
        el.style.setProperty("--u", `${Math.min(vw, vh) / 100}px`);
        el.style.setProperty("--s", "1");
        return;
      }

      const portraitViewport = vh > vw;
      const useCover = fit === "cover" && portraitViewport;
      const scale = useCover
        ? Math.max(vw / width, vh / height)
        : Math.min(vw / width, vh / height);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.setProperty("--u", `${Math.min(width, height) / 100}px`);
      el.style.setProperty("--s", scale.toFixed(4));
    };

    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("orientationchange", layout);
    return () => {
      window.removeEventListener("resize", layout);
      window.removeEventListener("orientationchange", layout);
    };
  }, [width, height, fit, isFill]);

  const style = (isFill
    ? { width: "100%", height: "100%", "--u": "10.8px", "--s": "1" }
    : {
        width: `${width}px`,
        height: `${height}px`,
        "--u": `${Math.min(width, height) / 100}px`,
      }) as CSSProperties;

  return (
    <div className={`st-viewport ${isFill ? "st-viewport--fill" : ""}`}>
      <div ref={ref} className={`st-root st-stage ${variant}`} data-theme="day" style={style}>
        {children}
      </div>
    </div>
  );
}
