// @version v2.0.3
/**
 * 播控台：QTH 等长文本自适应
 *
 * 画布单位：CSS 里的 `--u` = 画布短边 1%（横屏 1920×1080 → 10.8px）。
 * 这里传入的 base/min 都是「u 的倍数」，与 CSS 中的字号保持一致，
 * 这样无论外层如何缩放，测量与显示都不会错位。
 *
 * 策略（三级降级）：
 *   1. 在容器宽度内逐级缩小字号；
 *   2. 缩到下限仍放不下 → 加 .wrap（CSS 做 2~3 行截断 + 省略号）；
 *   3. 窗口/画布尺寸变化后由调用方再次调用。
 */
export function fitFieldText(
  node: HTMLElement | null,
  baseU: number,
  minU: number
): void {
  if (!node) return;
  const box = node.parentElement;
  if (!box) return;

  const uRaw = parseFloat(getComputedStyle(box).getPropertyValue("--u"));
  const u = Number.isFinite(uRaw) && uRaw > 0 ? uRaw : 10.8;
  const avail = box.clientWidth - u * 4.4; // 减去左右内边距

  node.classList.remove("wrap");
  node.style.whiteSpace = "nowrap";

  let size = baseU;
  node.style.fontSize = `${(size * u).toFixed(1)}px`;

  let guard = 0;
  while (size > minU && node.scrollWidth > avail && guard++ < 40) {
    size -= 0.1;
    node.style.fontSize = `${(size * u).toFixed(1)}px`;
  }

  if (node.scrollWidth > avail) {
    node.classList.add("wrap");
    node.style.fontSize = `${(minU * u).toFixed(1)}px`;
    node.style.whiteSpace = "";
  }
}
