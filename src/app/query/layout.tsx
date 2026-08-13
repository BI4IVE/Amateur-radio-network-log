// @version v1.5.9
// [v1.5.9] 强制 /query 段动态渲染，避免 Next.js 给静态预渲染页加 s-maxage=31536000 强缓存，
// 导致后台修改证书配置后用户浏览器长期显示旧版证书逻辑。
export const dynamic = "force-dynamic"
export default function QueryLayout({ children }: { children: React.ReactNode }) {
  return children
}
