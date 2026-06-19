import { KBO_TEAMS, errMsg } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { buildAgentContext, renderContextForLLM } from '../context/agent-context';
import { callLLM } from './llm';
import { BASE_PROMPT, HOME_ROLE, AWAY_ROLE, RESPONSE_FORMAT } from './personas';
import { validateTeamArgument, resolveValidationMode } from './validator';
import { logValidatorEvent } from './validator-logger';
import { getRivalryBlock } from './rivalry-memory';
import type { GameContext, TeamArgument, AgentResult } from './types';

function buildSystemPrompt(team: TeamCode, role: 'home' | 'away'): string {
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

export function buildUserMessage(
  team: TeamCode,
  context: GameContext,
  rivalryBlock?: string
): string {
  const isHome = context.game.homeTeam === team;
  const myTeam = isHome ? context.game.homeTeam : context.game.awayTeam;
  const opponent = isHome ? context.game.awayTeam : context.game.homeTeam;
  const myStats = isHome ? context.homeTeamStats : context.awayTeamStats;
  const oppStats = isHome ? context.awayTeamStats : context.homeTeamStats;
  const mySP = isHome ? context.homeSPStats : context.awaySPStats;
  const oppSP = isHome ? context.awaySPStats : context.homeSPStats;
  const myElo = isHome ? context.homeElo : context.awayElo;
  const oppElo = isHome ? context.awayElo : context.homeElo;
  const myForm = isHome ? context.homeRecentForm : context.awayRecentForm;
  const oppForm = isHome ? context.awayRecentForm : context.homeRecentForm;

  // plan #23 Step 5 wave 44 (cycle 1233): context layer 통합 — production weight>0 메트릭 +
  // 도메인 hint (구장 / 라이벌리 / 시즌 / 시간 윈도우) 표준 ContextPayload prepend.
  // 기존 inline 데이터 박제 (선발/wOBA/Elo 등) 는 후방 호환 유지.
  const contextBlock = `${renderContextForLLM(buildAgentContext(context))}\n\n`;

  return `${contextBlock}오늘 경기: ${KBO_TEAMS[context.game.awayTeam].name} @ ${KBO_TEAMS[context.game.homeTeam].name}
구장: ${context.game.stadium} | 시간: ${context.game.gameTime}
${isHome ? '홈' : '원정'} 경기입니다.

[${KBO_TEAMS[myTeam].name} 데이터]
선발투수: ${mySP ? `${mySP.name} (FIP ${mySP.fip}, xFIP ${mySP.xfip}, K/9 ${mySP.kPer9})` : '미확정'}
팀 wOBA: ${myStats.woba} | 불펜 FIP: ${myStats.bullpenFip} | WAR: ${myStats.totalWar}
수비 SFR: ${myStats.sfr} | Elo: ${myElo.elo} | 최근폼: ${Math.round(myForm * 100)}%

[${KBO_TEAMS[opponent].name} 데이터]
선발투수: ${oppSP ? `${oppSP.name} (FIP ${oppSP.fip}, xFIP ${oppSP.xfip}, K/9 ${oppSP.kPer9})` : '미확정'}
팀 wOBA: ${oppStats.woba} | 불펜 FIP: ${oppStats.bullpenFip} | WAR: ${oppStats.totalWar}
수비 SFR: ${oppStats.sfr} | Elo: ${oppElo.elo} | 최근폼: ${Math.round(oppForm * 100)}%

상대전적: ${context.headToHead.wins}승 ${context.headToHead.losses}패
파크팩터: ${context.parkFactor}
${rivalryBlock && rivalryBlock.trim().length > 0 ? '\n' + rivalryBlock + '\n' : ''}
${KBO_TEAMS[myTeam].name}의 관점에서 분석하세요.`;
}

function parseResponse(text: string, team: TeamCode): TeamArgument {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      team,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      opponentWeaknesses: Array.isArray(parsed.opponentWeaknesses) ? parsed.opponentWeaknesses.slice(0, 3) : [],
      keyFactor: String(parsed.keyFactor || ''),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      reasoning: String(parsed.reasoning || '').slice(0, 500),
    };
  } catch {
    return {
      team,
      strengths: ['데이터 분석 중'],
      opponentWeaknesses: [],
      keyFactor: '종합 전력',
      confidence: 0.5,
      reasoning: text.slice(0, 200),
    };
  }
}

/**
 * 특정 팀의 에이전트를 실행하여 논거를 생성.
 * - BASE_PROMPT + HOME_ROLE/AWAY_ROLE + rivalry block 주입
 * - parseResponse 후 validator Layer 1 (mode = resolveValidationMode())
 * - 임계 초과 시 AgentResult.success=false → debate.ts fallback 처리
 *   (strict: hard>0 OR warn>2 / lenient: hard>0 OR warn>5)
 */
export async function runTeamAgent(
  team: TeamCode,
  context: GameContext
): Promise<AgentResult<TeamArgument>> {
  const role: 'home' | 'away' = context.game.homeTeam === team ? 'home' : 'away';

  // rivalry-memory 주입 (과거 h2h + agent_memories Compound 학습 읽기 경로).
  // 실패 시 빈 블록 반환 — throw 가능성 없음.
  const rivalry = await getRivalryBlock({
    homeTeam: context.game.homeTeam,
    awayTeam: context.game.awayTeam,
    date: context.game.date,
  });

  const result = await callLLM<TeamArgument>(
    {
      model: 'haiku',
      systemPrompt: buildSystemPrompt(team, role),
      userMessage: buildUserMessage(team, context, rivalry.promptBlock),
      maxTokens: 800,
    },
    (text) => parseResponse(text, team)
  );

  // Validator Layer 1 — 성공 응답에만 적용
  // mode: NODE_ENV=production이면 무조건 strict (env leak 차단)
  if (result.success && result.data) {
    const mode = resolveValidationMode();
    const validation = validateTeamArgument(result.data, context, mode);

    // near-miss 도 박제. validation.ok=true 라도 violations.length > 0 면 silent drift 사전 감지.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gameId = (context.game as any).id ?? null;
    if (validation.violations.length > 0) {
      logValidatorEvent({
        gameId,
        teamCode: team,
        agent: 'team',
        backend: result.model,
        passed: validation.ok,
        violations: validation.violations,
      }).catch((e) => console.warn('[validator_logs] unexpected error:', errMsg(e)));
    }

    if (!validation.ok) {
      const summary = validation.violations
        .map((v) => `${v.type}:${v.severity} (${v.detail})`)
        .join(' | ');
      console.warn(`[Validator] ${team} reject: ${summary}`);

      return {
        ...result,
        success: false,
        data: null,
        error: `validator: ${summary}`,
      };
    }
  }

  return result;
}
