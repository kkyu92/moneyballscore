import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function req(pathname: string) {
  return new NextRequest(new Request(`https://moneyballscore.vercel.app${pathname}`));
}

describe('middleware — IndexNow key 검증 파일', () => {
  afterEach(() => {
    delete process.env.INDEXNOW_KEY;
  });

  it('/{INDEXNOW_KEY}.txt → key 값 plain text 200', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await middleware(req('/abc123def456.txt'));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123def456');
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('key 불일치 .txt 경로 → 통과 (보안 헤더만 적용, next())', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await middleware(req('/wrong-key.txt'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('INDEXNOW_KEY 미설정 → .txt 경로도 통과', async () => {
    const res = await middleware(req('/abc123def456.txt'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('무관한 경로 영향 없음', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await middleware(req('/predictions'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
