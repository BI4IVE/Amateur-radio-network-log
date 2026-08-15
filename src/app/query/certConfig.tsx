// @version v1.5.10
// [v1.5.10] 证书配置 context（client 组件，由服务端 layout 透传数据库直读的值）
"use client"
import { createContext, useContext, type ReactNode } from "react"

export interface CertConfigValue {
  certSignUnit: string
  certSignOrg: string
}

export const CertConfigContext = createContext<CertConfigValue>({
  certSignUnit: "济南黄河业余无线电台网活动",
  certSignOrg: "济南黄河业余无线电中继台",
})

export function CertConfigProvider({
  value,
  children,
}: {
  value: CertConfigValue
  children: ReactNode
}) {
  return <CertConfigContext.Provider value={value}>{children}</CertConfigContext.Provider>
}

export function useCertConfig() {
  return useContext(CertConfigContext)
}
