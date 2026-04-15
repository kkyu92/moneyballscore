/**
 * DeepSeek vs Claude 품질 비교 (1회성 테스트)
 *
 * validator를 우회하고 raw LLM 출력을 직접 수집.
 * 동일 GameContext로 두 백엔드 호출 → 환각 수치·선수명 발명 직접 세어봄.
 *
 * 실행:
 *   env DEEPSEEK_API_KEY=... ANTHROPIC_API_KEY=... npx tsx scripts/dev-backend-compare.ts
 */

import { callLLM } from '../packages/kbo-data/src/agents/llm';
import { BASE_PROMPT, HOME_ROLE, AWAY_ROLE, RESPONSE_FORMAT } from '../packages/kbo-data/src/agents/personas';
import { KBO_TEAMS } from '../packages/shared/src';
import type { GameContext, TeamArgument } from '../packages/kbo-data/src/agents/types';
import {
  checkHallucinatedNumbers,
  checkInventedPlayerNames,
  buildInjectionText,
} from '../packages/kbo-data/src/agents/validator';

const context: GameContext = {
  game: {
    date: '2026-04-15',
    homeTeam: 'LG',
    awayTeam: 'OB',
    gameTime: '18:30',
    stadium: '잠실',
    homeSP: '임찬규',
    awaySP: '곽빈',
    status: 'scheduled',
    externalGameId: 'DEV-LG-OB',
  },
  homeSPStats: { name: '임찬규', team: 'LG', fip: 3.42, xfip: 3.65, era: 3.3, innings: 85, war: 2.5, kPer9: 8.5 },
  awaySPStats: { name: '곽빈', team: 'OB', fip: 4.10, xfip: 4.25, era: 4.15, innings: 80, war: 1.8, kPer9: 7.2 },
  homeTeamStats: { team: 'LG', woba: 0.340, bullpenFip: 3.85, totalWar: 18.0, sfr: 2.0 },
  awayTeamStats: { team: 'OB', woba: 0.325, bullpenFip: 4.20, totalWar: 15.5, sfr: -0.5 },
  homeElo: { team: 'LG', elo: 1555, winPct: 0.58 },
  awayElo: { team: 'OB', elo: 1490, winPct: 0.49 },
  headToHead: { wins: 6, losses: 5 },
  homeRecentForm: 0.65,
  awayRecentForm: 0.45,
  parkFactor: 1.02,
};

function buildSystemPrompt(team: 'LG' | 'OB', role: 'home' | 'away'): string {
  const teamInfo = KBO_TEAMS[team];
  const roleBlock = role === 'home' ? HOME_ROLE : AWAY_ROLE;
  return [
    BASE_PROMPT,
    roleBlock,
    [
      '## 할당',
      `팀: ${teamInfo.name} (${team})`,
      `구장: ${teamInfo.stadium}`,
      `파크팩터: ${teamInfo.parkPf} (${teamInfo.parkNote})`,
      `역할: ${role === 'home' ? '홈팀' : '원정팀'}`,
    ].join('\n'),
    RESPONSE_FORMAT,
  ].join('\n\n');
}

function buildUserMessage(team: 'LG' | 'OB'): string {
  const isHome = team === 'LG';
  const myName = KBO_TEAMS[team].name;
  return `오늘 경기: 두산 베어스 @ LG 트윈스
구장: 잠실 | 시간: 18:30
${isHome ? '홈' : '원정'} 경기입니다.

[LG 트윈스 데이터]
선발투수: 임찬규 (FIP 3.42, xFIP 3.65, K/9 8.5)
팀 wOBA: 0.34 | 불펜 FIP: 3.85 | WAR: 18
수비 SFR: 2 | Elo: 1555 | 최근폼: 65%

[두산 베어스 데이터]
선발투수: 곽빈 (FIP 4.1, xFIP 4.25, K/9 7.2)
팀 wOBA: 0.325 | 불펜 FIP: 4.2 | WAR: 15.5
수비 SFR: -0.5 | Elo: 1490 | 최근폼: 45%

상대전적: 6승 5패
파크팩터: 1.02

${myName}의 관점에서 분석하세요.`;
}

