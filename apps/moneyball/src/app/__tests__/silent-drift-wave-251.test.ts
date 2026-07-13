/**
 * wave-251 regression guard — /debug/model-comparison 페이지의 사용자 가시 텍스트에서
 * 하드코딩된 `v2.0-debate` 를 LLM_DEBATE_VERSION 상수 참조로 swap (cycle 1555).
 *
 * Root cause: page.tsx header 텍스트 2곳에서 `v2.0-debate` 문자열 직접 사용 →
 *   LLM_DEBATE_VERSION 상수 (shared/model-version-labels.ts, single source) 가 바뀌면
 *   UI silent decoupling. wave-250 (accuracy V18SubCohortPanel subLabel) 과 동일 pattern.
 *
 * fix: header <p> JSX 안 `v2.0-debate` → `{LLM_DEBATE_VERSION}` interpolation.
 *   compareModels.ts 는 이미 상수 참조 중 — 페이지 UI 만 뒤늦게 정합.
 *
 * /debug/* 는 middleware BASIC auth 로 보호 (사용자 가시 X) 지만 silent drift family
 * 는 dev-facing 페이지에서도 발생 → single source 상수 참조 원칙 일관 적용.
 *
 * silent drift family 252번째 wave (cycle 458 → cycle 1555).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const DEBUG_PAGE_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/debug/model-comparison/page.tsx'),
  'utf-8',
);

describe('wave-251: /debug/model-comparison header text = LLM_DEBATE_VERSION 상수 참조', () => {
  it('LLM_DEBATE_VERSION 을 @moneyball/shared 에서 import', () => {
    expect(DEBUG_PAGE_SRC).toMatch(/LLM_DEBATE_VERSION/);
    expect(DEBUG_PAGE_SRC).toMatch(/from '@moneyball\/shared'/);
  });

  it('header <p> 텍스트: 하드코딩 "+ v2.0-debate /" 제거', () => {
    expect(DEBUG_PAGE_SRC).not.toContain('v1.8 ship + v2.0-debate / v2.1-B shadow');
  });

  it('header <p> 텍스트: 하드코딩 "v2.0-debate row" 제거', () => {
    expect(DEBUG_PAGE_SRC).not.toContain('건 v2.0-debate row 에서');
  });

  it('header <p> 텍스트: LLM_DEBATE_VERSION interpolation 존재 (2곳)', () => {
    // "v1.8 ship + {LLM_DEBATE_VERSION} / v2.1-B" 형태 1건
    expect(DEBUG_PAGE_SRC).toMatch(
      /v1\.8 ship \+ \{LLM_DEBATE_VERSION\} \/ v2\.1-B/,
    );
    // "{shadow.length}건 {LLM_DEBATE_VERSION} row" 형태 1건
    expect(DEBUG_PAGE_SRC).toMatch(
      /\{shadow\.length\}건 \{LLM_DEBATE_VERSION\} row/,
    );
  });
});
