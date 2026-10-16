import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '../route';

function callGet(indexnowKey: string) {
  return GET(new Request('http://localhost/x.txt'), {
    params: Promise.resolve({ indexnowKey }),
  });
}

describe('GET /[indexnowKey].txt', () => {
  beforeEach(() => {
    process.env.INDEXNOW_KEY = 'abc123def456';
  });

  afterEach(() => {
    delete process.env.INDEXNOW_KEY;
  });

  it('key 일치 → 200 + key body', async () => {
    const res = await callGet('abc123def456');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123def456');
  });

  it('key 불일치 → 404', async () => {
    const res = await callGet('wrongkey');
    expect(res.status).toBe(404);
  });

  it('env 미설정 → 404', async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await callGet('abc123def456');
    expect(res.status).toBe(404);
  });

  // cycle 3217 — ping route 와 짝 맞춰 trim 적용. env 값에 트레일링 개행이 섞여도
  // (실측: LLM_BACKEND_HAIKU 동일 클래스 버그) 요청 path 의 순수 key 와 정상 매칭돼야 함.
  it('env 값에 트레일링 개행 → trim 후 정상 매칭 (200)', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456\n';
    const res = await callGet('abc123def456');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123def456');
  });
});
