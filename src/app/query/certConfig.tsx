// @version v1.5.9
// [v1.5.9] 服务端直读证书配置，经 React context 传给客户端组件，避免依赖客户端 fetch 缓存
import { createContext, useContext } from "react"

export interface CertConfigValue {
  certSignUnit: string
  certSignOrg: string
}

export const CertConfigContext = createContext<CertConfigValue>({
  certSignUnit: "济南黄河业余无线电台网活动",
  certSignOrg: "济南黄河业余无线电中继台",
})

export function useCertConfig() {
  return useContext(CertConfigContext)
}
