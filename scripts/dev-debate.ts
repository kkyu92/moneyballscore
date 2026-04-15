/**
 * 로컬 개발용 에이전트 토론 드라이런 (Phase v4-2.5)
 *
 * Claude API 크레딧 소비 없이 로컬 Ollama 백엔드로 runDebate 실행.
 * DB 쓰지 않음 — 순수하게 프롬프트 조립 + LLM 호출 + validator + verdict 출력.
 *
 * 실행:
 *   LLM_BACKEND=ollama pnpm tsx scripts/dev-debate.ts [homeTeam] [awayTeam]
 *
 * 예:
 *   LLM_BACKEND=ollama pnpm tsx scripts/dev-debate.ts LG OB
 *   LLM_BACKEND=ollama pnpm tsx scripts/dev-debate.ts SK HT
 *
 * 팀 코드: SK HT LG OB KT SS LT HH NC WO
 *
 * 사전 조건:
 *   - Ollama 서비스 실행 중 (http://localhost:11434)
 *   - exaone3.5:7.8b 모델 pull 완료
 *   - qwen2.5:14b 모델 pull 완료
 */

import { runDebate } from '../packages/kbo-data/src/agents/debate';
import type { GameContext } from '../packages/kbo-data/src/agents/types';
import type { PredictionHistory } from '../packages/kbo-data/src/agents/calibration-agent';
import type { TeamCode } from '../packages/shared/src/index';

const VALID_TEAMS: TeamCode[] = ['SK', 'HT', 'LG', 'OB', 'KT', 'SS', 'LT', 'HH', 'NC', 'WO'];

function isValidTeam(code: string): code is TeamCode {
  return VALID_TEAMS.includes(code as TeamCode);
}

const homeArg = process.argv[2] ?? 'LG';
const awayArg = process.argv[3] ?? 'OB';

if (!isValidTeam(homeArg) || !isValidTeam(awayArg)) {
  console.error(`Invalid team code. 사용 가능: ${VALID_TEAMS.join(', ')}`);
  process.exit(1);
}

const home: TeamCode = homeArg;
const away: TeamCode = awayArg;

const backend = process.env.LLM_BACKEND ?? 'claude';
if (backend !== 'ollama') {
  console.warn('⚠️  LLM_BACKEND=ollama 권장 (크레딧 절약)');
  console.warn('   현재: backend=' + backend + '. Claude API 호출됨.');
  console.warn('');
}

// 고정 fixture — 실제 스크래퍼 대신 대표 수치 사용
const context: GameContext = {
  game: {
    date: new Date().toISOString().slice(0, 10),
    homeTeam: home,
    awayTeam: away,
    gameTime: '18:30',
    stadium: '테스트 구장',
    homeSP: '홈 선발',
    awaySP: '원정 선발',
    status: 'scheduled',
    externalGameId: `DEV-${home}-${away}`,
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

const history: PredictionHistory = {
  totalPredictions: 15,
  correctPredictions: 9,
  recentResults: [],
  homeTeamAccuracy: 0.62,
  awayTeamAccuracy: 0.55,
  teamAccuracy: {},
};

const quantitativeProb = 0.58;

console.log(`[dev-debate] ${away} @ ${home} — backend=${backend}`);
console.log(`[dev-debate] 정량 모델 홈 승률: ${Math.round(quantitativeProb * 100)}%`);
console.log('[dev-debate] 실행 시작 (Ollama는 5~30초 소요, 첫 호출은 모델 로딩으로 더 오래)...');
console.log('---');

const started = Date.now();

runDebate(context, quantitativeProb, history)
  .then((result) => {
    const durationSec = ((Date.now() - started) / 1000).toFixed(1);
    console.log('---');
    console.log(`[dev-debate] 완료 (${durationSec}s, ${result.totalTokens} tokens)`);
    console.log('');
    console.log('## 홈 에이전트');
    console.log(`신뢰도 ${Math.round(result.homeArgument.confidence * 100)}%`);
    console.log(`강점: ${result.homeArgument.strengths.join(', ')}`);
    console.log(`상대 약점: ${result.homeArgument.opponentWeaknesses.join(', ')}`);
    console.log(`핵심 팩터: ${result.homeArgument.keyFactor}`);
    console.log(`논거: ${result.homeArgument.reasoning}`);
    console.log('');
    console.log('## 원정 에이전트');
    console.log(`신뢰도 ${Math.round(result.awayArgument.confidence * 100)}%`);
    console.log(`강점: ${result.awayArgument.strengths.join(', ')}`);
    console.log(`상대 약점: ${result.awayArgument.opponentWeaknesses.join(', ')}`);
    console.log(`핵심 팩터: ${result.awayArgument.keyFactor}`);
    console.log(`논거: ${result.awayArgument.reasoning}`);
    console.log('');
    console.log('## 회고 보정');
    console.log(`recentBias: ${result.calibration.recentBias ?? 'null'}`);
    console.log(`teamSpecific: ${result.calibration.teamSpecific ?? 'null'}`);
    console.log(`modelWeakness: ${result.calibration.modelWeakness ?? 'null'}`);
    console.log(`adjustmentSuggestion: ${result.calibration.adjustmentSuggestion}`);
    console.log('');
    console.log('## 최종 심판');
    console.log(`승자: ${result.verdict.predictedWinner} ${Math.round(result.verdict.homeWinProb * 100)}%`);
    console.log(`신뢰도: ${Math.round(result.verdict.confidence * 100)}%`);
    console.log(`홈 요약: ${result.verdict.homeArgSummary}`);
    console.log(`원정 요약: ${result.verdict.awayArgSummary}`);
    console.log(`보정 적용: ${result.verdict.calibrationApplied ?? 'null'}`);
    console.log('');
    console.log(`## 판정 reasoning`);
    console.log(result.verdict.reasoning);
  })
  .catch((err) => {
    console.error('[dev-debate] 실패:', err);
    process.exit(1);
  });
