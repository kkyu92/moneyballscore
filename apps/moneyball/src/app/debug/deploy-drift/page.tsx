// M15 — deploy drift dashboard
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher)
// /api/version + Vercel env 비교 — 사례 9/10 family monitoring.
// deploy-drift-alert.yml 매시간 cron 의 본 메인 가시 view.

import { SITE_URL } from '@moneyball/shared';

export const dynamic = 'force-dynamic';

interface VersionPayload {
  commit_sha: string | null;
  commit_sha_short: string | null;
  commit_ref: string | null;
  deploy_env: string | null;
  vercel_url: string | null;
  region: string | null;
  timestamp: string;
}

async function fetchProductionVersion(): Promise<VersionPayload | { error: string }> {
  try {
    const res = await fetch(`${SITE_URL}/api/version`, {
      cache: 'no-store',
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return (await res.json()) as VersionPayload;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

export default async function DeployDriftDashboard() {
  const prodPayload = await fetchProductionVersion();
  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';
  const buildShaShort = buildSha.slice(0, 7);
  const buildEnv = process.env.VERCEL_ENV ?? 'local';

  const isError = 'error' in prodPayload;
  const prodSha = isError ? null : prodPayload.commit_sha_short;
  const gap = !isError && prodSha && buildShaShort !== 'unknown' && buildShaShort !== prodSha;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold mb-1">Deploy Drift Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          사례 9/10 family monitoring · /api/version + Vercel build env · BASIC auth
        </p>
      </header>

      {gap && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-bold mb-1">⚠️ Deploy drift 감지</p>
          <p className="text-sm text-red-600">
            current build commit ({buildShaShort}) ≠ production alias commit ({prodSha}). 사례 9 family 재발 의심 — 다음 수동 `vercel --prod` fire 또는 24h quota reset 대기.
          </p>
        </div>
      )}

      {!gap && !isError && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <p className="text-green-700 font-medium">✓ build commit = production alias commit ({prodSha}) — 사례 9 family 정상</p>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
          <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">Current Build (Vercel env)</h3>
          <p className="font-mono text-lg">{buildShaShort}</p>
          <p className="text-xs text-gray-500 mt-1">env: {buildEnv}</p>
        </div>
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
          <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">Production Alias (/api/version)</h3>
          {isError ? (
            <p className="text-red-600 text-sm font-mono">error: {prodPayload.error}</p>
          ) : (
            <>
              <p className="font-mono text-lg">{prodPayload.commit_sha_short ?? '?'}</p>
              <p className="text-xs text-gray-500 mt-1">
                env: {prodPayload.deploy_env} · region: {prodPayload.region}
              </p>
            </>
          )}
        </div>
      </section>

      {!isError && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2">
          <h3 className="text-sm font-medium mb-2">production /api/version raw</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
            <dt className="text-gray-500">commit_sha</dt>
            <dd className="break-all">{prodPayload.commit_sha ?? '?'}</dd>
            <dt className="text-gray-500">commit_ref</dt>
            <dd>{prodPayload.commit_ref ?? '?'}</dd>
            <dt className="text-gray-500">vercel_url</dt>
            <dd className="break-all">{prodPayload.vercel_url ?? '?'}</dd>
            <dt className="text-gray-500">timestamp</dt>
            <dd>{prodPayload.timestamp}</dd>
          </dl>
        </section>
      )}

      <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">사례 9 family carry-over</p>
        <p>
          auto-deploy 채널 silent skip 발생 시 — (1) 24h quota reset 후 수동 `vercel --prod --yes` (2) prebuilt path
          `vercel build --prod --yes` + `vercel deploy --prebuilt --prod --yes` (build quota 절약)
          (3) vercel.com dashboard webhook + git connection 점검 (영구 fix, 사용자 영역). deploy-drift-alert.yml 매시간
          cron `&apos;17 * * * *&apos;` 자동 fire.
        </p>
      </section>
    </div>
  );
}
