import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

// EN/KO 페어 3종(mlb/team/[code], mlb/team index, mlb/matchup/[teamA]/[teamB]) 의
// EN 미러는 JSON-LD 에 inLanguage: "en-US" 를 갖고 있었지만 KO 원본은 누락된 상태로
// 분기(cycle 2518 review-code heavy 최초 전체 감사 발견, en/mlb/team/[code] 대조 중
// 발견). 프로젝트 관례상 대부분 KO 페이지(guide/insights/methodology/predictions/
// reviews 등)는 inLanguage: "ko-KR" 보유 — 이 3개만 예외였음.
describe('silent drift wave 662 — mlb team/matchup KO jsonLd inLanguage 누락 정정 (cycle 2518)', () => {
  const pages = [
    'src/app/mlb/team/[code]/page.tsx',
    'src/app/mlb/team/page.tsx',
    'src/app/mlb/matchup/[teamA]/[teamB]/page.tsx',
  ];

  for (const page of pages) {
    it(`${page} jsonLd includes inLanguage: "ko-KR"`, () => {
      const src = readFileSync(join(ROOT, page), 'utf8');
      expect(src).toMatch(/inLanguage:\s*"ko-KR"/);
    });
  }
});
