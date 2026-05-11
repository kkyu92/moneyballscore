import { describe, expect, it } from 'vitest';
import {
  brierScore,
  buildDayOfWeek,
  buildRecentForm,
  buildWeeklyTrend,
  bucketize,
  calibrationGap,
} from '../buildAccuracyData';

function row(confidence: number, is_correct: boolean, verified_at = '2026-05-01T10:00:00Z') {
  return { confidence, is_correct, verified_at };
}

describe('brierScore', () => {
  it('빈 배열 → 0', () => {
    expect(brierScore([])).toBe(0);
  });

  it('전부 맞힌 경우 (confidence=1, is_correct=true) → 0', () => {
    expect(brierScore([row(1, true), row(1, true)])).toBe(0);
  });

  it('전부 틀린 경우 (confidence=1, is_correct=false) → 1', () => {
    expect(brierScore([row(1, false), row(1, false)])).toBe(1);
  });

  it('동전 toss (confidence=0.5) → 0.25', () => {
    expect(brierScore([row(0.5, true), row(0.5, false)])).toBeCloseTo(0.25);
  });
});

describe('calibrationGap', () => {
  it('빈 배열 → 0', () => {
    expect(calibrationGap([])).toBe(0);
  });

  it('avgConf=0.6, accuracy=0.6 → gap=0 (잘 보정)', () => {
    const rows = [row(0.6, true), row(0.6, true), row(0.6, false), row(0.6, false)];
    // avgConf = 0.6, acc = 2/4 = 0.5... wait
    // 위 rows: 2 true, 2 false → acc = 0.5, avgConf = 0.6 → gap = 0.1
    expect(calibrationGap(rows)).toBeCloseTo(0.1);
  });

  it('과신 경향: avgConf > acc → gap > 0', () => {
    const rows = [row(0.8, false), row(0.8, false), row(0.8, false)];
    expect(calibrationGap(rows)).toBeCloseTo(0.8);
  });
});

describe('bucketize', () => {
  it('빈 배열 → 빈 bucket', () => {
    expect(bucketize([])).toEqual([]);
  });

  it('단일 row → 1개 bucket', () => {
    // confidence=0.55: idx = floor((0.55-0.5)/0.05) = floor(1) = 1 → lower=0.55, upper=0.60
    const result = bucketize([row(0.55, true)]);
    expect(result).toHaveLength(1);
    expect(result[0].n).toBe(1);
    expect(result[0].hits).toBe(1);
    expect(result[0].lower).toBeCloseTo(0.55);
    expect(result[0].upper).toBeCloseTo(0.60);
  });

  it('n=0 bucket은 제외', () => {
    const result = bucketize([row(0.55, true), row(0.95, false)]);
    // 0.55 → bucket 1 (0.5~0.55), 0.95 → bucket 9 (0.9~0.95)
    expect(result).toHaveLength(2);
  });
});

describe('buildRecentForm', () => {
  it('빈 배열 → dots=[], hits=0, total=0, trend=flat', () => {
    const result = buildRecentForm([]);
    expect(result).toEqual({ dots: [], hits: 0, total: 0, trend: 'flat' });
  });

  it('10개 이하 → trend=flat (데이터 부족)', () => {
    const rows = Array(10).fill(row(0.6, true));
    const result = buildRecentForm(rows);
    expect(result.trend).toBe('flat');
    expect(result.total).toBe(10);
  });

  it('20개 모두 적중 → trend=flat (앞10=1.0 vs 뒤10=1.0, diff=0)', () => {
    const rows = Array(20).fill(row(0.6, true));
    const result = buildRecentForm(rows);
    expect(result.trend).toBe('flat');
    expect(result.hits).toBe(20);
  });

  it('앞10 모두 실패 + 뒤10 모두 적중 → trend=up (diff=1.0 >= 0.1)', () => {
    const rows = [
      ...Array(10).fill(row(0.6, false)),
      ...Array(10).fill(row(0.6, true)),
    ];
    const result = buildRecentForm(rows);
    expect(result.trend).toBe('up');
  });

  it('앞10 모두 적중 + 뒤10 모두 실패 → trend=down (diff=-1.0 <= -0.1)', () => {
    const rows = [
      ...Array(10).fill(row(0.6, true)),
      ...Array(10).fill(row(0.6, false)),
    ];
    const result = buildRecentForm(rows);
    expect(result.trend).toBe('down');
  });

  it('앞10: 5적중 + 뒤10: 5적중 → trend=flat (diff=0)', () => {
    const rows = [
      ...Array(5).fill(row(0.6, true)),
      ...Array(5).fill(row(0.6, false)),
      ...Array(5).fill(row(0.6, true)),
      ...Array(5).fill(row(0.6, false)),
    ];
    const result = buildRecentForm(rows);
    expect(result.trend).toBe('flat');
  });

  it('30개 rows: slice(-20) 취하므로 total=20', () => {
    const rows = Array(30).fill(row(0.6, true));
    const result = buildRecentForm(rows);
    expect(result.total).toBe(20);
    expect(result.hits).toBe(20);
  });

  it('limit=10으로 호출: 10개 slice + 5/5 비교', () => {
    const rows = [
      ...Array(5).fill(row(0.6, false)),
      ...Array(5).fill(row(0.6, true)),
    ];
    const result = buildRecentForm(rows, 10);
    expect(result.total).toBe(10);
    expect(result.trend).toBe('up');
  });
});

