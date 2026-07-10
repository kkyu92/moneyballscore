import type { MetadataRoute } from "next";
import { SITE_URL } from '@moneyball/shared';

// robots.txt 정책:
//   - Googlebot + 일반 search engine: /lotto + /lotto/archive 색인 허용
//   - AdSense crawler (Mediapartners-Google + AdsBot-Google): /lotto + /lotto/archive
//     **전 sub-tree** Disallow (gambling-adjacent 차단, AdSense 심사 정책).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /debug: BASIC auth 내부 대시보드 (색인 가치 0)
        // /api: JSON 엔드포인트 (색인 가치 0)
        // /search: 쿼리 조합 무한 (robots meta 로도 noindex 이미 처리)
        // /login /settings /community: placeholder (색인 가치 0)
        disallow: ["/debug", "/api", "/search", "/login", "/settings", "/community"],
      },
      {
        // Googlebot — 일반 색인 허용 (Alt 3 변형: /lotto + /lotto/archive 색인 활성)
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/login", "/settings", "/community"],
      },
      {
        // AdSense 콘텐츠 크롤러 — 광고 매칭 + gambling-adjacent 차단
        // /lotto, /lotto/archive 양쪽 sub-tree 차단 (defense-in-depth).
        userAgent: "Mediapartners-Google",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto", "/lotto/archive", "/login", "/settings", "/community"],
      },
      {
        // Google Ads 랜딩페이지 검증 봇 — gambling-adjacent 차단
        // /lotto, /lotto/archive 양쪽 sub-tree 차단 (defense-in-depth).
        userAgent: "AdsBot-Google",
        allow: "/",
        disallow: ["/debug", "/api", "/search", "/lotto", "/lotto/archive", "/login", "/settings", "/community"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
