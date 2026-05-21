export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  const commitRef = process.env.VERCEL_GIT_COMMIT_REF ?? null;
  const deployUrl = process.env.VERCEL_URL ?? null;
  const deployEnv = process.env.VERCEL_ENV ?? null;
  const region = process.env.VERCEL_REGION ?? null;

  return Response.json(
    {
      commit_sha: commitSha,
      commit_sha_short: commitSha ? commitSha.slice(0, 7) : null,
      commit_ref: commitRef,
      deploy_url: deployUrl,
      deploy_env: deployEnv,
      region,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
