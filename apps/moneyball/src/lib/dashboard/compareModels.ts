/**
 * 모델 버전별 성능 집계. v1.5 → v1.6 전환 효과 측정용.
 *
 * Grouping key = `scoring_rule ?? '(null)'` + `model_version`.
 *   - 과거 row 는 scoring_rule=null 로 저장됨 (v1.5 시절)
 *   - 2026-04-22~cycle17 사이 row 는 scoring_rule='v1.6', 이후 'v1.7-revert'
 *   - model_version 은 agent 존재 여부: v1.5/v1.6/v2.0-debate/v2.0-postview/
 *     v1.5-live/v1.6-live
 *
 * Brier 계산: reasoning JSON 에서 homeWinProb 추출 후 실제 home 승리 여부
 * (winner_team_id === home_team_id) 와 (p - y)^2 평균.
 */

export interface CalibrationBucket {
  lo: number;
  hi: number;
  n: number;
  avgPredicted: number;
  actualRate: number;
}

export interface ModelGroupStats {
  key: string;
  scoringRule: string;
  modelVersion: string;
  n: number;
  verifiedN: number;
  correctCount: number;
  accuracy: number;
  brierN: number;
  brier: number | null;
  logLoss: number | null;
  calibration: CalibrationBucket[];
  firstSeen: string | null;
  lastSeen: string | null;
}

export interface PredictionRow {
  id: number;
  model_version: string;
  scoring_rule: string | null;
  is_correct: boolean | null;
  verified_at: string | null;
  created_at: string;
  reasoning: unknown;
  game: {
    home_team_id: number;
    winner_team_id: number | null;
  } | null;
}

/**
 * reasoning JSONB 에서 홈팀 승리 확률 추출.
 * v1.5/v1.6 정량: `reasoning.homeWinProb`.
 * v2.0-debate: `reasoning.debate.verdict.homeWinProb` 우선, fallback `reasoning.homeWinProb`.
 * v2.0-postview: 동일 fallback.
 */
