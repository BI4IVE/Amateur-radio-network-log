// @version v2.0.3
/**
 * 播控台：QTH 等长文本自适应
 *
 * 策略（三级降级）：
 *   1. 先在 maxWidth 内缩字号（vmin 单位，按屏幕短边缩放，横竖屏都成立）；
 *   2. 缩到 minVmin 仍放不下 → 加 .wrap（CSS 里做 2~3 行截断 + 省略号）；
 *   3. 页面尺寸变化后由调用方重新调用一次。
 */
export function fitFieldText(
  node: HTMLElement | null,
  baseVmin: number,
  minVmin: number
): void {
  if (!node) return;
  const box = node.parentElement;
  if (!box) return;

  const vminPx = (v: number) => (v * Math.min(window.innerWidth, window.innerHeight)) / 100;
  const avail = box.clientWidth - vminPx(4.4); // 减去左右 padding

  node.classList.remove("wrap");
  node.style.whiteSpace = "nowrap";

  let size = baseVmin;
  node.style.fontSize = `${size}vmin`;
  let guard = 0;
  while (size > minVmin && node.scrollWidth > avail && guard++ < 30) {
    size -= 0.1;
    node.style.fontSize = `${size.toFixed(2)}vmin`;
  }

  if (node.scrollWidth > avail) {
    node.classList.add("wrap");
    node.style.fontSize = `${minVmin}vmin`;
    node.style.whiteSpace = "";
  }
}
