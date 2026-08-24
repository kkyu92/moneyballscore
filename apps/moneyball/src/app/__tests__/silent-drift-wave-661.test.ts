import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

// about/page.tsx "업데이트 주기" 섹션이 실시간 스코어 갱신 주기를 "30초 간격"
// 이라 표시 — 실제 메커니즘(Cloudflare Worker cron `*/10 9-15 * * *`, wrangler.toml)
// 은 처음부터(Phase 2d, 최초 GH Actions 버전 포함) 10분 간격이었고 30초 폴링은
// 코드베이스 어디에도 존재한 적 없음. 2026-04-16 작성 시점부터 실측과 무관하게
// 잘못 기재된 값(cycle 2516 review-code heavy 최초 전체 감사 발견).
describe('silent drift wave 661 — about/page.tsx 실시간 스코어 갱신 주기 30초 → 10분 정정 (cycle 2516)', () => {
  it('about/page.tsx: 30초 간격 문구 제거, 10분 간격 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/about/page.tsx'), 'utf8');
    expect(src).not.toContain('30초 간격');
    expect(src).toContain('10분 간격');
  });
});
