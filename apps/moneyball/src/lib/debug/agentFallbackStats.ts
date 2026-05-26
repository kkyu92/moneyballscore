// cycle 986 — /debug/agent-fallback dashboard 데이터 가공.
// predictions.reasoning.debate 직접 read 후 분류:
//   fullDebate (judge+homeArg+awayArg 모두 정상) /
//   agentsFailed (debate.agentsFailed=true) /
//   quantOnly ("에이전트 토론 불가" fallback)
// agentError 카테고리:
//   hallucinated_number / invented_player_name / banned_phrase /
//   server_error_529 / other_api_error / other

export interface PredictionForFallback {
  id: number;
  created_at: string;
  reasoning: unknown;
}

export interface AgentFallbackCohort {
  windowDays: number;
  total: number;
  fullDebate: number;
  agentsFailed: number;
  quantOnly: number;
  fullDebateRate: number;
  agentsFailedRate: number;
  quantOnlyRate: number;
  errorCategories: Record<string, number>;
  daily: AgentFallbackDailyRow[];
  samples: AgentFallbackSample[];
}

export interface AgentFallbackDailyRow {
  date: string;
  total: number;
  fullDebate: number;
  agentsFailed: number;
  quantOnly: number;
}

export interface AgentFallbackSample {
  id: number;
  date: string;
  category: 'fullDebate' | 'agentsFailed' | 'quantOnly';
  errorCategory?: string;
  agentError?: string;
}

const SAMPLE_LIMIT = 12;

export function buildAgentFallbackCohort(
  rows: PredictionForFallback[],
  windowDays: number
): AgentFallbackCohort {
  let total = 0;
  let fullDebate = 0;
  let agentsFailed = 0;
  let quantOnly = 0;
  const errorCategories: Record<string, number> = {};
  const dailyMap = new Map<string, AgentFallbackDailyRow>();
  const samples: AgentFallbackSample[] = [];

  for (const r of rows) {
    total++;
    const debate = (r.reasoning as { debate?: Record<string, unknown> } | null)?.debate;
    const date = r.created_at.slice(0, 10);
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, total: 0, fullDebate: 0, agentsFailed: 0, quantOnly: 0 });
    }
    const day = dailyMap.get(date)!;
    day.total++;

    const verdict = (debate?.verdict as { reasoning?: unknown } | undefined) ?? undefined;
    const judgeReason = verdict?.reasoning;
    const judgeText = typeof judgeReason === 'string' ? judgeReason : '';
    const hasJudge = judgeText.length > 50;

    const homeArg = debate?.homeArgument as { reasoning?: unknown } | undefined;
    const awayArg = debate?.awayArgument as { reasoning?: unknown } | undefined;
    const hasHome =
      typeof homeArg?.reasoning === 'string' && (homeArg.reasoning as string).length > 30;
    const hasAway =
      typeof awayArg?.reasoning === 'string' && (awayArg.reasoning as string).length > 30;

    const agentsFailedFlag = debate?.agentsFailed === true;
    const isQuantOnly = !hasJudge || judgeText.includes('에이전트 토론 불가');

    if (isQuantOnly) {
      quantOnly++;
      day.quantOnly++;
      if (samples.length < SAMPLE_LIMIT) {
        samples.push({ id: r.id, date, category: 'quantOnly' });
      }
    } else if (agentsFailedFlag) {
      agentsFailed++;
      day.agentsFailed++;
      const ae = debate?.agentError;
      const aeStr = typeof ae === 'string' ? ae : ae ? JSON.stringify(ae) : '';
      const category = categorizeAgentError(aeStr);
      errorCategories[category] = (errorCategories[category] ?? 0) + 1;
      if (samples.length < SAMPLE_LIMIT) {
        samples.push({
          id: r.id,
          date,
          category: 'agentsFailed',
          errorCategory: category,
          agentError: aeStr.slice(0, 160),
        });
      }
    } else if (hasJudge && hasHome && hasAway) {
      fullDebate++;
      day.fullDebate++;
    }
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    windowDays,
    total,
    fullDebate,
    agentsFailed,
    quantOnly,
    fullDebateRate: total > 0 ? fullDebate / total : 0,
    agentsFailedRate: total > 0 ? agentsFailed / total : 0,
    quantOnlyRate: total > 0 ? quantOnly / total : 0,
    errorCategories,
    daily,
    samples,
  };
}

export function categorizeAgentError(msg: string): string {
  if (!msg) return 'other';
  if (msg.includes('SERVER_ERROR 529') || msg.includes('Overloaded')) return 'server_error_529';
  if (msg.includes('hallucinated_number')) return 'hallucinated_number';
  if (msg.includes('invented_player_name')) return 'invented_player_name';
  if (msg.includes('banned_phrase')) return 'banned_phrase';
  if (msg.includes('unclassified_claim')) return 'unclassified_claim';
  if (/[Ee]rror|429|500|timeout/.test(msg)) return 'other_api_error';
  return 'other';
}
