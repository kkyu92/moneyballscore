import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry wrapper:
// - DSN env가 없어도 wrapper 자체는 안전 (no-op으로 빌드 통과).
// - 실제 에러 전송은 sentry.{client,server,edge}.config.ts 의 dsn 체크에서 결정.
// - SENTRY_AUTH_TOKEN env가 있어야 sourcemap 업로드. 없으면 sourcemap 업로드만 skip.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  disableLogger: true,
  // Vercel에서 SENTRY_AUTH_TOKEN env 없으면 sourcemap 업로드 skip
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
