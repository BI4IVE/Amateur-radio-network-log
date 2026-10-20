// @version v2.0.0
// [v1.5.10] 服务端组件：直读数据库证书配置，经 context provider 传给客户端页面，避免客户端 fetch 缓存导致配置不生效
import { PageConfigManager } from "@/storage/database/pageConfigManager"
import { CertConfigProvider } from "./certConfig"

export const dynamic = "force-dynamic"

export default async function QueryLayout({ children }: { children: React.ReactNode }) {
  let certSignUnit = "济南黄河业余无线电台网活动"
  let certSignOrg = "济南黄河业余无线电中继台"
  try {
    const mgr = new PageConfigManager()
    const [u, o] = await Promise.all([
      mgr.getConfigByKey("cert_sign_unit"),
      mgr.getConfigByKey("cert_sign_org"),
    ])
    if (u?.value) certSignUnit = u.value
    if (o?.value) certSignOrg = o.value
  } catch (e) {
    // 读取失败时保留保底值，不影响页面渲染
  }
  return (
    <CertConfigProvider value={{ certSignUnit, certSignOrg }}>
      {/* [字体隔离] 呼号查询页保持原样：display:contents 不生成盒子、不参与布局，
          只把字体栈与数字变体钉回旧值，使全站字体/表格数字调整不影响本页观感。 */}
      <div
        className="legacy-typography"
        style={{
          display: "contents",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontVariantNumeric: "normal",
        }}
      >
        {children}
      </div>
    </CertConfigProvider>
  )
}
