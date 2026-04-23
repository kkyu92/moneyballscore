import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /debug: BASIC auth 내부 대시보드 (색인 가치 0)
      // /api: JSON 엔드포인트 (색인 가치 0)
      // /search: 쿼리 조합 무한 (robots meta 로도 noindex 이미 처리)
      disallow: ["/debug", "/api", "/search"],
    },
    sitemap: "https://moneyballscore.vercel.app/sitemap.xml",
  };
}
