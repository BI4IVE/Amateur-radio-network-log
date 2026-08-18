import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // [v1.5.11] 禁用页面缓存：覆盖 Next 默认给页面加的 Cache-Control: s-maxage=31536000
  // 该头导致部署新代码后浏览器/CDN 仍展示旧页面（"缓存作怪"根因）。
  // next.config 的 headers 在响应发送前最后应用，优先级高于页面自身设置，可彻底覆盖 s-maxage。
  // /_next/static 等框架内部资源由 Next 自行管理（不受此配置影响），仍按 content-hash 长期缓存。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
