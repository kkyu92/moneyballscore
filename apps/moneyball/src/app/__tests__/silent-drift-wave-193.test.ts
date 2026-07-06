import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 193 — CF Worker cron fire count + role count stale → 실제 값 정합 (cycle 1459)', () => {
  it('wrangler.toml: 총 fire/day 합계 82 → 86 갱신 (MLB 5회 포함, 폐기된 self-develop +1 제거)', () => {
    const src = readFileSync(join(REPO_ROOT, 'cloudflare-worker/wrangler.toml'), 'utf8');
    expect(src).not.toMatch(/15 \+ 24 \+ 42 \+ 1 = 82/);
    expect(src).toMatch(/15 \+ 24 \+ 42 \+ 5 = 86/);
  });

  it('wrangler.toml: MLB pipeline 회수 4회/일 → 5회/일 (UTC 18-21 4회 + UTC 10 1회)', () => {
    const src = readFileSync(join(REPO_ROOT, 'cloudflare-worker/wrangler.toml'), 'utf8');
    expect(src).not.toMatch(/MLB pipeline.*4회\/일/);
    expect(src).toMatch(/MLB pipeline.*5회\/일/);
  });

  it('wrangler.toml: 폐기된 self-develop 인라인 주석 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'cloudflare-worker/wrangler.toml'), 'utf8');
    expect(src).not.toMatch(/self-develop daily fire/);
    expect(src).not.toMatch(/4\/5 유지 → MLB 추가로 4\/5/);
  });

  it('worker.ts: JSDoc 역할 수 여섯 → 일곱 (MLB pipeline 추가)', () => {
    const src = readFileSync(join(REPO_ROOT, 'cloudflare-worker/src/worker.ts'), 'utf8');
    expect(src).not.toMatch(/여섯 가지 역할/);
    expect(src).toMatch(/일곱 가지 역할/);
  });

  it('worker.ts: JSDoc 7번 항목 = MLB pipeline 5회/일 명시', () => {
    const src = readFileSync(join(REPO_ROOT, 'cloudflare-worker/src/worker.ts'), 'utf8');
    expect(src).toMatch(/7\) "17 18-21,10 \* \* \*" — MLB pipeline/);
    expect(src).toMatch(/5회\/일/);
  });
});
