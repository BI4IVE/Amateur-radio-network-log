// @version v1.5.29
/**
 * 权限点定义（前后端共用）
 *
 * 设计要点：
 * 1. 角色只是「默认权限模板」，真正生效的是 users.permissions 里的权限点集合。
 * 2. 超管可以给任意账号单独增删权限点，不受角色模板限制。
 * 3. 权限点按模块分组，后台用勾选矩阵展示，避免 60 个接口散成 60 个开关。
 */

export type Role = "user" | "admin" | "superadmin"

export type PermissionKey =
  | "console.session"
  | "console.record.create"
  | "console.record.update"
  | "console.record.delete"
  | "ops.stats"
  | "ops.analytics"
  | "ops.rotation"
  | "ops.schedule"
  | "logs.view"
  | "logs.export"
  | "logs.edit"
  | "recycle.view"
  | "recycle.restore"
  | "loginlog.view"
  | "member.view"
  | "member.detail"
  | "member.edit.profile"
  | "member.edit.license"
  | "member.import"
  | "binding.view"
  | "binding.review"
  | "bindcode.manage"
  | "memberauth.manage"
  | "pushlog.view"
  | "push.config"
  | "equipment.manage"
  | "pageconfig.manage"
  | "upgrade.manage"
  | "user.manage"
  | "audit.view"

export type PermissionMeta = {
  key: PermissionKey
  label: string
  /** 说明，给管理员配置时看 */
  hint?: string
}

export type PermissionGroup = {
  id: string
  label: string
  items: PermissionMeta[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "console",
    label: "主控台",
    items: [
      { key: "console.session", label: "开台 / 关台" },
      { key: "console.record.create", label: "新增记录" },
      { key: "console.record.update", label: "修改记录" },
      { key: "console.record.delete", label: "删除记录" },
    ],
  },
  {
    id: "ops",
    label: "运营中心",
    items: [
      { key: "ops.stats", label: "台网统计" },
      { key: "ops.analytics", label: "数据看板" },
      { key: "ops.rotation", label: "主控轮值" },
      { key: "ops.schedule", label: "台网预告管理" },
    ],
  },
  {
    id: "logs",
    label: "台网历史",
    items: [
      { key: "logs.view", label: "查看历史" },
      { key: "logs.export", label: "导出" },
      { key: "logs.edit", label: "编辑 / 软删历史" },
      { key: "recycle.view", label: "回收站查看" },
      { key: "recycle.restore", label: "恢复数据" },
      { key: "loginlog.view", label: "登录日志" },
    ],
  },
  {
    id: "member",
    label: "会员中心",
    items: [
      { key: "member.view", label: "会员列表" },
      { key: "member.detail", label: "会员详情" },
      { key: "member.edit.profile", label: "修改档案" },
      { key: "member.edit.license", label: "修改执照 / 编号" },
      { key: "member.import", label: "导入 / 导出会员" },
      { key: "binding.view", label: "查看微信绑定" },
      { key: "binding.review", label: "绑定审核" },
      { key: "bindcode.manage", label: "绑定码管理" },
      { key: "memberauth.manage", label: "会员对照表" },
      { key: "pushlog.view", label: "推送日志" },
    ],
  },
  {
    id: "system",
    label: "系统管理",
    items: [
      { key: "push.config", label: "微信配置与测试推送" },
      { key: "equipment.manage", label: "设备库" },
      { key: "pageconfig.manage", label: "页面配置" },
      { key: "upgrade.manage", label: "版本更新" },
      { key: "user.manage", label: "用户与权限管理", hint: "仅超管" },
      { key: "audit.view", label: "审计日志" },
    ],
  },
]

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key)
)

/** 主控：只做录入与查看运营数据，不能删记录、不能进管理功能 */
export const CONTROLLER_PERMISSIONS: PermissionKey[] = [
  "console.session",
  "console.record.create",
  "console.record.update",
  "ops.stats",
  "ops.analytics",
  "ops.rotation",
  "ops.schedule",
]

/** 管理员：除用户管理/页面配置/版本更新/审计外的全部 */
export const ADMIN_PERMISSIONS: PermissionKey[] = [
  ...CONTROLLER_PERMISSIONS,
  "console.record.delete",
  "logs.view",
  "logs.export",
  "logs.edit",
  "recycle.view",
  "recycle.restore",
  "loginlog.view",
  "member.view",
  "member.detail",
  "member.edit.profile",
  "member.edit.license",
  "member.import",
  "binding.view",
  "binding.review",
  "bindcode.manage",
  "memberauth.manage",
  "pushlog.view",
  "push.config",
  "equipment.manage",
]

export const ROLE_DEFAULTS: Record<Role, PermissionKey[]> = {
  user: CONTROLLER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  superadmin: ALL_PERMISSIONS,
}

export const ROLE_LABELS: Record<Role, string> = {
  user: "主控",
  admin: "管理员",
  superadmin: "超级管理员",
}

export function isRole(value: unknown): value is Role {
  return value === "user" || value === "admin" || value === "superadmin"
}

/** 角色等级：用于「至少需要某角色」的粗粒度判断（用户管理这类硬边界） */
export const ROLE_RANK: Record<Role, number> = {
  user: 1,
  admin: 2,
  superadmin: 3,
}

export function roleRank(role: string | null | undefined): number {
  return isRole(role) ? ROLE_RANK[role] : 0
}

/**
 * 是否为「管理员及以上」。
 * 前端原有大量 `role === "admin"` 判断，引入超管后必须统一走这里，
 * 否则超管会被当成普通主控，删不了记录、看不到管理按钮。
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return roleRank(role) >= 2
}

/** 解析数据库里存的 JSON 权限数组，非法值一律丢弃 */
export function parsePermissions(raw: unknown): PermissionKey[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is PermissionKey =>
      typeof v === "string" && (ALL_PERMISSIONS as string[]).includes(v)
    )
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parsePermissions(JSON.parse(raw))
    } catch {
      return []
    }
  }
  return []
}

/**
 * 计算某账号的最终权限：
 * - 从未配置过（null / 空串）→ 用角色默认模板
 * - 已配置（哪怕是空数组 []）→ 以库为准，空数组表示「明确没有任何权限」
 */
export function effectivePermissions(
  role: string,
  stored: unknown
): PermissionKey[] {
  const normalizedRole: Role = isRole(role) ? role : "user"
  const hasStored =
    stored !== null &&
    stored !== undefined &&
    !(typeof stored === "string" && stored.trim() === "")

  if (!hasStored) return [...ROLE_DEFAULTS[normalizedRole]]

  return Array.from(new Set(parsePermissions(stored)))
}
