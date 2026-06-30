import * as Sentry from "@sentry/nextjs";

export function captureFallback<T>(
  err: unknown,
  fallback: T,
  tags: Record<string, string>,
): T {
  Sentry.captureException(err, { tags: { layer: "page-fallback", ...tags } });
  return fallback;
}
