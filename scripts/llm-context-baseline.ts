/**
 * LLM Agent Context Layer baseline 측정 — plan #23 Step 4 통합 sample.
 *
 * 도입 동기 (cycle 1229, 2026-06-19):
 *   Step 4 measurement harness (`measureContextTokenBudget` / `measureHallucinations`)
 *   가 ship 후 (cycle 1228) 실제 운영 cohort 통합 측정 전 baseline 박제 필요.
 *   본 script = 대표적 GameContext fixture → buildAgentContext → renderContextForLLM
 *   결과를 측정해 baseline artifact 박제 (실측 LLM 호출 X — context layer 자체 시작점).
 *
 * 출력: apps/moneyball/data/llm-context-baseline/<date>-baseline-cycle-<n>.md
 */
import { writeFileSync } from 'node:fs';
import {
  buildAgentContext,
  renderContextForLLM,
} from '../packages/kbo-data/src/context/agent-context';
import {
  estimatePromptTokens,
  measureContextTokenBudget,
  measureHallucinations,
} from '../packages/kbo-data/src/context/measurement';
import type { GameContext } from '../packages/kbo-data/src/agents/types';

interface Sample {
  label: string;
  ctx: GameContext;
}

function makeSample(
  label: string,
  overrides: Partial<GameContext> = {},
): Sample {
  const base: GameContext = {
    game: {
      date: '2026-06-19',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '엘선발',
      awaySP: '두선발',
      status: 'scheduled',
      externalGameId: `BASELINE-${label}`,
    },
    homeSPStats: { name: '엘선발', team: 'LG', fip: 3.40, xfip: 3.80, war: 2.1, era: 3.20, innings: 80, kPer9: 8.5 },
    awaySPStats: { name: '두선발', team: 'OB', fip: 4.10, xfip: 4.20, war: 1.5, era: 4.00, innings: 75, kPer9: 7.4 },
    homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 3.80, totalWar: 25.0, sfr: 5 },
    awayTeamStats: { team: 'OB', woba: 0.310, bullpenFip: 4.20, totalWar: 18.0, sfr: -3 },
    homeElo: { team: 'LG', elo: 1560, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1490, winPct: 0.48 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    headToHead: { wins: 3, losses: 2 },
    parkFactor: 0.95,
  };
  return { label, ctx: { ...base, ...overrides } };
}

const samples: Sample[] = [
  makeSample('typical-LG-OB-잠실'),
  makeSample('SP-missing', {
    game: {
      date: '2026-06-19',
      homeTeam: 'LT',
      awayTeam: 'KT',
      gameTime: '18:30',
      stadium: '사직',
      homeSP: null,
      awaySP: null,
      status: 'scheduled',
      externalGameId: 'BASELINE-NO-SP',
    },
    homeSPStats: null,
    awaySPStats: null,
  }),
  makeSample('rivalry-HT-NC', {
    game: {
      date: '2026-06-19',
      homeTeam: 'HT',
      awayTeam: 'NC',
      gameTime: '18:30',
      stadium: '광주',
      homeSP: '나선발',
      awaySP: '엔선발',
      status: 'scheduled',
      externalGameId: 'BASELINE-HT-NC',
    },
    homeTeamStats: { team: 'HT', woba: 0.330, bullpenFip: 3.80, totalWar: 25.0, sfr: 5 },
    awayTeamStats: { team: 'NC', woba: 0.310, bullpenFip: 4.20, totalWar: 18.0, sfr: -3 },
    homeElo: { team: 'HT', elo: 1560, winPct: 0.58 },
    awayElo: { team: 'NC', elo: 1490, winPct: 0.48 },
  }),
  makeSample('h2h-empty', { headToHead: { wins: 0, losses: 0 } }),
  makeSample('extreme-form', {
    homeRecentForm: 0.95,
    awayRecentForm: 0.05,
  }),
];

function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error('usage: pnpm tsx scripts/llm-context-baseline.ts <out-path>');
    process.exit(1);
  }

  const today = new Date();
  const lines: string[] = [];
  lines.push(`# LLM Agent Context Layer baseline (${today.toISOString().slice(0, 10)})`);
  lines.push('');
  lines.push('plan #23 Step 4 measurement harness baseline — `buildAgentContext` + `renderContextForLLM` 출력의 token budget (1200 limit) + hallucination 측정.');
  lines.push('');
  lines.push('실측 LLM 호출 X — context layer 자체가 budget 안 들어가는지 확인용 시작점.');
  lines.push('');
  lines.push('## sample 별 측정');
  lines.push('');
  lines.push('| sample | chars | tokens (추정) | budget | ratio | within | hallucination rate |');
  lines.push('|---|---|---|---|---|---|---|');

  const tokensList: number[] = [];
  const ratiosList: number[] = [];

  for (const s of samples) {
    const ac = buildAgentContext(s.ctx, today);
    const tb = measureContextTokenBudget(ac);
    const rendered = renderContextForLLM(ac);
    const hStats = measureHallucinations(rendered);
    tokensList.push(tb.estimated_tokens);
    ratiosList.push(tb.ratio);
    lines.push(
      `| ${s.label} | ${tb.char_count} | ${tb.estimated_tokens} | ${tb.budget} | ${tb.ratio.toFixed(2)} | ${tb.within_budget ? '✅' : '❌'} | ${hStats.rate.toFixed(3)} (${hStats.invalid}/${hStats.total}) |`,
    );
  }

  const avgTokens = tokensList.reduce((a, b) => a + b, 0) / tokensList.length;
  const maxTokens = Math.max(...tokensList);
  const minTokens = Math.min(...tokensList);
  const avgRatio = ratiosList.reduce((a, b) => a + b, 0) / ratiosList.length;

  lines.push('');
  lines.push('## 집계');
  lines.push('');
  lines.push(`- sample 수: ${samples.length}`);
  lines.push(`- 평균 token: ${avgTokens.toFixed(0)}`);
  lines.push(`- max token: ${maxTokens}`);
  lines.push(`- min token: ${minTokens}`);
  lines.push(`- 평균 budget ratio: ${avgRatio.toFixed(2)}`);
  lines.push(`- 모든 sample budget 안: ${ratiosList.every((r) => r <= 1) ? '✅' : '❌'}`);
  lines.push('');
  lines.push('## 다음 측정 후속');
  lines.push('');
  lines.push('- 실제 운영 agent (judge / postview / team / personas / debate / calibration / rivalry-memory) 통합 후 측정');
  lines.push('- LLM 응답 cohort 수집 → `measureHallucinations` 실측 (synthetic X)');
  lines.push('- v1.8 → v2.0 weight transition 후 weight 변화량 측정');
  lines.push('- pre/post Brier delta (Context Layer 도입 전후) — Context Layer 통합 후 cohort wait');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('자동 생성 — plan #23 Step 4 baseline (cycle 1229).');

  writeFileSync(outPath, lines.join('\n') + '\n');
  console.error(`saved: ${outPath}`);
}

main();
