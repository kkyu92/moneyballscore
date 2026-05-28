/**
 * Smoke test — umpire scraper 첫 실제 fire (cycle 1014 Day 2).
 *
 * 의도: scrapeGameUmpires 가 KBO Score.aspx 안 심판 4인 추출 가능한지 검증.
 * 실패 시: HTML selector 변경 / robots 차단 / HTTP error 중 어느 path 인지 식별.
 *
 * 박제: 본 스크립트 = 일회성 검증. cron 진입 X, 결과는 stdout. 실패해도 production 영향 X.
 */

import { scrapeGameUmpires } from '../packages/kbo-data/src/scrapers/umpire';

const SAMPLES = [
  '20260527SSSK0',
  '20260527KTOB0',
  '20260527LGLT0',
];

async function main() {
  console.log('umpire scraper smoke — KBO Score.aspx 4 umpire fetch test\n');
  let success = 0;
  let fail = 0;

  for (const gameId of SAMPLES) {
    try {
      const t0 = Date.now();
      const umpires = await scrapeGameUmpires(gameId, 2026);
      const elapsed = Date.now() - t0;
      console.log(`✓ ${gameId} [${elapsed}ms]`);
      console.log(`  main: ${umpires.main}`);
      console.log(`  1st:  ${umpires.first}`);
      console.log(`  2nd:  ${umpires.second}`);
      console.log(`  3rd:  ${umpires.third}\n`);
      success += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ ${gameId}: ${msg}\n`);
      fail += 1;
    }
    await new Promise((r) => setTimeout(r, 2000)); // rate limit 2s
  }

  console.log(`결과: ${success} success / ${fail} fail / ${SAMPLES.length} total`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(99);
});
