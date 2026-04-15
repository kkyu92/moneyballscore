/**
 * 로컬 개발용 postview 드라이런 (Phase v4-3 Task 4)
 *
 * Claude API 크레딧 소비 없이 로컬 Ollama 백엔드로 runPostview 실행.
 * DB 쓰지 않음 — GameContext + ActualResult + OriginalPrediction 고정 fixture.
 *
 * 실행:
 *   LLM_BACKEND=ollama NODE_ENV=development pnpm tsx scripts/dev-postview.ts
 *
 * 검증 포인트:
 *   - postview.ts 오케스트레이터 (홈/원정 병렬 + 심판 순차) 실행되는지
 *   - factorErrors가 실제 factor 이름을 지목하는지 (예: home_bullpen_fip)
 *   - LLM 실패 시 deriveFactorErrorsFallback 동작하는지
 *   - pre_game reasoning을 프롬프트에 주입하고 "놓친 것"을 언급하는지
 */

import { runPostview, type ActualResult, type OriginalPrediction } from '../packages/kbo-data/src/agents/postview';
import type { GameContext } from '../packages/kbo-data/src/agents/types';
import type { TeamCode } from '../packages/shared/src/index';

const backend = process.env.LLM_BACKEND ?? 'claude';
if (backend !== 'ollama') {
  console.warn('⚠️  LLM_BACKEND=ollama 권장 (크레딧 절약)');
  console.warn('   현재: backend=' + backend);
  console.warn('');
}

const home: TeamCode = 'LG';
const away: TeamCode = 'OB';

const context: GameContext = {
  game: {
    date: new Date().toISOString().slice(0, 10),
    homeTeam: home,
    awayTeam: away,
    gameTime: '18:30',
    stadium: '잠실',
    homeSP: '홈 선발',
    awaySP: '원정 선발',
    status: 'final',
    externalGameId: `DEV-PV-${home}-${away}`,
  },
  homeSPStats: {
    name: '홈 선발',
    team: home,
    fip: 3.42,
    xfip: 3.65,
    era: 3.30,
    innings: 85,
    war: 2.5,
    kPer9: 8.5,
  },
  awaySPStats: {
    name: '원정 선발',
    team: away,
    fip: 4.10,
    xfip: 4.25,
    era: 4.15,
    innings: 80,
    war: 1.8,
    kPer9: 7.2,
  },
  homeTeamStats: { team: home, woba: 0.340, bullpenFip: 3.85, totalWar: 18.0, sfr: 2.0 },
  awayTeamStats: { team: away, woba: 0.325, bullpenFip: 4.20, totalWar: 15.5, sfr: -0.5 },
  homeElo: { team: home, elo: 1555, winPct: 0.58 },
  awayElo: { team: away, elo: 1490, winPct: 0.49 },
  headToHead: { wins: 6, losses: 5 },
  homeRecentForm: 0.65,
  awayRecentForm: 0.45,
  parkFactor: 1.02,
};

// 시나리오: pre_game은 LG 58% 승리 예측했지만 실제로는 두산이 역전승
const actual: ActualResult = {
  homeScore: 4,
  awayScore: 7,
  winnerCode: away, // 두산 역전승 — pre_game이 틀림
};

const original: OriginalPrediction = {
  predictedWinner: home,
  homeWinProb: 0.58,
  factors: {
    home_sp_fip: 0.62,       // 홈 유리 편향 (0.5 대비 +0.12)
    home_lineup_woba: 0.58,  // 홈 약간 유리
    home_bullpen_fip: 0.65,  // 홈 유리 편향 — 실제로는 불펜이 블론
    away_recent_form: 0.40,  // 원정 약간 불리
    head_to_head_rate: 0.55, // h2h 약간 홈 유리
    park_factor: 0.51,       // 잠실 중립
    home_war_total: 0.60,    // 홈 유리
  },
  reasoning:
    'LG가 선발 임찬규의 FIP 3.42로 우위, 두산 곽빈 대비 0.68 차이. ' +
    '홈 불펜 FIP 3.85도 안정적. 최근폼 65% vs 45%로 LG 상승세. ' +
    '잠실 홈 이점까지 감안하면 LG가 58% 승리 확률. 핵심은 선발 매치업.',
};

console.log(`[dev-postview] ${away} @ ${home} — backend=${backend}`);
console.log(`[dev-postview] 스코어: ${home} ${actual.homeScore} - ${actual.awayScore} ${away}`);
console.log(`[dev-postview] pre_game 예측: ${original.predictedWinner} ${Math.round(original.homeWinProb * 100)}% — 실제로는 ${actual.winnerCode} 승리 (틀림)`);
console.log('[dev-postview] 실행 시작 (Ollama는 1~3분 소요)...');
console.log('---');

const started = Date.now();

runPostview(context, actual, original)
  .then((result) => {
    const durationSec = ((Date.now() - started) / 1000).toFixed(1);
    console.log('---');
    console.log(`[dev-postview] 완료 (${durationSec}s, ${result.totalTokens} tokens)`);
    console.log('');
    console.log('## 홈 postview');
    console.log(`요약: ${result.homePostview.summary}`);
    console.log(`핵심 factor: ${result.homePostview.keyFactor}`);
    console.log(`pre_game이 놓친 것: ${result.homePostview.missedBy}`);
    console.log('');
    console.log('## 원정 postview');
    console.log(`요약: ${result.awayPostview.summary}`);
    console.log(`핵심 factor: ${result.awayPostview.keyFactor}`);
    console.log(`pre_game이 놓친 것: ${result.awayPostview.missedBy}`);
    console.log('');
    console.log('## 심판 factor-attribution');
    if (result.factorErrors.length === 0) {
      console.log('(factorErrors 없음 — fallback 경로 확인 필요)');
    } else {
      for (const fe of result.factorErrors) {
        console.log(`- ${fe.factor} (편향 ${fe.predictedBias >= 0 ? '+' : ''}${fe.predictedBias.toFixed(3)})`);
        console.log(`  → ${fe.diagnosis}`);
      }
    }
    console.log('');
    console.log('## 심판 reasoning (블로그용)');
    console.log(result.judgeReasoning);
    console.log('');
    console.log('## 검증 체크');
    console.log(`- 홈/원정 postview 둘 다 요약 생성됨: ${result.homePostview.summary.length > 0 && result.awayPostview.summary.length > 0}`);
    console.log(`- factorErrors 개수: ${result.factorErrors.length} (목표: 1~3)`);
    const mentionsFactorNames = result.factorErrors.some((fe) =>
      Object.keys(original.factors).includes(fe.factor)
    );
    console.log(`- factorErrors가 실제 factor 이름 지목: ${mentionsFactorNames}`);
    console.log(`- judgeReasoning 길이: ${result.judgeReasoning.length}자 (목표: 200자 이상)`);
  })
  .catch((err) => {
    console.error('[dev-postview] 실패:', err);
    process.exit(1);
  });
