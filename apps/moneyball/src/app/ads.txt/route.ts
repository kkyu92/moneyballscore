/**
 * Dynamic ads.txt for Google AdSense.
 *
 * AdSense 승인 후 ADSENSE_PUBLISHER_ID env var (`pub-xxxxxxxxxxxxxxxx`)를
 * Vercel 환경 변수에 추가하면 자동으로 올바른 ads.txt가 서빙됨.
 * 심사 전에는 placeholder 주석만 반환 — 크롤러에게 파일 존재 신호 제공.
 */

export const revalidate = 3600;

export function GET() {
  const publisherId = process.env.ADSENSE_PUBLISHER_ID?.trim();

  let body: string;
  if (publisherId && /^pub-\d{16}$/.test(publisherId)) {
    body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
  } else {
    body = [
      "# MoneyBall Score ads.txt",
      "# AdSense publisher ID는 심사 승인 후 ADSENSE_PUBLISHER_ID 환경 변수로 주입됩니다.",
      "# 현재 상태: pending (광고 미설정)",
      "",
    ].join("\n");
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
