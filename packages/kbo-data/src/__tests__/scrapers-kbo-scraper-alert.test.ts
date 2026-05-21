import { describe, expect, it } from 'vitest';
import {
  captureKboScraperHtmlAlert,
  shouldAlertKboScraperHtml,
} from '../scrapers/kbo-scraper-alert';

describe('shouldAlertKboScraperHtml', () => {
  it('content-type text/html → alert (사례 8 봇 차단 패턴)', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: 'text/html; charset=utf-8',
        bodySample: '<html><body>blocked</body></html>',
      }),
    ).toBe(true);
  });

  it('content-type application/json + 정상 JSON → alert 안 함', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: 'application/json; charset=utf-8',
        bodySample: '{"d":"[]"}',
      }),
    ).toBe(false);
  });

  it('content-type 없어도 body 가 `<` 시작 시 alert (IE conditional comment)', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: null,
        bodySample: '<!--[if IE]><html><body>...',
      }),
    ).toBe(true);
  });

  it('body 가 공백만 → alert 안 함 (빈 응답 별도 처리)', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: null,
        bodySample: '   \n\t  ',
      }),
    ).toBe(false);
  });

  it('body 가 `<?xml` 시작 → alert 안 함 (XML 정상 응답 가능)', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: 'application/xml',
        bodySample: '<?xml version="1.0"?><root/>',
      }),
    ).toBe(false);
  });

  it('content-type text/plain + JSON body → alert 안 함', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: 'text/plain',
        bodySample: '{"game":[]}',
      }),
    ).toBe(false);
  });

  it('leading whitespace 후 `<` → alert (response 가 정렬 X 케이스)', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: null,
        bodySample: '\n  <html>...',
      }),
    ).toBe(true);
  });

  it('Content-Type 대문자 표기 → 정규화 후 alert', () => {
    expect(
      shouldAlertKboScraperHtml({
        contentType: 'Text/HTML; charset=UTF-8',
        bodySample: '<html>',
      }),
    ).toBe(true);
  });
});

describe('captureKboScraperHtmlAlert', () => {
  it('NODE_ENV=test 환경에서 early return — sentry 호출 없음 (main path 보호)', async () => {
    await expect(
      captureKboScraperHtmlAlert({
        endpoint: '/ws/Main.asmx/GetKboGameList',
        date: '2026-05-21',
        status: 200,
        contentType: 'text/html',
        bodySample: '<html>blocked</html>',
      }),
    ).resolves.toBeUndefined();
  });

  it('HTML 조건 미충족 시 early return — sentry import 시도 X', async () => {
    await expect(
      captureKboScraperHtmlAlert({
        endpoint: '/ws/Main.asmx/GetKboGameList',
        date: '2026-05-21',
        status: 200,
        contentType: 'application/json',
        bodySample: '{"d":"[]"}',
      }),
    ).resolves.toBeUndefined();
  });
});
