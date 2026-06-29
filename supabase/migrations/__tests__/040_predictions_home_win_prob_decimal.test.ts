import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(resolve(__dirname, '../040_predictions_home_win_prob_decimal.sql'), 'utf8');

describe('040_predictions_home_win_prob_decimal migration (cycle 1404, issue #2505)', () => {
  it('ALTER COLUMN home_win_prob TYPE DECIMAL(4,3)', () => {
    expect(SQL).toMatch(/ALTER TABLE predictions/);
    expect(SQL).toMatch(/ALTER COLUMN home_win_prob TYPE DECIMAL\(4,3\)/);
  });

  it('USING cast 박제 (FLOAT → DECIMAL 안전 변환)', () => {
    expect(SQL).toMatch(/USING home_win_prob::DECIMAL\(4,3\)/);
  });

  it('의도 주석 박제 — KBO confidence + 다른 확률 컬럼 정합', () => {
    expect(SQL).toMatch(/DECIMAL\(4,3\)/);
    expect(SQL).toMatch(/silent drift family|확률 0~1|동일 도메인/);
  });
});
