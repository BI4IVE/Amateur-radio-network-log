"use client"

// 输入法（IME）组合态保护 —— 统一解决「中文输入法打出来却是英文」的问题。
//
// 背景：
//   呼号 / QTH / 设备 等字段在 onChange 里做 `.toUpperCase()` 回写。
//   中文输入法输入时，浏览器先以「组合态」呈现拼音，此时若程序改写 input 的值，
//   浏览器会判定「应用干预了本次输入」并中断组词，把已经变成大写的拼音字母直接提交 ——
//   表现为「明明中文输入法，打出来的却是英文」。
//   各浏览器/输入法对「程序改写值是否中断组合」的容忍度不同，所以只在部分浏览器上出现。
//
// 解法（不需要事后用正则去猜中英文，浏览器已经给了准确信号）：
//   - 组合中（正在组词，含「中文输入法里直接打英文」）：原样放行，绝不改写输入值
//   - 非组合：统一转大写 —— toUpperCase 对汉字是无操作，因此中文不会被改动
//   即：中文输入法 → 填入中文；英文状态 → 输入英文并全部转大写。
//
// 另外，组合期间的 Enter / 数字 / 方向键属于「输入法选词」，不能被应用抢走。
// 做法：在各输入框的 onKeyDown 开头判断 isImeComposing() / e.nativeEvent.isComposing 后直接 return。
//
// 【踩过的坑，别再犯】不要用「组合期间不发起联想搜索」来达到这个目的：
// 中文上屏的那一次输入事件在很多浏览器里仍然带组合标记（而值已经是中文了），
// 在搜索函数里拦查会连带把「中文上屏后联想历史记录」一起挡掉 —— 表现为输入中文不再联想。
// 只保护按键，不要拦搜索。

import { useEffect } from "react"

// 模块级组合态标记：同一时刻只有焦点元素在组词，全局标记足够且无需 props 透传
let composing = false

export function isImeComposing(): boolean {
  return composing
}

/**
 * 组合态语义下的「转大写」：
 * - 组合中：返回原值（绝不改写，避免打断输入法，中文才能正常上屏）
 * - 非组合：返回大写（英文/数字直接键入时统一转大写）
 */
export function imeUpper(value: string): string {
  return composing ? value : value.toUpperCase()
}

/**
 * 在页面组件顶层调用一次：安装文档级 composition 监听，维护组合态标记。
 * 用 capture 阶段监听，保证在 React 的委托监听之前拿到事件、及时置位。
 */
export function useImeTracker(): void {
  useEffect(() => {
    const onStart = () => {
      composing = true
    }
    const onEnd = () => {
      composing = false
    }
    document.addEventListener("compositionstart", onStart, true)
    document.addEventListener("compositionend", onEnd, true)
    return () => {
      document.removeEventListener("compositionstart", onStart, true)
      document.removeEventListener("compositionend", onEnd, true)
      // 卸载时复位，避免标记残留影响其他页面
      composing = false
    }
  }, [])
}
