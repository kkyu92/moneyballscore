import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /debug: BASIC auth 내부 대시보드 (색인 가치 0)
        // /api: JSON 엔드포인트 (색인 가치 0)
        // /search: 쿼리 조합 무한 (robots meta 로도 noindex 이미 처리)
        // /lotto/archive: 본인 사용 50조합 기록 (noindex + AdSense gambling-adjacent 차단)
        disallow: ["/debug", "/api", "/search", "/lotto/archive"],
      },
      {
        // Googlebot — /lotto/archive defense-in-depth (검색 색인 차단 명시)
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto/archive"],
      },
      {
        // AdSense 콘텐츠 크롤러 — 광고 매칭 정확도 + gambling-adjacent 차단
        userAgent: "Mediapartners-Google",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto/archive"],
      },
      {
        // Google Ads 랜딩페이지 검증 봇 — gambling-adjacent 차단
        userAgent: "AdsBot-Google",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto/archive"],
      },
    ],
    sitemap: "https://moneyballscore.vercel.app/sitemap.xml",
  };
}
