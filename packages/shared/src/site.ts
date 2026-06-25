// 사이트 base URL — silent drift family wave 152 (cycle 1381) 단일 source.
// 81 files 133 occurrences hardcoded `https://moneyballscore.vercel.app` → SITE_URL 점진 sweep 시작.
//
// metadataBase, canonical, og.url, JSON-LD url, RSS, sitemap, 외부 알림 (telegram) 공유.
// 도메인 변경 또는 prod URL 전환 시 본 const 1곳만 갱신.
export const SITE_URL = 'https://moneyballscore.vercel.app';

// IndexNow HOST (hostname only, no protocol) — wave 161 (cycle 1394).
// SITE_URL 에서 derive — SITE_URL 갱신 시 자동 동기 (drift 차단).
export const SITE_HOST = new URL(SITE_URL).host;

// KBO 공식 사이트 base URL — silent drift family wave 162 (cycle 1395) 단일 source.
// json-ld ORG_URL / SportsOrganization @id+url / api/health KBO_API_URL+REFERER /
// packages/kbo-data scrapers (KBO_BASE_URL/KBO_SCHEDULE_REFERER) 공유.
// KBO 도메인 변경 시 본 const 1곳만 갱신.
export const KBO_OFFICIAL_URL = 'https://www.koreabaseball.com';

// KBO 일정 페이지 URL — /ws/Main.asmx Referer 봇차단 회피용 (cycle 769 사례 8).
// KBO_OFFICIAL_URL 에서 derive — 자동 동기.
export const KBO_SCHEDULE_URL = `${KBO_OFFICIAL_URL}/Schedule/Schedule.aspx`;
