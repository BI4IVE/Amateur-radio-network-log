// @version v2.0.5
/**
 * [v2.0.4] 跑马灯文案渲染
 *
 * 文案来自后台「大屏配置 → 跑马灯文案」，支持两种写法：
 * - 占位符：{host} 当前主控呼号 / {rx} 接收频率 / {tx} 发送频率 / {tone} 发送亚音
 * - 粗体：**个人中心**
 *
 * 占位符永远替换成实时值（例如主控换成 BI4JVV 就显示 BI4JVV），
 * 所以后台改的是"句式"，主控等信息仍然跟当前场次走。
 */

const PLACEHOLDER = /\{([a-z]+)\}/gi;
const BOLD = /\*\*([^*]+)\*\*/;

function tokens(template: string): string[] {
  // 同时按 {xxx} 和 **xxx** 切分，保留分隔符
  return template.split(/(\{[a-z]+\}|\*\*[^*]+\*\*)/gi).filter((t) => t !== "");
}

export default function MarqueeContent({
  template,
  values,
}: {
  template: string;
  values: Record<string, string>;
}) {
  return (
    <>
      {tokens(template).map((token, i) => {
        const ph = new RegExp(`^${PLACEHOLDER.source}$`, "i").exec(token);
        if (ph) {
          const value = values[ph[1].toLowerCase()];
          return value ? <b key={i}>{value}</b> : <span key={i}>{token}</span>;
        }
        const bold = BOLD.exec(token);
        if (bold && token.startsWith("**")) {
          return <b key={i}>{bold[1]}</b>;
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}
