// @version v1.5.15
import { NextRequest, NextResponse } from "next/server"
import { pageConfigManager } from "@/storage/database"
import { getAuthUser, requireAdmin } from "@/lib/auth"
import { FALLBACK_VERSION, CODE_VERSION, isNewerVersion } from "@/lib/version"

// GET /api/admin/upgrade/check
// 校验管理员登录后，比对「数据库中的当前版本」与「远程版本清单」，返回是否有新版本。
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const adminError = requireAdmin(user)
    if (adminError.error) {
      return NextResponse.json({ error: adminError.error }, { status: 403 })
    }

    // 1) 当前版本：以数据库 page_configs.version 为准；数据库异常时回退兜底版本
    let currentVersion = FALLBACK_VERSION
    let versionSource: "database" | "fallback" = "fallback"
    try {
      const versionConfig = await pageConfigManager.getConfigByKey("version")
      if (versionConfig?.value) {
        currentVersion = versionConfig.value.trim()
        versionSource = "database"
      }
    } catch (dbError) {
      // 数据库连接异常：保持兜底版本，并在响应中标记
      console.error("Read version from database failed, use fallback:", dbError)
    }

    // 2) 远程版本清单：优先使用环境变量指定的公网地址，否则读取同域静态文件。
    // 推荐：将 public/version/upgrade-manifest.json 提交到 GitHub 仓库，并设置
    // UPGRADE_MANIFEST_URL=https://raw.githubusercontent.com/BI4IVE/Amateur-radio-network-log/main/public/version/upgrade-manifest.json
    // 以后发新版本只需改该文件的 latest / changelog 并提交，程序即可检测到。
    const manifestUrl =
      process.env.UPGRADE_MANIFEST_URL ||
      "/version/upgrade-manifest.json"

    let manifest: any = null
    let manifestError: string | null = null
    try {
      const absoluteUrl = manifestUrl.startsWith("http")
        ? manifestUrl
        : new URL(manifestUrl, request.nextUrl.origin).toString()

      const res = await fetch(absoluteUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      if (!res.ok) {
        manifestError = `远程版本清单请求失败（${res.status}）`
      } else {
        manifest = await res.json()
      }
    } catch (fetchError) {
      manifestError = "无法获取远程版本清单，请检查网络或 UPGRADE_MANIFEST_URL 配置"
      console.error("Fetch upgrade manifest error:", fetchError)
    }

    // 3) 比对版本
    if (!manifest || !manifest.latest) {
      return NextResponse.json({
        ok: true,
        currentVersion,
        versionSource,
        hasUpdate: false,
        checked: true,
        manifestAvailable: false,
        manifestError,
        message: manifestError || "远程暂无版本信息",
      })
    }

    const latestVersion: string = String(manifest.latest)
    let hasUpdate = isNewerVersion(currentVersion, latestVersion)

    // 自动回写数据库版本号：
    // 当「数据库 version 落后于清单 latest」(hasUpdate) 但「本次部署的代码版本 CODE_VERSION 已 >= latest」时，
    // 说明管理员已经把程序代码更新到与远程一致，只是数据库 version 还没同步。
    // 此时自动把数据库 page_configs.version 更新为最新版，避免一直提示有新版本。
    let autoUpdated = false
    if (hasUpdate && !isNewerVersion(CODE_VERSION, latestVersion)) {
      try {
        await pageConfigManager.upsertConfig({
          key: "version",
          value: latestVersion,
          category: "general",
          description: "系统版本号",
        })
        autoUpdated = true
        currentVersion = latestVersion
        versionSource = "database"
        hasUpdate = false
      } catch (e) {
        console.error("自动回写版本号失败", e)
      }
    }

    // 当前版本更新日志：优先匹配 versions 中 version === currentVersion 的条目；
    // 找不到（如当前版本早于清单最旧记录）则回退使用顶层 latest 的 changelog。
    let currentVersionLog: {
      version: string
      releaseDate?: string
      title?: string
      summary?: string
      changelog: string[]
    } | null = null
    const matched = Array.isArray(manifest.versions)
      ? manifest.versions.find((v: any) => String(v.version) === String(currentVersion))
      : null
    if (matched) {
      // 仅当当前版本恰为 latest 时，才展示详细 changelog（manifest.changelog 即 latest 的）；
      // 否则 versions 条目仅有 title/summary，避免把 latest 的详细条目张冠李戴。
      const isLatest = String(matched.version) === String(latestVersion)
      currentVersionLog = {
        version: String(matched.version),
        releaseDate: matched.releaseDate || undefined,
        title: matched.title || undefined,
        summary: matched.summary || undefined,
        changelog: isLatest && Array.isArray(manifest.changelog) ? manifest.changelog : [],
      }
    } else if (Array.isArray(manifest.changelog) && manifest.changelog.length > 0) {
      // 回退：当前版本未在 versions 中，用 latest 的 changelog 展示，但标注为 latest 版本
      currentVersionLog = {
        version: String(latestVersion),
        releaseDate: manifest.releaseDate || undefined,
        title: manifest.title || undefined,
        summary: manifest.summary || undefined,
        changelog: manifest.changelog,
      }
    }

    return NextResponse.json({
      ok: true,
      checked: true,
      manifestAvailable: true,
      currentVersion,
      versionSource,
      latestVersion,
      hasUpdate,
      autoUpdated,
      title: manifest.title || `v${latestVersion}`,
      summary: manifest.summary || "",
      releaseDate: manifest.releaseDate || null,
      changelog: Array.isArray(manifest.changelog) ? manifest.changelog : [],
      currentVersionLog,
      downloadUrl: manifest.downloadUrl || null,
      detailUrl: manifest.detailUrl || null,
      minRequired: manifest.minRequired || null,
      versions: Array.isArray(manifest.versions) ? manifest.versions : [],
      message: autoUpdated
        ? `已自动将数据库版本号同步为 v${latestVersion}`
        : hasUpdate
          ? `发现新版本 v${latestVersion}`
          : "当前已是最新版本",
    })
  } catch (error) {
    console.error("Upgrade check error:", error)
    return NextResponse.json(
      { error: "检测更新失败" },
      { status: 500 }
    )
  }
}
