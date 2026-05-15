import { describe, expect, it } from 'vitest';
import { CURRENT_SCORING_RULE } from '@moneyball/shared';
import {
  brierScore,
  buildConfidenceTiers,
  buildDayOfWeek,
  buildFallbackStats,
  buildFallbackDailyTrend,
  buildRecentForm,
  buildVersionHistory,
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
    // 0.55 → bucket 1 (0.55~0.60), 0.95 → bucket 9 (0.95~1.00)
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

describe('buildConfidenceTiers', () => {
  it('빈 배열 → 3개 tier, 모두 accuracy=null', () => {
    const result = buildConfidenceTiers([]);
    expect(result).toHaveLength(3);
    result.forEach((t) => expect(t.accuracy).toBeNull());
  });

  it('confidence 0.5 → 낮은 확신 tier에 포함', () => {
    const result = buildConfidenceTiers([row(0.5, true)]);
    expect(result[0].n).toBe(1);
    expect(result[0].hits).toBe(1);
    expect(result[1].n).toBe(0);
    expect(result[2].n).toBe(0);
  });

  it('confidence 0.55 → 보통 확신 tier에 포함', () => {
    const result = buildConfidenceTiers([row(0.55, false)]);
    expect(result[0].n).toBe(0);
    expect(result[1].n).toBe(1);
    expect(result[1].hits).toBe(0);
  });

  it('confidence 0.65 → 높은 확신 tier에 포함', () => {
    const result = buildConfidenceTiers([row(0.65, true)]);
    expect(result[2].n).toBe(1);
    expect(result[2].accuracy).toBe(1);
  });

  it('역전 패턴 감지 — low accuracy > mid accuracy', () => {
    const rows = [
      ...Array(10).fill(row(0.5, true)),   // low: 10/10 = 100%
      ...Array(5).fill(row(0.55, false)),  // mid: 0/5 = 0%
    ];
    const result = buildConfidenceTiers(rows);
    expect(result[0].accuracy).toBe(1);
    expect(result[1].accuracy).toBe(0);
    expect(result[1].accuracy!).toBeLessThan(result[0].accuracy!);
  });
});

describe('buildVersionHistory', () => {
  function vrow(
    confidence: number,
    is_correct: boolean,
    scoring_rule: string | null,
    verified_at = '2026-05-01T10:00:00Z',
  ) {
    return { confidence, is_correct, verified_at, scoring_rule };
  }

  it('빈 배열 → 4개 버전 모두 n=0', () => {
    const result = buildVersionHistory([]);
    expect(result).toHaveLength(4);
    result.forEach((v) => {
      expect(v.n).toBe(0);
      expect(v.accuracy).toBeNull();
    });
  });

  it('버전 순서: v1.5 → v1.6 → v1.7-revert → v1.8', () => {
    const result = buildVersionHistory([]);
    expect(result.map((v) => v.version)).toEqual(['v1.5', 'v1.6', 'v1.7-revert', 'v1.8']);
  });

  it('v1.5: 4건 3적중 → accuracy=0.75', () => {
    const rows = [
      vrow(0.6, true, 'v1.5'),
      vrow(0.6, true, 'v1.5'),
      vrow(0.6, true, 'v1.5'),
      vrow(0.6, false, 'v1.5'),
    ];
    const result = buildVersionHistory(rows);
    const v15 = result.find((v) => v.version === 'v1.5')!;
    expect(v15.n).toBe(4);
    expect(v15.hits).toBe(3);
    expect(v15.accuracy).toBeCloseTo(0.75);
  });

  it('알 수 없는 scoring_rule은 무시', () => {
    const rows = [vrow(0.6, true, 'unknown_ver'), vrow(0.6, true, null)];
    const result = buildVersionHistory(rows);
    result.forEach((v) => expect(v.n).toBe(0));
  });

  it('v1.8에 진행 중 레이블 메타 포함', () => {
    const result = buildVersionHistory([]);
    const v18 = result.find((v) => v.version === 'v1.8')!;
    expect(v18.label).toBe('v1.8');
    expect(v18.note).toContain('ELO');
  });

  // cycle 485 — labelOf('-revert' suffix strip) 계약 박제. v1.7-revert internal
  // key 가 display 'v1.7' 로 strip 되는 의도가 silent drift 되지 않도록 lock.
  it("labelOf: '-revert' suffix 는 display 라벨에서 strip", () => {
    const rows = [vrow(0.6, true, 'v1.7-revert')];
    const result = buildVersionHistory(rows);
    const v17 = result.find((v) => v.version === 'v1.7-revert')!;
    expect(v17.label).toBe('v1.7');
  });

  it('dateRange: 단일 날짜 → M/D 형식', () => {
    const rows = [vrow(0.6, true, 'v1.6', '2026-04-01T10:00:00Z')];
    const result = buildVersionHistory(rows);
    const v16 = result.find((v) => v.version === 'v1.6')!;
    expect(v16.dateRange).toMatch(/^\d+\/\d+$/);
  });

  it('Brier 계산: confidence=0.5, is_correct=true → brier=0.25', () => {
    const rows = [vrow(0.5, true, 'v1.7-revert')];
    const result = buildVersionHistory(rows);
    const v17 = result.find((v) => v.version === 'v1.7-revert')!;
    expect(v17.brier).toBeCloseTo(0.25);
  });

  // cycle 474 silent drift family guard — CURRENT_SCORING_RULE bump (v1.9/v2.0)
  // 시 VERSION_ORDER + VERSION_NOTES 동시 갱신 누락 차단. shared 의 라벨 단일
  // source 와 buildAccuracyData 의 historical entry list 분리 의도는 유지하되
  // current 가 list 에서 사라지는 silent drift 만 차단.
  // cycle 485 — VERSION_META → VERSION_NOTES rename. label 필드 제거 + labelOf
  // 헬퍼로 '-revert' suffix strip 만 special-case.
  it('CURRENT_SCORING_RULE invariant: VERSION_ORDER 와 VERSION_NOTES 에 포함', () => {
    const rows = [vrow(0.6, true, CURRENT_SCORING_RULE)];
    const result = buildVersionHistory(rows);
    const cur = result.find((v) => v.version === CURRENT_SCORING_RULE);
    expect(cur, `CURRENT_SCORING_RULE='${CURRENT_SCORING_RULE}' VERSION_ORDER 누락 — buildAccuracyData.ts 의 VERSION_ORDER 에 추가 필요`).toBeDefined();
    expect(cur!.n).toBe(1);
    expect(cur!.label, `labelOf('${CURRENT_SCORING_RULE}') 빈 라벨`).toBeTruthy();
    expect(cur!.note, `VERSION_NOTES['${CURRENT_SCORING_RULE}'] 미설정`).toBeTruthy();
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

// cycle 384 fix-incident heavy — LLM 토론 활성 vs fallback 가시화.
describe('buildFallbackStats', () => {
  it('빈 배열 → 0/0/0%', () => {
    const s = buildFallbackStats([]);
    expect(s.total).toBe(0);
    expect(s.llmActive).toBe(0);
    expect(s.fallback).toBe(0);
    expect(s.fallbackRate).toBe(0);
  });

  it('모두 v2.0-debate → fallback 0%', () => {
    const s = buildFallbackStats([
      { model_version: 'v2.0-debate', predicted_at: '2026-05-13T10:00:00Z' },
      { model_version: 'v2.0-debate', predicted_at: '2026-05-13T11:00:00Z' },
    ]);
    expect(s.total).toBe(2);
    expect(s.llmActive).toBe(2);
    expect(s.fallback).toBe(0);
    expect(s.fallbackRate).toBe(0);
  });

  it('mv=v1.8 → fallback 100%', () => {
    const s = buildFallbackStats([
      { model_version: 'v1.8', predicted_at: '2026-05-13T10:00:00Z' },
      { model_version: 'v1.8', predicted_at: '2026-05-14T10:00:00Z' },
    ]);
    expect(s.total).toBe(2);
    expect(s.llmActive).toBe(0);
    expect(s.fallback).toBe(2);
    expect(s.fallbackRate).toBe(1);
    expect(s.latestFallbackAt).toBe('2026-05-14T10:00:00Z');
  });

  it('mv=v1.8-postview 도 fallback 으로 분류', () => {
    const s = buildFallbackStats([
      { model_version: 'v1.8-postview', predicted_at: '2026-05-13T10:00:00Z' },
      { model_version: 'v2.0-postview', predicted_at: '2026-05-13T11:00:00Z' },
    ]);
    expect(s.fallback).toBe(1);
    expect(s.llmActive).toBe(1);
    expect(s.fallbackRate).toBe(0.5);
  });

  it('v1.7-revert / null 모델은 total 에서 제외 (legacy 잡음 차단)', () => {
    const s = buildFallbackStats([
      { model_version: 'v1.7-revert', predicted_at: '2026-05-10T10:00:00Z' },
      { model_version: null, predicted_at: '2026-05-11T10:00:00Z' },
      { model_version: 'v2.0-debate', predicted_at: '2026-05-12T10:00:00Z' },
    ]);
    expect(s.total).toBe(1);
    expect(s.llmActive).toBe(1);
    expect(s.fallback).toBe(0);
  });

  it('latestFallbackAt = 가장 최근 fallback 시각', () => {
    const s = buildFallbackStats([
      { model_version: 'v1.8', predicted_at: '2026-05-13T07:00:00Z' },
      { model_version: 'v2.0-debate', predicted_at: '2026-05-14T07:00:00Z' },
      { model_version: 'v1.8', predicted_at: '2026-05-14T03:00:00Z' },
    ]);
    expect(s.latestFallbackAt).toBe('2026-05-14T03:00:00Z');
  });
});

// cycle 460 polish-ui heavy — spec scope A: 일별 stacked bar 데이터.
describe('buildFallbackDailyTrend', () => {
  // 2026-05-15 12:00 KST = 2026-05-15 03:00 UTC
  const NOW = new Date('2026-05-15T03:00:00Z').getTime();

  it('빈 배열 → days 만큼 빈 bucket', () => {
    const t = buildFallbackDailyTrend([], 7, NOW);
    expect(t).toHaveLength(7);
    expect(t.every((b) => b.total === 0)).toBe(true);
    // 시간 순서: 가장 오래된 부터 (i=days-1) → 가장 최근 (i=0)
    expect(t[0].dateISO).toBe('2026-05-09');
    expect(t[6].dateISO).toBe('2026-05-15');
  });

  it('KST date 기준 bucket — UTC 와 9시간 차이', () => {
    // 2026-05-13 23:00 KST = 2026-05-13 14:00 UTC
    const t = buildFallbackDailyTrend(
      [{ model_version: 'v2.0-debate', predicted_at: '2026-05-13T14:00:00Z' }],
      7,
      NOW,
    );
    const may13 = t.find((b) => b.dateISO === '2026-05-13');
    expect(may13?.llmActive).toBe(1);
    expect(may13?.total).toBe(1);
  });

  it('LLM 활성 + fallback 같은 날 stacked', () => {
    const t = buildFallbackDailyTrend(
      [
        { model_version: 'v2.0-debate', predicted_at: '2026-05-14T05:00:00Z' },
        { model_version: 'v1.8', predicted_at: '2026-05-14T06:00:00Z' },
        { model_version: 'v1.8-postview', predicted_at: '2026-05-14T07:00:00Z' },
      ],
      7,
      NOW,
    );
    const may14 = t.find((b) => b.dateISO === '2026-05-14');
    expect(may14?.llmActive).toBe(1);
    expect(may14?.fallback).toBe(2);
    expect(may14?.total).toBe(3);
  });

  it('window 외 row 는 무시', () => {
    const t = buildFallbackDailyTrend(
      [
        { model_version: 'v2.0-debate', predicted_at: '2026-05-01T05:00:00Z' }, // 14일 전 (out of 7d)
        { model_version: 'v1.8', predicted_at: '2026-05-14T06:00:00Z' },
      ],
      7,
      NOW,
    );
    const total = t.reduce((s, b) => s + b.total, 0);
    expect(total).toBe(1);
  });

  it('v1.7-revert / null 제외 (legacy 잡음 차단)', () => {
    const t = buildFallbackDailyTrend(
      [
        { model_version: 'v1.7-revert', predicted_at: '2026-05-13T05:00:00Z' },
        { model_version: null, predicted_at: '2026-05-13T06:00:00Z' },
        { model_version: 'v2.0-debate', predicted_at: '2026-05-13T07:00:00Z' },
      ],
      7,
      NOW,
    );
    const may13 = t.find((b) => b.dateISO === '2026-05-13');
    expect(may13?.total).toBe(1);
    expect(may13?.llmActive).toBe(1);
  });

  it('dateLabel = M/D 형식 (leading zero 없음)', () => {
    const t = buildFallbackDailyTrend([], 7, NOW);
    const may9 = t.find((b) => b.dateISO === '2026-05-09');
    expect(may9?.dateLabel).toBe('5/9');
    const may15 = t.find((b) => b.dateISO === '2026-05-15');
    expect(may15?.dateLabel).toBe('5/15');
  });
});
