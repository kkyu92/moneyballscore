/**
 * stale-data snapshot formatter — plan #9 Step 4 (X2 데이터 갱신 cron).
 *
 * CLAUDE.md / TODOS.md 의 "scoring_rule 성과 (cycle N 갱신, YYYY-MM-DD 측정)" /
 * "요일별 누적" 류 stale 라인을 매주 자동 갱신할 source-of-truth markdown 생성.
 *
 * auto-commit risk 차단 패턴: CLAUDE.md / TODOS.md 직접 sed 갱신 X, 별도 snapshot 파일 박제.
 * 사용자 / 본 메인이 사이클 retro 시 snapshot 보고 수동 갱신.
 */

export interface PredRowMin {
  is_correct: boolean | null;
  scoring_rule: string | null;
  confidence: number | null;
  verified_at: string | null;
}

export interface StaleSnapshotInput {
  rows: PredRowMin[];
  generatedAt: Date;
  v18Target?: number;
}

export interface ScoringRuleStat {
  rule: string;
  total: number;
  correct: number;
  acc: number;
  brier: number;
}

export interface WeekdayStat {
  weekday: string;
  total: number;
  correct: number;
  acc: number;
}

export interface StaleSnapshot {
  generatedAt: string;
  totalVerified: number;
  totalCorrect: number;
  overallAcc: number;
  scoringRules: ScoringRuleStat[];
  weekdays: WeekdayStat[];
  v18Progress: {
    n: number;
    target: number;
    remaining: number;
    pct: number;
  };
  markdown: string;
}

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return (num / den) * 100;
}

function brierFor(rows: PredRowMin[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const r of rows) {
    const conf = r.confidence ?? 0.5;
    const target = r.is_correct ? 1 : 0;
    sum += (conf - target) ** 2;
  }
  return sum / rows.length;
}

export function buildStaleSnapshot(input: StaleSnapshotInput): StaleSnapshot {
  const { rows, generatedAt } = input;
  const v18Target = input.v18Target ?? 150;

  const verified = rows.filter((r) => r.is_correct !== null);
  const totalVerified = verified.length;
  const totalCorrect = verified.filter((r) => r.is_correct).length;
  const overallAcc = pct(totalCorrect, totalVerified);

  const ruleMap = new Map<string, PredRowMin[]>();
  for (const r of verified) {
    const rule = r.scoring_rule ?? "null";
    const arr = ruleMap.get(rule) ?? [];
    arr.push(r);
    ruleMap.set(rule, arr);
  }
  const scoringRules: ScoringRuleStat[] = [];
  const sortedRules = [...ruleMap.keys()].sort();
  for (const rule of sortedRules) {
    const ruleRows = ruleMap.get(rule)!;
    const correct = ruleRows.filter((r) => r.is_correct).length;
    scoringRules.push({
      rule,
      total: ruleRows.length,
      correct,
      acc: pct(correct, ruleRows.length),
      brier: brierFor(ruleRows),
    });
  }

  const dayMap = new Map<string, PredRowMin[]>();
  for (const r of verified) {
    if (!r.verified_at) continue;
    const dt = new Date(r.verified_at);
    if (Number.isNaN(dt.getTime())) continue;
    const day = DAYS_EN[dt.getUTCDay()];
    const arr = dayMap.get(day) ?? [];
    arr.push(r);
    dayMap.set(day, arr);
  }
  const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdays: WeekdayStat[] = [];
  for (const day of weekdayOrder) {
    const dayRows = dayMap.get(day);
    if (!dayRows) continue;
    const correct = dayRows.filter((r) => r.is_correct).length;
    weekdays.push({
      weekday: day,
      total: dayRows.length,
      correct,
      acc: pct(correct, dayRows.length),
    });
  }

  const v18Rows = verified.filter((r) => r.scoring_rule === "v1.8");
  const v18Progress = {
    n: v18Rows.length,
    target: v18Target,
    remaining: Math.max(0, v18Target - v18Rows.length),
    pct: pct(v18Rows.length, v18Target),
  };

  const isoDate = generatedAt.toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`# stale-data snapshot (${isoDate})`);
  lines.push("");
  lines.push(
    `plan #9 Step 4 (X2 데이터 갱신 cron) — CLAUDE.md / TODOS.md stale 라인 source-of-truth.`,
  );
  lines.push("");
  lines.push(`**총 n=${totalVerified}** (적중 ${totalCorrect} / ${overallAcc.toFixed(1)}%)`);
  lines.push("");
  lines.push(`## scoring_rule 성과`);
  lines.push("");
  if (scoringRules.length === 0) {
    lines.push(`(검증된 prediction 0건)`);
  } else {
    lines.push(`| rule | n | acc | Brier |`);
    lines.push(`|---|---|---|---|`);
    for (const s of scoringRules) {
      lines.push(`| ${s.rule} | ${s.total} | ${s.acc.toFixed(1)}% | ${s.brier.toFixed(4)} |`);
    }
    lines.push("");
    const oneLine = scoringRules
      .map((s) =>
        s.rule === "v1.8"
          ? `**v1.8(${s.total}건, ${s.acc.toFixed(1)}%, Brier ${s.brier.toFixed(4)})**`
          : `${s.rule}(${s.total}건, ${s.acc.toFixed(1)}%)`,
      )
      .join(" / ");
    lines.push(`CLAUDE.md 한줄 형식: ${oneLine}`);
  }
  lines.push("");
  lines.push(`## 요일별 누적`);
  lines.push("");
  if (weekdays.length === 0) {
    lines.push(`(verified_at 데이터 0건)`);
  } else {
    lines.push(`| 요일 | n | acc |`);
    lines.push(`|---|---|---|`);
    for (const w of weekdays) {
      lines.push(`| ${w.weekday} | ${w.total} | ${w.acc.toFixed(1)}% |`);
    }
    lines.push("");
    const oneLine = weekdays
      .map((w) => `${w.weekday} ${w.acc.toFixed(1)}%(${w.total})`)
      .join(" / ");
    lines.push(`CLAUDE.md 한줄 형식: ${oneLine}`);
  }
  lines.push("");
  lines.push(`## v2.0 가중치 upgrade 진행`);
  lines.push("");
  lines.push(
    `- v1.8 누적: **${v18Progress.n}/${v18Progress.target}건** (${v18Progress.pct.toFixed(1)}%)`,
  );
  lines.push(`- 잔여: ${v18Progress.remaining}건`);
  lines.push("");
  lines.push(`---`);
  lines.push("");
  lines.push(
    `자동 생성 — plan #9 Step 4 \`scripts/update-stale-data.ts\` (data-refresh-weekly cron). CLAUDE.md / TODOS.md 갱신은 본 snapshot 보고 수동 박제 — auto-commit risk 차단.`,
  );

  return {
    generatedAt: isoDate,
    totalVerified,
    totalCorrect,
    overallAcc,
    scoringRules,
    weekdays,
    v18Progress,
    markdown: lines.join("\n"),
  };
}
