import type { PickGameResult } from '@/app/api/picks/results/route';
import type { UserPicksStore } from '@/hooks/use-user-picks';
import { NEUTRAL_HI, NEUTRAL_LO } from '@/lib/predictions/factorLabels';
import { DAY_MS, getKSTWeekRange, KST_OFFSET_MS, RECENT_FORM_GAMES } from '@moneyball/shared';

export interface WeeklyStats {
  weekLabel: string;
  total: number;
  resolved: number;
  myCorrect: number;
  aiResolved: number;
  aiCorrect: number;
  myRate: number | null;
  aiRate: number | null;
}

export interface PickEntry {
  gameId: number;
  game_date: string;
  myPick: 'home' | 'away';
  pickedAt: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  // computed
  isResolved: boolean;
  myIsCorrect: boolean | null;
  aiIsCorrect: boolean | null;
  aiPredictedHome: boolean | null;
  /**
   * AI factor breakdown — per-factor home-win prob [0,1] (0.5=중립).
   * pre_game + CURRENT_SCORING_RULE 만. null = factors 없음 (pre_game prediction
   * 누락 / shadow only).
   */
  aiFactors: Record<string, number> | null;
}

export interface WeeklyGroup {
  weekStart: string;
  stats: WeeklyStats;
  entries: PickEntry[];
}

export interface PicksStats {
  total: number;
  resolved: number;
  myCorrect: number;
  aiResolved: number;
  aiCorrect: number;
  myRate: number | null;
  aiRate: number | null;
  currentStreak: number; // 현재 연속 정답 (가장 최근부터)
  pickingStreakDays: number; // 연속 픽 참여일 (KST 기준)
  recentDots: boolean[]; // 최근 RECENT_FORM_GAMES경기 정답 여부 (가장 오래된→최근)
  trend: 'up' | 'down' | 'flat';
  // AI 와 다른 픽 (divergent) 통계 — 사용자의 독립 판단 가치 측정
  divergentResolved: number; // AI 와 다른 픽 + 결과 확정 (AI 예측 있는 경기만)
  divergentMyCorrect: number; // 그 중 내가 맞은 수
  divergentRate: number | null; // divergentMyCorrect / divergentResolved
  agreedResolved: number; // AI 와 같은 픽 + 결과 확정
  agreedCorrect: number; // 그 중 맞은 수 (사용자=AI 이므로 동일)
}

export function buildPickEntries(
  picks: UserPicksStore,
  results: PickGameResult[],
): PickEntry[] {
  const resultMap = new Map(results.map((r) => [r.id, r]));

  return Object.entries(picks)
    .map(([idStr, pick]) => {
      const gameId = parseInt(idStr, 10);
      const r = resultMap.get(gameId);

      const homeTeamName = r?.home_team?.name_ko ?? null;
      const awayTeamName = r?.away_team?.name_ko ?? null;
      const homeScore = r?.home_score ?? null;
      const awayScore = r?.away_score ?? null;
      const status = r?.status ?? null;

      let isResolved = false;
      let myIsCorrect: boolean | null = null;
      let aiIsCorrect: boolean | null = null;
      let aiPredictedHome: boolean | null = null;

      if (r && homeScore !== null && awayScore !== null) {
        isResolved = true;
        const homeWon = homeScore > awayScore;
        myIsCorrect = pick.pick === 'home' ? homeWon : !homeWon;

        if (r.ai_is_correct !== null) {
          aiIsCorrect = r.ai_is_correct;
        }
        if (r.ai_predicted_winner_id !== null && r.home_team) {
          aiPredictedHome = r.ai_predicted_winner_id === r.home_team.id;
        }
      }

      return {
        gameId,
        game_date: r?.game_date ?? pick.pickedAt.slice(0, 10),
        myPick: pick.pick,
        pickedAt: pick.pickedAt,
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        status,
        isResolved,
        myIsCorrect,
        aiIsCorrect,
        aiPredictedHome,
        aiFactors: r?.ai_factors ?? null,
      };
    })
    .sort((a, b) => b.pickedAt.localeCompare(a.pickedAt)); // 최근순
}

export function buildWeeklyStats(entries: PickEntry[], now: Date = new Date()): WeeklyStats | null {
  const { start, end } = getKSTWeekRange(now);
  const weekEntries = entries.filter((e) => e.game_date >= start && e.game_date <= end);
  if (weekEntries.length === 0) return null;
  return computeWeekStats(weekEntries, start);
}

function toKSTDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function buildPicksStats(entries: PickEntry[]): PicksStats {
  const resolved = entries.filter((e) => e.isResolved);
  const myCorrect = resolved.filter((e) => e.myIsCorrect === true).length;
  const aiResolved = resolved.filter((e) => e.aiIsCorrect !== null);
  const aiCorrect = aiResolved.filter((e) => e.aiIsCorrect === true).length;

  const myRate = resolved.length > 0 ? myCorrect / resolved.length : null;
  const aiRate = aiResolved.length > 0 ? aiCorrect / aiResolved.length : null;

  // 연속 정답 (최근순으로 이미 정렬돼 있음)
  let currentStreak = 0;
  for (const e of resolved) {
    if (e.myIsCorrect === true) currentStreak++;
    else break;
  }

  // 연속 픽 참여일 (KST 기준, 오늘 또는 어제 픽한 경우에만 streak 활성)
  const pickDates = [...new Set(entries.map((e) => toKSTDate(e.pickedAt)))].sort().reverse();
  let pickingStreakDays = 0;
  if (pickDates.length > 0) {
    const todayKST = toKSTDate(new Date().toISOString());
    const yesterdayKST = prevDay(todayKST);
    const mostRecent = pickDates[0];
    if (mostRecent === todayKST || mostRecent === yesterdayKST) {
      let expected = mostRecent;
      for (const date of pickDates) {
        if (date === expected) {
          pickingStreakDays++;
          expected = prevDay(expected);
        } else {
          break;
        }
      }
    }
  }

  // 최근 RECENT_FORM_GAMES경기 dots
  const recent10 = resolved.slice(0, RECENT_FORM_GAMES).reverse(); // 오래된→최근 순으로 뒤집기
  const recentDots = recent10.map((e) => e.myIsCorrect === true);

  // 추세: 최근 5 vs 이전 5
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (resolved.length >= 10) {
    const r5 = resolved.slice(0, 5).filter((e) => e.myIsCorrect).length / 5;
    const p5 = resolved.slice(5, 10).filter((e) => e.myIsCorrect).length / 5;
    if (r5 - p5 > 0.1) trend = 'up';
    else if (p5 - r5 > 0.1) trend = 'down';
  }

  // divergent / agreed 분기 — AI 예측 있는 경기만 (aiPredictedHome != null)
  let divergentResolved = 0;
  let divergentMyCorrect = 0;
  let agreedResolved = 0;
  let agreedCorrect = 0;
  for (const e of resolved) {
    if (e.aiPredictedHome === null) continue;
    const myPickHome = e.myPick === 'home';
    const isDivergent = myPickHome !== e.aiPredictedHome;
    if (isDivergent) {
      divergentResolved++;
      if (e.myIsCorrect === true) divergentMyCorrect++;
    } else {
      agreedResolved++;
      if (e.myIsCorrect === true) agreedCorrect++;
    }
  }
  const divergentRate = divergentResolved > 0 ? divergentMyCorrect / divergentResolved : null;

  return {
    total: entries.length,
    resolved: resolved.length,
    myCorrect,
    aiResolved: aiResolved.length,
    aiCorrect,
    myRate,
    aiRate,
    currentStreak,
    pickingStreakDays,
    recentDots,
    trend,
    divergentResolved,
    divergentMyCorrect,
    divergentRate,
    agreedResolved,
    agreedCorrect,
  };
}

function getWeekStartStr(dateStr: string): string {
  // dateStr = "YYYY-MM-DD" (KST 날짜를 UTC date string으로 취급)
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMon = dow === 0 ? 6 : dow - 1;
  const monMs = d.getTime() - daysSinceMon * DAY_MS;
  return new Date(monMs).toISOString().slice(0, 10);
}

function makeWeekLabel(monStr: string): string {
  const sunMs = new Date(monStr + 'T00:00:00Z').getTime() + 6 * DAY_MS;
  const sunStr = new Date(sunMs).toISOString().slice(0, 10);
  const monMonth = parseInt(monStr.slice(5, 7), 10);
  const monDay = parseInt(monStr.slice(8, 10), 10);
  const sunMonth = parseInt(sunStr.slice(5, 7), 10);
  const sunDay = parseInt(sunStr.slice(8, 10), 10);
  return monMonth === sunMonth
    ? `${monMonth}월 ${monDay}일~${sunDay}일`
    : `${monMonth}월 ${monDay}일~${sunMonth}월 ${sunDay}일`;
}

function computeWeekStats(weekEntries: PickEntry[], monStr: string): WeeklyStats {
  const resolved = weekEntries.filter((e) => e.isResolved);
  const myCorrect = resolved.filter((e) => e.myIsCorrect === true).length;
  const aiResolved = resolved.filter((e) => e.aiIsCorrect !== null);
  const aiCorrect = aiResolved.filter((e) => e.aiIsCorrect === true).length;
  return {
    weekLabel: makeWeekLabel(monStr),
    total: weekEntries.length,
    resolved: resolved.length,
    myCorrect,
    aiResolved: aiResolved.length,
    aiCorrect,
    myRate: resolved.length > 0 ? myCorrect / resolved.length : null,
    aiRate: aiResolved.length > 0 ? aiCorrect / aiResolved.length : null,
  };
}

