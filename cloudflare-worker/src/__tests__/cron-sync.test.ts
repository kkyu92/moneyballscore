/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// wrangler.toml 의 crons 배열과 worker.ts 의 dispatch 문자열이 각자 하드코딩되어
// 있어 한쪽만 바뀌면 전체 pipeline 이 silent skip 된다 (cycle 2082 근접 사례,
// TODOS.md "cron 문자열 하드코딩 이중화" 후속). 두 소스가 항상 정확히 일치하는지
// CI 에서 강제 — production Sentry alert (사후 감지) 보다 앞선 방어선.

const rootDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function extractWranglerCrons(): string[] {
  const toml = readFileSync(path.join(rootDir, 'wrangler.toml'), 'utf-8');
  const block = /crons\s*=\s*\[([\s\S]*?)\]/.exec(toml);
  if (!block) throw new Error('wrangler.toml: crons 배열을 찾을 수 없음');
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function extractWorkerDispatchCrons(): string[] {
  const worker = readFileSync(path.join(rootDir, 'src', 'worker.ts'), 'utf-8');
  return [...worker.matchAll(/cronExpr\s*===\s*'([^']+)'/g)].map((m) => m[1]);
}

describe('wrangler.toml crons ↔ worker.ts dispatch sync', () => {
  it('두 소스의 cron 문자열 집합이 정확히 일치한다', () => {
    const wranglerCrons = extractWranglerCrons();
    const workerCrons = extractWorkerDispatchCrons();

    expect(wranglerCrons.length).toBeGreaterThan(0);
    expect(workerCrons.length).toBeGreaterThan(0);
    expect(new Set(workerCrons)).toEqual(new Set(wranglerCrons));
    expect(workerCrons).toHaveLength(wranglerCrons.length);
  });
});
