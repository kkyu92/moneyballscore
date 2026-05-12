import type { PickGameResult } from '@/app/api/picks/results/route';
import type { UserPicksStore } from '@/hooks/use-user-picks';

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
}

export interface PicksStats {
  total: number;
  resolved: number;
  myCorrect: number;
  aiCorrect: number;
  myRate: number | null;
  aiRate: number | null;
  currentStreak: number; // 현재 연속 정답 (가장 최근부터)
  recentDots: boolean[]; // 최근 10경기 정답 여부 (가장 오래된→최근)
  trend: 'up' | 'down' | 'flat';
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
      };
    })
    .sort((a, b) => b.pickedAt.localeCompare(a.pickedAt)); // 최근순
}

export function buildPicksStats(entries: PickEntry[]): PicksStats {
  const resolved = entries.filter((e) => e.isResolved);
  const myCorrect = resolved.filter((e) => e.myIsCorrect === true).length;
  const aiCorrect = resolved.filter((e) => e.aiIsCorrect === true).length;

  const myRate = resolved.length > 0 ? myCorrect / resolved.length : null;
  const aiRate = resolved.length > 0 ? aiCorrect / resolved.length : null;

  // 연속 정답 (최근순으로 이미 정렬돼 있음)
  let currentStreak = 0;
  for (const e of resolved) {
    if (e.myIsCorrect === true) currentStreak++;
    else break;
  }

  // 최근 10경기 dots
  const recent10 = resolved.slice(0, 10).reverse(); // 오래된→최근 순으로 뒤집기
  const recentDots = recent10.map((e) => e.myIsCorrect === true);

  // 추세: 최근 5 vs 이전 5
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (resolved.length >= 10) {
    const r5 = resolved.slice(0, 5).filter((e) => e.myIsCorrect).length / 5;
    const p5 = resolved.slice(5, 10).filter((e) => e.myIsCorrect).length / 5;
    if (r5 - p5 > 0.1) trend = 'up';
    else if (p5 - r5 > 0.1) trend = 'down';
  }

  return {
    total: entries.length,
    resolved: resolved.length,
    myCorrect,
    aiCorrect,
    myRate,
    aiRate,
    currentStreak,
    recentDots,
    trend,
  };
}
