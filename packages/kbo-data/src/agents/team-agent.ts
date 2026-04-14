import { KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { callLLM } from './llm';
import type { GameContext, TeamArgument, AgentResult } from './types';

// 팀별 특화 컨텍스트 (축적 가능한 메모리)
const TEAM_PROFILES: Record<TeamCode, string> = {
  SK: 'SSG 랜더스. 인천 문학 홈. 강력한 수비(SFR 상위). 좌투 에이스 보유.',
  HT: 'KIA 타이거즈. 광주 홈. 양현종 등 베테랑 투수진. 타선 폭발력.',
  LG: 'LG 트윈스. 잠실 홈(두산과 공유). 균형잡힌 전력. 홈 성적 강세.',
  OB: '두산 베어스. 잠실 홈. 젊은 타선. 불펜 깊이.',
  KT: 'KT 위즈. 수원 홈. 안타 제조기 타선. 투수 안정성.',
  SS: '삼성 라이온즈. 대구 홈. 파크팩터 높음(타자 유리). 외국인 타자 핵심.',
  LT: '롯데 자이언츠. 사직 홈. 팬 열기. 투수진 재건 중.',
  HH: '한화 이글스. 대전 홈. 젊은 유망주. 문동주 등 선발진 성장.',
  NC: 'NC 다이노스. 창원 홈. 안정적 운영. 중위권 전력.',
  WO: '키움 히어로즈. 고척돔 홈(파크팩터 낮음). 안우진 등 선발 에이스급.',
};

function buildSystemPrompt(team: TeamCode): string {
  const teamInfo = KBO_TEAMS[team];
  const profile = TEAM_PROFILES[team];

  return `당신은 ${teamInfo.name}의 전문 분석가입니다.
${profile}

당신의 역할:
1. 자기 팀(${teamInfo.name})의 강점을 데이터로 강조하세요.
2. 상대 팀의 약점을 구체적으로 지적하세요.
3. 가장 결정적인 팩터 하나를 선택하세요.
4. 자기 팀 승리 확신도를 0~1로 평가하세요.

반드시 JSON 형식으로 응답하세요:
{
  "strengths": ["강점1", "강점2", "강점3"],
  "opponentWeaknesses": ["약점1", "약점2"],
  "keyFactor": "가장 결정적 팩터",
  "confidence": 0.65,
  "reasoning": "200자 이내 종합 논거"
}

규칙:
- 데이터에 근거하세요. 감정이 아닌 숫자로 주장.
- 상대 팀 에이전트가 반박할 것입니다. 가장 강한 논거를 제시하세요.
- confidence는 데이터가 뒷받침하는 만큼만. 과대평가 금지.`;
}

function buildUserMessage(team: TeamCode, context: GameContext): string {
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

  return `오늘 경기: ${KBO_TEAMS[context.game.awayTeam].name} @ ${KBO_TEAMS[context.game.homeTeam].name}
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

${KBO_TEAMS[myTeam].name}의 관점에서 분석하세요.`;
}

function parseResponse(text: string, team: TeamCode): TeamArgument {
  try {
    // JSON 추출 (텍스트에 JSON이 포함된 경우)
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
    // 파싱 실패 시 기본값
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
 * 특정 팀의 에이전트를 실행하여 논거를 생성
 */
export async function runTeamAgent(
  team: TeamCode,
  context: GameContext
): Promise<AgentResult<TeamArgument>> {
  return callLLM<TeamArgument>(
    {
      model: 'haiku',
      systemPrompt: buildSystemPrompt(team),
      userMessage: buildUserMessage(team, context),
      maxTokens: 800,
    },
    (text) => parseResponse(text, team)
  );
}
