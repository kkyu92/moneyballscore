/**
 * wave-250 regression guard — V18SubCohortPanel subLabel hardcoded model_version
 * string 을 LLM_DEBATE_VERSION / LLM_POSTVIEW_VERSION 상수 참조로 swap (cycle 1554).
 *
 * Root cause: line 1089 subLabel="model_version: v2.0-debate" 하드코딩 →
 *   (1) realDebate 버킷은 LLM_ACTIVE_VERSIONS = {LLM_DEBATE_VERSION, LLM_POSTVIEW_VERSION}
 *       2개 라벨 모두 포함 → v2.0-debate 만 명시 = 부분 정확.
 *   (2) LLM_DEBATE_VERSION 이 shared 단일 source 인데 참조 안 함 → literal 이 바뀌면 UI silent decoupling.
 *
 * fix: subLabel = `model_version: ${LLM_DEBATE_VERSION} | ${LLM_POSTVIEW_VERSION}`
 *   → 두 라벨 모두 노출 + 상수 참조 단일 source 유지.
 *
 * silent drift family 251번째 wave (cycle 458 → cycle 1554).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const ACCURACY_PAGE_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/accuracy/page.tsx'),
  'utf-8',
);

describe('wave-250: V18SubCohortPanel subLabel constant reference (no hardcoded model_version)', () => {
  it('accuracy/page.tsx imports LLM_DEBATE_VERSION + LLM_POSTVIEW_VERSION', () => {
    expect(ACCURACY_PAGE_SRC).toMatch(/LLM_DEBATE_VERSION/);
    expect(ACCURACY_PAGE_SRC).toMatch(/LLM_POSTVIEW_VERSION/);
  });

  it('V18SubCohortPanel subLabel 하드코딩 "v2.0-debate" 제거', () => {
    expect(ACCURACY_PAGE_SRC).not.toContain('subLabel="model_version: v2.0-debate"');
  });

  it('V18SubCohortPanel subLabel = template literal referencing 두 상수', () => {
    expect(ACCURACY_PAGE_SRC).toMatch(
      /subLabel=\{`model_version: \$\{LLM_DEBATE_VERSION\} \| \$\{LLM_POSTVIEW_VERSION\}`\}/,
    );
  });

  it('정량 fallback subLabel 자연어 문구 유지 (dev jargon 아닌 사용자 언어)', () => {
    expect(ACCURACY_PAGE_SRC).toContain('subLabel="API 한도/장애로 LLM 비활성"');
  });
});
