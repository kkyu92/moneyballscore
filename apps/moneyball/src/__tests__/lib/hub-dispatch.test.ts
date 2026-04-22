import { describe, it, expect } from 'vitest';
import {
  composePayload,
  makeFingerprint,
  mapEventType,
  mapSeverity,
  scrubPII,
  toDispatchBody,
  type SentryWebhookInput,
} from '@/lib/hub-dispatch';

describe('makeFingerprint', () => {
  it('joins keys + slugifies', () => {
    expect(makeFingerprint(['sentry', 'TypeError', 'src/foo.ts:42', 'production']))
      .toBe('sentry-typeerror-src-foo-ts-42-production');
  });

  it('is deterministic', () => {
    const k = ['A', 'B', 'C'];
    expect(makeFingerprint(k)).toBe(makeFingerprint(k));
  });

  it('handles special chars / korean by flattening to dashes', () => {
    const fp = makeFingerprint(['공백 있는 key', '@!#', '한글']);
    expect(fp).toMatch(/^[a-z0-9-]*$/);
  });

  it('caps at 60 chars', () => {
    const fp = makeFingerprint([Array(200).fill('a').join('')]);
    expect(fp.length).toBeLessThanOrEqual(60);
  });

  it('falls back to "unknown" on empty input', () => {
    expect(makeFingerprint([])).toBe('unknown');
    expect(makeFingerprint(['', '', ''])).toBe('unknown');
  });
});

describe('scrubPII', () => {
  it('masks email', () => {
    expect(scrubPII('contact user@example.com for help')).toBe(
      'contact [email] for help',
    );
  });

  it('masks bearer tokens / api keys', () => {
    expect(scrubPII('sk_live_abc123456789012345')).toContain('[token]');
    expect(scrubPII('ghp_abcdef1234567890123456')).toContain('[github-pat]');
  });

  it('masks UUIDs', () => {
    const u = '550e8400-e29b-41d4-a716-446655440000';
    expect(scrubPII(`user ${u}`)).toBe('user [uuid]');
  });

  it('masks long hex (session tokens)', () => {
    const hex = 'a'.repeat(48);
    expect(scrubPII(`cookie=${hex}`)).toContain('[hex]');
  });

  it('leaves ordinary text alone', () => {
    expect(scrubPII('TypeError: Cannot read property x of undefined')).toBe(
      'TypeError: Cannot read property x of undefined',
    );
  });
});

describe('mapSeverity', () => {
  it('maps sentry levels', () => {
    expect(mapSeverity('fatal')).toBe('critical');
    expect(mapSeverity('error')).toBe('error');
    expect(mapSeverity('warning')).toBe('warning');
  });

  it('falls back to warning', () => {
    expect(mapSeverity(undefined)).toBe('warning');
    expect(mapSeverity('info')).toBe('warning');
  });
});

describe('mapEventType', () => {
  it('maps type → event_type', () => {
    expect(mapEventType('error-log')).toBe('worker-error');
    expect(mapEventType('incident')).toBe('worker-incident');
    expect(mapEventType('lesson')).toBe('worker-lesson');
  });
});

describe('composePayload', () => {
  const sampleEvent: SentryWebhookInput = {
    event: {
      event_id: 'abc',
      level: 'error',
      title: 'TypeError: undefined is not a function',
      culprit: 'src/lib/foo.ts in bar',
      environment: 'production',
      release: 'sha-1234567',
      timestamp: 1712750400,
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'undefined is not a function',
            stacktrace: {
              frames: [
                { filename: 'src/lib/root.ts', function: 'root', lineno: 1 },
                { filename: 'src/lib/middle.ts', function: 'middle', lineno: 10 },
                { filename: 'src/lib/foo.ts', function: 'bar', lineno: 42 },
              ],
            },
          },
        ],
      },
      request: { url: 'https://example.com/a' },
      web_url: 'https://sentry.io/organizations/x/issues/1/',
      tags: [['url', 'https://example.com/a']],
    },
    triggered_rule: 'All unhandled errors',
  };

  it('builds payload with correct structure', () => {
    const p = composePayload(sampleEvent, { sourceRepo: 'kkyu92/moneyballscore' });
    expect(p.source_repo).toBe('kkyu92/moneyballscore');
    expect(p.type).toBe('error-log');
    expect(p.severity).toBe('error');
    expect(p.environment).toBe('production');
    expect(p.run_url).toContain('sentry.io');
    expect(p.title).toContain('TypeError');
  });

  it('fingerprint uses type + top frame + environment (release excluded)', () => {
    const p = composePayload(sampleEvent, { sourceRepo: 'kkyu92/x' });
    expect(p.fingerprint).toContain('typeerror');
    expect(p.fingerprint).toContain('foo-ts');
    expect(p.fingerprint).toContain('production');
    expect(p.fingerprint).not.toContain('1234567'); // release 제외
  });

  it('same error on different release → same fingerprint', () => {
    const p1 = composePayload(sampleEvent, { sourceRepo: 'kkyu92/x' });
    const p2 = composePayload(
      {
        ...sampleEvent,
        event: { ...sampleEvent.event, release: 'different-release' },
      },
      { sourceRepo: 'kkyu92/x' },
    );
    expect(p1.fingerprint).toBe(p2.fingerprint);
  });

  it('body is PII-scrubbed (email in tags)', () => {
    const withEmail: SentryWebhookInput = {
      ...sampleEvent,
      event: {
        ...sampleEvent.event,
        tags: [['user', 'test@example.com']],
      },
    };
    const p = composePayload(withEmail, { sourceRepo: 'x' });
    expect(p.body).toContain('[email]');
    expect(p.body).not.toContain('test@example.com');
  });

  it('intent=test propagates', () => {
    const p = composePayload(sampleEvent, { sourceRepo: 'x', intent: 'test' });
    expect(p.intent).toBe('test');
  });
});

describe('toDispatchBody', () => {
  it('wraps payload with event_type', () => {
    const payload = {
      source_repo: 'x',
      title: 't',
      body: 'b',
      type: 'incident' as const,
      severity: 'error' as const,
      fingerprint: 'fp-1',
    };
    const d = toDispatchBody(payload);
    expect(d.event_type).toBe('worker-incident');
    expect(d.client_payload).toBe(payload);
  });
});