export function extractHomeWinProb(reasoning: unknown): number | null {
  if (!reasoning || typeof reasoning !== 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reasoning as any;
  const debate = r.debate?.verdict?.homeWinProb;
  if (typeof debate === 'number') return debate;
  if (typeof r.homeWinProb === 'number') return r.homeWinProb;
  return null;
}

/**
 * Shadow run: debate 가 덮기 전의 v1.6 순수 정량 확률 (daily.ts 가 2026-04-22
 * 이후 `reasoning.quantitativeHomeWinProb` 로 병행 저장). v1.6-pure vs
 * v2.0-debate Brier 비교에 사용.
 */
export function extractPureQuantProb(reasoning: unknown): number | null {
  if (!reasoning || typeof reasoning !== 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reasoning as any;
  if (typeof r.quantitativeHomeWinProb === 'number') {
    return r.quantitativeHomeWinProb;
  }
  return null;
}

function clampProb(p: number): number {
  if (p < 1e-9) return 1e-9;
  if (p > 1 - 1e-9) return 1 - 1e-9;
  return p;
}

/** 10분할 calibration bucket. */
function buildCalibration(
  pairs: Array<{ p: number; y: number }>,
  bins = 10,
): CalibrationBucket[] {
  const out: CalibrationBucket[] = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let sumP = 0;
    let sumY = 0;
    let cnt = 0;
    for (const { p, y } of pairs) {
      const inBucket = b === bins - 1 ? p >= lo && p <= hi : p >= lo && p < hi;
      if (inBucket) {
        sumP += p;
        sumY += y;
        cnt++;
      }
    }
    out.push({
      lo,
      hi,
      n: cnt,
      avgPredicted: cnt > 0 ? sumP / cnt : 0,
      actualRate: cnt > 0 ? sumY / cnt : 0,
    });
  }
  return out;
}

/**
 * v2.0-debate row 에서 quantitativeHomeWinProb 을 shadow group 으로 추출.
 * 원래 row 는 그대로 두고 **가상 row 복사본** 을 `v1.6-pure (shadow)` 로 라벨.
 * Agent 가 덮기 전의 pure 정량 모델 Brier 측정용.
 */
export function buildShadowRows(rows: PredictionRow[]): PredictionRow[] {
  const shadow: PredictionRow[] = [];
  for (const r of rows) {
    if (r.model_version !== 'v2.0-debate') continue;
    const p = extractPureQuantProb(r.reasoning);
    if (p === null) continue;
    // pureProb 가 별도로 있으니 homeWinProb 을 그 값으로 세팅한 clone 만듦
    const cloneReasoning = { homeWinProb: p };
    shadow.push({
      ...r,
      model_version: 'v1.6-pure-shadow',
      scoring_rule: r.scoring_rule ?? 'v1.6',
      reasoning: cloneReasoning,
      // is_correct 은 debate 기준이라 shadow 엔 부정확할 수 있음 — 별도 재계산
      // (winner_team_id + homeWinProb 으로 재판정)
      is_correct: inferShadowCorrectness(r, p),
    });
  }
  return shadow;
}

function inferShadowCorrectness(
  row: PredictionRow,
  pHome: number,
): boolean | null {
  if (!row.game || row.game.winner_team_id === null) return null;
  const predictedHome = pHome >= 0.5;
  const actualHome = row.game.winner_team_id === row.game.home_team_id;
  return predictedHome === actualHome;
}

/** scoring_rule + model_version 조합별 집계. 순수 함수. */
export function aggregateByModel(rows: PredictionRow[]): ModelGroupStats[] {
  const groups = new Map<
    string,
    {
      scoringRule: string;
      modelVersion: string;
      rows: PredictionRow[];
      pairs: Array<{ p: number; y: number }>;
      correct: number;
      verified: number;
      firstSeen: string | null;
      lastSeen: string | null;
    }
  >();

  for (const row of rows) {
    const scoringRule = row.scoring_rule ?? '(null)';
    const key = `${scoringRule}__${row.model_version}`;
    const g = groups.get(key) ?? {
      scoringRule,
      modelVersion: row.model_version,
      rows: [] as PredictionRow[],
      pairs: [] as Array<{ p: number; y: number }>,
      correct: 0,
      verified: 0,
      firstSeen: null as string | null,
      lastSeen: null as string | null,
    };
    g.rows.push(row);
    const created = row.created_at;
    if (!g.firstSeen || created < g.firstSeen) g.firstSeen = created;
    if (!g.lastSeen || created > g.lastSeen) g.lastSeen = created;

    if (row.is_correct !== null) {
      g.verified++;
      if (row.is_correct) g.correct++;
    }

    // Brier pair 추출: verified + homeWinProb + game.winner_team_id 필요
    if (
      row.game &&
      row.game.winner_team_id !== null &&
      row.verified_at !== null
    ) {
      const p = extractHomeWinProb(row.reasoning);
      if (p !== null && p >= 0 && p <= 1) {
        const homeWon =
          row.game.winner_team_id === row.game.home_team_id ? 1 : 0;
        g.pairs.push({ p, y: homeWon });
      }
    }

    groups.set(key, g);
  }

  const result: ModelGroupStats[] = [];
  for (const [key, g] of groups) {
    let brier: number | null = null;
    let logLoss: number | null = null;
    if (g.pairs.length > 0) {
      let brierSum = 0;
      let logLossSum = 0;
      for (const { p, y } of g.pairs) {
        brierSum += (p - y) ** 2;
        const pc = clampProb(p);
        logLossSum += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
      }
      brier = brierSum / g.pairs.length;
      logLoss = logLossSum / g.pairs.length;
    }
    result.push({
      key,
      scoringRule: g.scoringRule,
      modelVersion: g.modelVersion,
      n: g.rows.length,
      verifiedN: g.verified,
      correctCount: g.correct,
      accuracy: g.verified > 0 ? g.correct / g.verified : 0,
      brierN: g.pairs.length,
      brier,
      logLoss,
      calibration: buildCalibration(g.pairs),
      firstSeen: g.firstSeen,
      lastSeen: g.lastSeen,
    });
  }

  // 최신 → 과거, 같은 시점이면 N 큰 순
  result.sort((a, b) => {
    if (a.lastSeen && b.lastSeen && a.lastSeen !== b.lastSeen) {
      return b.lastSeen.localeCompare(a.lastSeen);
    }
    return b.n - a.n;
  });
  return result;
}

/** 날짜 × scoringRule 별 accuracy 시계열. 30일 trend 차트용. */
export interface DailyStat {
  date: string;
  scoringRule: string;
  modelVersion: string;
  n: number;
  verified: number;
  correct: number;
  accuracy: number;
}

export function dailyByModel(rows: PredictionRow[]): DailyStat[] {
  const buckets = new Map<string, DailyStat>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const scoringRule = row.scoring_rule ?? '(null)';
    const key = `${date}__${scoringRule}__${row.model_version}`;
    const b = buckets.get(key) ?? {
      date,
      scoringRule,
      modelVersion: row.model_version,
      n: 0,
      verified: 0,
      correct: 0,
      accuracy: 0,
    };
    b.n++;
    if (row.is_correct !== null) {
      b.verified++;
      if (row.is_correct) b.correct++;
    }
    buckets.set(key, b);
  }
  const out = Array.from(buckets.values());
  for (const b of out) b.accuracy = b.verified > 0 ? b.correct / b.verified : 0;
  out.sort((a, b) =>
    a.date !== b.date
      ? a.date.localeCompare(b.date)
      : a.scoringRule.localeCompare(b.scoringRule),
  );
  return out;
}
