import type { MetadataRoute } from "next";

// plan #6 Step A — Alt 3 변형 (cycle 882~).
//   - Googlebot + 일반 search engine: /lotto + /lotto/archive 색인 허용
//     (검색 색인 활성 = 사용자 명시 의도 정합)
//   - AdSense crawler (Mediapartners-Google + AdsBot-Google): /lotto + /lotto/archive
//     **전 sub-tree** Disallow 명시 (gambling-adjacent 차단, KBO AdSense 심사 5개월
//     sunk cost 보호 — autoplan CEO + Design subagent 합의 user_challenge_1).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /debug: BASIC auth 내부 대시보드 (색인 가치 0)
        // /api: JSON 엔드포인트 (색인 가치 0)
        // /search: 쿼리 조합 무한 (robots meta 로도 noindex 이미 처리)
        disallow: ["/debug", "/api", "/search"],
      },
      {
        // Googlebot — 일반 색인 허용 (Alt 3 변형: /lotto + /lotto/archive 색인 활성)
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/debug", "/api", "/search"],
      },
      {
        // AdSense 콘텐츠 크롤러 — 광고 매칭 + gambling-adjacent 차단
        // /lotto, /lotto/archive 양쪽 sub-tree 차단 (defense-in-depth).
        userAgent: "Mediapartners-Google",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto", "/lotto/archive"],
      },
      {
        // Google Ads 랜딩페이지 검증 봇 — gambling-adjacent 차단
        // /lotto, /lotto/archive 양쪽 sub-tree 차단 (defense-in-depth).
        userAgent: "AdsBot-Google",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto", "/lotto/archive"],
      },
    ],
    sitemap: "https://moneyballscore.vercel.app/sitemap.xml",
  };
}
