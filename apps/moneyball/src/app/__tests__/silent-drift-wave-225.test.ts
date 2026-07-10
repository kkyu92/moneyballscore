import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

const H5_LESSON = readFileSync(
  join(REPO_ROOT, 'docs/lessons/2026-05-18-cycle-607-h5-falsification-validator-hallucination-family.md'),
  'utf8'
);

describe('silent drift wave 225 — docs/lessons/cycle-607-h5-falsification v2.0 forward carry-over stale 정합 (cycle 1524)', () => {
  it('h5-falsification: "v2.0 가중치 확정 (n=150 임계 도달 후) 시 real-debate sub-cohort" stale annotation 박제', () => {
    expect(H5_LESSON).toMatch(
      /~~v2\.0 가중치 확정 \(n=150 임계 도달 후\) 시 real-debate sub-cohort 만 사용.*~~.*← stale.*v2\.0 upgrade 불필요.*cycle 1460.*v1\.8 유지 확정/
    );
  });

  it('h5-falsification: "v1.8 강등 라벨 세분화 (option D) v2.0 전진 prerequisite" stale annotation 박제', () => {
    expect(H5_LESSON).toMatch(
      /~~v1\.8 강등 라벨 세분화 \(option D\) v2\.0 전진 prerequisite 후보~~.*← stale.*v2\.0 전진 소멸.*cycle 1460.*v1\.8 유지 확정/
    );
  });
});