describe('buildDayOfWeek', () => {
  it('빈 배열 → 7개 DayBucket (모두 n=0, accuracy=null)', () => {
    const result = buildDayOfWeek([]);
    expect(result).toHaveLength(7);
    result.forEach((d) => {
      expect(d.n).toBe(0);
      expect(d.accuracy).toBeNull();
    });
  });

  it('월요일(KST) 경기 → 월요일 bucket에 집계', () => {
    // 2026-05-04 월요일 KST = 2026-05-04T01:00:00Z (UTC+9 오전 10시)
    const rows = [row(0.6, true, '2026-05-04T01:00:00Z')];
    const result = buildDayOfWeek(rows);
    const mon = result.find((d) => d.dayLabel === '월');
    expect(mon?.n).toBe(1);
    expect(mon?.hits).toBe(1);
    expect(mon?.accuracy).toBe(1);
  });

  it('일요일(KST) 경기 → 일요일 bucket에 집계', () => {
    // 2026-05-03 일요일 KST = 2026-05-03T01:00:00Z
    const rows = [row(0.6, false, '2026-05-03T01:00:00Z')];
    const result = buildDayOfWeek(rows);
    const sun = result.find((d) => d.dayLabel === '일');
    expect(sun?.n).toBe(1);
    expect(sun?.hits).toBe(0);
    expect(sun?.accuracy).toBe(0);
  });

  it('DOW_ORDER: 월화수목금토일 순서', () => {
    const result = buildDayOfWeek([]);
    const labels = result.map((d) => d.dayLabel);
    expect(labels).toEqual(['월', '화', '수', '목', '금', '토', '일']);
  });
});

describe('buildWeeklyTrend', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(buildWeeklyTrend([])).toEqual([]);
  });

  it('같은 주 여러 경기 → 1개 WeekBucket으로 합산', () => {
    // 2026-05-04~05-08 (월~금, 같은 주)
    const rows = [
      row(0.6, true, '2026-05-04T01:00:00Z'),
      row(0.6, false, '2026-05-05T01:00:00Z'),
      row(0.6, true, '2026-05-07T01:00:00Z'),
    ];
    const result = buildWeeklyTrend(rows);
    expect(result).toHaveLength(1);
    expect(result[0].n).toBe(3);
    expect(result[0].hits).toBe(2);
    expect(result[0].accuracy).toBeCloseTo(2 / 3);
  });

  it('최근 8주만 반환 (오래된 주차 제외)', () => {
    // 10주 데이터 생성 (주별 1경기)
    const rows = Array.from({ length: 10 }, (_, i) => {
      const date = new Date('2026-03-02T01:00:00Z');
      date.setUTCDate(date.getUTCDate() + i * 7);
      return row(0.6, true, date.toISOString());
    });
    const result = buildWeeklyTrend(rows);
    expect(result).toHaveLength(8);
  });

  it('weekLabel 형식 확인: "M/D 주"', () => {
    const rows = [row(0.6, true, '2026-05-04T01:00:00Z')];
    const result = buildWeeklyTrend(rows);
    // KST 기준 2026-05-04 → 주 시작 월요일 2026-05-04 → "5/4 주"
    expect(result[0].weekLabel).toBe('5/4 주');
  });
});
