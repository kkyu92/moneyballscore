import { afterEach, beforeEach, describe, expect, it } from 'vitest';

async function callGet() {
  const { GET } = await import('../route');
  return GET();
}

describe('GET /api/version', () => {
  const originals = {
    sha: process.env.VERCEL_GIT_COMMIT_SHA,
    ref: process.env.VERCEL_GIT_COMMIT_REF,
    url: process.env.VERCEL_URL,
    env: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
  };

  beforeEach(() => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_REF;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_REGION;
  });

  afterEach(() => {
    if (originals.sha !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = originals.sha;
    if (originals.ref !== undefined) process.env.VERCEL_GIT_COMMIT_REF = originals.ref;
    if (originals.url !== undefined) process.env.VERCEL_URL = originals.url;
    if (originals.env !== undefined) process.env.VERCEL_ENV = originals.env;
    if (originals.region !== undefined) process.env.VERCEL_REGION = originals.region;
  });

  it('env 부재 시 모든 필드 null + status 200 + cache-control no-store', async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.commit_sha).toBeNull();
    expect(body.commit_sha_short).toBeNull();
    expect(body.commit_ref).toBeNull();
    expect(body.deploy_url).toBeNull();
    expect(body.deploy_env).toBeNull();
    expect(body.region).toBeNull();
    expect(typeof body.timestamp).toBe('string');
  });

  it('VERCEL_GIT_COMMIT_SHA full hash + short 7자 노출', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'bbbfab5abcdef0123456789012345678901abcd';
    const res = await callGet();
    const body = await res.json();
    expect(body.commit_sha).toBe('bbbfab5abcdef0123456789012345678901abcd');
    expect(body.commit_sha_short).toBe('bbbfab5');
  });

  it('VERCEL_GIT_COMMIT_REF / VERCEL_ENV / VERCEL_REGION 노출', async () => {
    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_REGION = 'icn1';
    process.env.VERCEL_URL = 'moneyballscore-xyz.vercel.app';
    const res = await callGet();
    const body = await res.json();
    expect(body.commit_ref).toBe('main');
    expect(body.deploy_env).toBe('production');
    expect(body.region).toBe('icn1');
    expect(body.deploy_url).toBe('moneyballscore-xyz.vercel.app');
  });

  it('timestamp ISO 8601 형식', async () => {
    const res = await callGet();
    const body = await res.json();
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('response_time_ms 정수 + ≥ 0 (deploy-drift-alert.yml threshold 측정 source)', async () => {
    const res = await callGet();
    const body = await res.json();
    expect(typeof body.response_time_ms).toBe('number');
    expect(Number.isInteger(body.response_time_ms)).toBe(true);
    expect(body.response_time_ms).toBeGreaterThanOrEqual(0);
  });
});
