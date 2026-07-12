/**
 * wave-244 regression guard — stale PLAN_v5 refs removed from packages/kbo-data.
 * Files: engine/form, pipeline/schedule, notify/telegram,
 *        __tests__/pipeline-daily, __tests__/scrapers-naver-schedule,
 *        __tests__/scrapers-kbo-official
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');

const FORM_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/engine/form.ts'), 'utf-8');
const SCHEDULE_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/pipeline/schedule.ts'), 'utf-8');
const TELEGRAM_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/notify/telegram.ts'), 'utf-8');
const PIPELINE_DAILY_TEST_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/__tests__/pipeline-daily.test.ts'), 'utf-8');
const NAVER_TEST_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/__tests__/scrapers-naver-schedule.test.ts'), 'utf-8');
const KBO_OFFICIAL_TEST_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/__tests__/scrapers-kbo-official.test.ts'), 'utf-8');

describe('wave-244: stale PLAN_v5 refs removed from packages/kbo-data', () => {
  describe('engine/form.ts', () => {
    it('no PLAN_v5 Phase 2.5 ref', () => {
      expect(FORM_SRC).not.toContain('PLAN_v5 Phase 2.5');
    });
    it('DB games 테이블 comment preserved', () => {
      expect(FORM_SRC).toContain('DB 의 games 테이블 기반 recent form');
    });
  });

  describe('pipeline/schedule.ts', () => {
    it('no PLAN_v5 §5.2 ref', () => {
      expect(SCHEDULE_SRC).not.toContain('PLAN_v5 §5.2');
    });
    it('scheduling function comment preserved', () => {
      expect(SCHEDULE_SRC).toContain('경기별 예측 스케줄링 결정 함수');
    });
  });

  describe('notify/telegram.ts', () => {
    it('no PLAN_v5 §4.4 ref', () => {
      expect(TELEGRAM_SRC).not.toContain('PLAN_v5 §4.4');
    });
    it('announce function comment preserved', () => {
      expect(TELEGRAM_SRC).toContain('09:00 KST 예고 알림');
    });
  });

  describe('__tests__/pipeline-daily.test.ts', () => {
    it('no PLAN_v5 Phase 4 §7.2 ref', () => {
      expect(PIPELINE_DAILY_TEST_SRC).not.toContain('PLAN_v5 Phase 4 §7.2');
    });
    it('4-mode test description preserved', () => {
      expect(PIPELINE_DAILY_TEST_SRC).toContain('daily.ts 4-mode 통합 테스트');
    });
  });

  describe('__tests__/scrapers-naver-schedule.test.ts', () => {
    it('no PLAN_v5 후속 ref', () => {
      expect(NAVER_TEST_SRC).not.toContain('PLAN_v5 후속');
    });
    it('scraper guard comment preserved', () => {
      expect(NAVER_TEST_SRC).toContain('Naver 스케줄 스크래퍼 가드');
    });
  });

  describe('__tests__/scrapers-kbo-official.test.ts', () => {
    it('no PLAN_v5 Phase 4 in describe string', () => {
      expect(KBO_OFFICIAL_TEST_SRC).not.toContain('PLAN_v5 Phase 4');
    });
    it('fetchGames describe preserved', () => {
      expect(KBO_OFFICIAL_TEST_SRC).toContain('fetchGames — status 파싱 regression 보호');
    });
  });
});