function parseResponse(text: string): TeamArgument | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      team: 'LG',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      opponentWeaknesses: Array.isArray(parsed.opponentWeaknesses) ? parsed.opponentWeaknesses.slice(0, 3) : [],
      keyFactor: String(parsed.keyFactor || ''),
      confidence: Number(parsed.confidence) || 0.5,
      reasoning: String(parsed.reasoning || ''),
    };
  } catch {
    return null;
  }
}

function scoreOutput(text: string, parsed: TeamArgument | null, ctx: GameContext, label: string) {
  console.log(`\n=== ${label} ===`);

  if (!parsed) {
    console.log('❌ JSON 파싱 실패');
    console.log('Raw:', text.slice(0, 500));
    return;
  }

  const outputText = [parsed.reasoning, parsed.keyFactor, ...parsed.strengths, ...parsed.opponentWeaknesses].join(' ');
  const injection = buildInjectionText(ctx);

  const hallucinated = checkHallucinatedNumbers(outputText, injection);
  const invented = checkInventedPlayerNames(outputText, ctx);

  console.log(`strengths (${parsed.strengths.length}):`, parsed.strengths);
  console.log(`opponentWeaknesses (${parsed.opponentWeaknesses.length}):`, parsed.opponentWeaknesses);
  console.log(`keyFactor: ${parsed.keyFactor}`);
  console.log(`confidence: ${parsed.confidence}`);
  console.log(`reasoning (${parsed.reasoning.length}자):`, parsed.reasoning);
  console.log(`\n검증 지표:`);
  console.log(`  환각 수치: ${hallucinated.length}건 ${hallucinated.length > 0 ? '❌ ' + hallucinated[0].detail : '✅'}`);
  console.log(`  선수명 발명: ${invented.length}건 ${invented.length > 0 ? '❌ ' + invented[0].detail : '✅'}`);
}

(async () => {
  console.log('=== LG 팀 에이전트 (홈) — 백엔드 비교 ===\n');

  const systemPrompt = buildSystemPrompt('LG', 'home');
  const userMessage = buildUserMessage('LG');

  // DeepSeek 호출
  process.env.LLM_BACKEND = 'deepseek';
  console.log('[DeepSeek] 호출 중...');
  const t1 = Date.now();
  const deepseekResult = await callLLM<string>(
    { model: 'haiku', systemPrompt, userMessage, maxTokens: 800 },
    (text) => text
  );
  const deepseekTime = ((Date.now() - t1) / 1000).toFixed(1);
  console.log(`[DeepSeek] ${deepseekTime}s, ${deepseekResult.tokensUsed} tokens, success=${deepseekResult.success}`);

  // Claude 호출
  process.env.LLM_BACKEND = 'claude';
  console.log('\n[Claude] 호출 중...');
  const t2 = Date.now();
  const claudeResult = await callLLM<string>(
    { model: 'haiku', systemPrompt, userMessage, maxTokens: 800 },
    (text) => text
  );
  const claudeTime = ((Date.now() - t2) / 1000).toFixed(1);
  console.log(`[Claude] ${claudeTime}s, ${claudeResult.tokensUsed} tokens, success=${claudeResult.success}`);

  // 결과 비교
  if (deepseekResult.success && deepseekResult.data) {
    scoreOutput(deepseekResult.data, parseResponse(deepseekResult.data), context, 'DeepSeek V3');
  }
  if (claudeResult.success && claudeResult.data) {
    scoreOutput(claudeResult.data, parseResponse(claudeResult.data), context, 'Claude Haiku 4.5');
  }

  console.log('\n=== 요약 ===');
  console.log(`DeepSeek: ${deepseekTime}s, ${deepseekResult.tokensUsed} tokens`);
  console.log(`Claude: ${claudeTime}s, ${claudeResult.tokensUsed} tokens`);
})();