// 모든 주차 데이터 반환 (최신순). 이번 주 포함.
export function buildWeeklyHistory(entries: PickEntry[]): WeeklyGroup[] {
  if (entries.length === 0) return [];

  const weekMap = new Map<string, PickEntry[]>();
  for (const entry of entries) {
    const ws = getWeekStartStr(entry.game_date);
    const bucket = weekMap.get(ws);
    if (bucket) bucket.push(entry);
    else weekMap.set(ws, [entry]);
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // 최신순
    .map(([weekStart, wEntries]) => ({
      weekStart,
      stats: computeWeekStats(wEntries, weekStart),
      entries: wEntries.sort((a, b) => b.game_date.localeCompare(a.game_date)),
    }));
}

// ---------------------------------------------------------------------------
// Factor Agreement — 사용자 픽 vs AI factor 별 일치 분석.
//
// 사용자 가시 가치: 사용자가 "내 의견이 어느 팩터에서 데이터와 일치하는가" 를
// factor 단위 (선발/타선/Elo 등 10 factor) 로 즉시 확인. 단순 prob 차이 보다
// strong 한 reasoning surface — 사용자 자가 인식 (강점/약점 factor) 가능.
// ---------------------------------------------------------------------------

// factor lean threshold — predictions/factorLabels.ts 의 NEUTRAL_HI/LO 단일 source.
// silent drift family wave 102 — 본 파일 local 재선언 → import 통합.
// 0.5=중립. >NEUTRAL_HI=홈 favor / <NEUTRAL_LO=원정 favor. 사이 = 중립.

export type FactorLean = 'home' | 'away' | 'neutral';

export interface FactorAgreementRow {
  factor: string;
  // 사용자 픽 방향으로 leaned 한 횟수
  withMyPick: number;
  // 반대 (AI 방향) 으로 leaned 한 횟수
  againstMyPick: number;
  // neutral 횟수
  neutral: number;
  // 총 측정 횟수 (factors present in entry)
  total: number;
  // withMyPick / (withMyPick + againstMyPick), neutral 제외.
  // >0.5 = 이 factor 가 내 의견 지지 경향 / <0.5 = AI 방향 우세
  agreementRate: number | null;
}

export interface FactorAgreement {
  // 측정 가능 (aiFactors != null + isResolved + aiPredictedHome != null) entries 수
  measuredCount: number;
  // factor key → 집계. DEFAULT_WEIGHTS 안 10 factor key.
  byFactor: FactorAgreementRow[];
}

/** factor value [0,1] → home/away/neutral classification. */
function classifyFactorLean(value: number): FactorLean {
  if (value > NEUTRAL_HI) return 'home';
  if (value < NEUTRAL_LO) return 'away';
  return 'neutral';
}

/**
 * 사용자 픽 방향 vs 각 factor lean 일치도 집계.
 *
 * 분석 대상: aiFactors != null + isResolved + aiPredictedHome != null 인 entries.
 * (aiPredictedHome 게이트 = AI prediction 존재 자체 확인 — 실제 일치 판단엔
 * myPick + factor lean 만 사용.)
 *
 * agreementRate 계산:
 *   - withMyPick = factor lean === myPick 방향
 *   - againstMyPick = factor lean === 반대 방향
 *   - neutral 제외 → withMyPick / (withMyPick + againstMyPick)
 *   - 분모=0 (모두 neutral) → null
 *
 * @returns FactorAgreement (분석 가능 entry 0 시 measuredCount=0 + byFactor=[])
 */
export function buildFactorAgreement(entries: PickEntry[]): FactorAgreement {
  const candidates = entries.filter(
    (e) => e.aiFactors !== null && e.isResolved && e.aiPredictedHome !== null,
  );
  if (candidates.length === 0) {
    return { measuredCount: 0, byFactor: [] };
  }

  // factor key 수집 — 운영 가중치 변경 시 본 분석 영향 없도록 entries 안 실제 key 만 사용.
  const factorKeys = new Set<string>();
  for (const e of candidates) {
    if (e.aiFactors) {
      for (const k of Object.keys(e.aiFactors)) factorKeys.add(k);
    }
  }

  const byFactor: FactorAgreementRow[] = [];
  for (const factor of factorKeys) {
    let withMyPick = 0;
    let againstMyPick = 0;
    let neutral = 0;
    let total = 0;
    for (const e of candidates) {
      const v = e.aiFactors?.[factor];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      total++;
      const lean = classifyFactorLean(v);
      if (lean === 'neutral') {
        neutral++;
        continue;
      }
      if (lean === e.myPick) withMyPick++;
      else againstMyPick++;
    }
    const denom = withMyPick + againstMyPick;
    byFactor.push({
      factor,
      withMyPick,
      againstMyPick,
      neutral,
      total,
      agreementRate: denom > 0 ? withMyPick / denom : null,
    });
  }

  // 정렬: total desc (표본 큰 factor 우선) → tie 시 agreementRate desc.
  byFactor.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const aRate = a.agreementRate ?? -1;
    const bRate = b.agreementRate ?? -1;
    return bRate - aRate;
  });

  return { measuredCount: candidates.length, byFactor };
}
