import { fetchGames, DEFAULT_PARK_FACTORS } from '../packages/kbo-data/src/scrapers/kbo-official';
import { fetchPitcherStats, fetchTeamStats, fetchEloRatings, findPitcher } from '../packages/kbo-data/src/scrapers/fancy-stats';
import { predict } from '../packages/kbo-data/src/engine/predictor';
import { toKSTDateString } from '../packages/shared/src/index';
import type { PredictionInput, ScrapedGame } from '../packages/kbo-data/src/types';

const BACKTEST_SEASON = 2025;

// 날짜 범위 생성
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function main() {
  const startDate = process.argv[2] || '2025-04-01';
  const endDate = process.argv[3] || '2025-09-30';

  console.log(`Backtest: ${startDate} ~ ${endDate} (season ${BACKTEST_SEASON})`);
  console.log('Fetching season stats...');

  // 시즌 전체 통계 (한 번만)
  const [pitcherStats, teamStats, eloRatings] = await Promise.all([
    fetchPitcherStats(BACKTEST_SEASON),
    fetchTeamStats(BACKTEST_SEASON),
    fetchEloRatings(BACKTEST_SEASON),
  ]);

  console.log(`Pitchers: ${pitcherStats.length}, Teams: ${teamStats.length}, Elo: ${eloRatings.length}`);

  const dates = dateRange(startDate, endDate);
  let totalGames = 0;
  let correctPredictions = 0;
  let homeWins = 0;
  let totalWithResult = 0;

  for (const date of dates) {
    let games: ScrapedGame[];
    try {
      games = await fetchGames(date);
    } catch {
      continue;
    }

    const finishedGames = games.filter(
      (g) => g.status === 'final' && g.homeScore != null && g.awayScore != null && g.homeSP && g.awaySP
    );

    for (const game of finishedGames) {
      totalGames++;
      const actualWinner = game.homeScore! > game.awayScore! ? game.homeTeam : game.awayTeam;
      if (game.homeScore! > game.awayScore!) homeWins++;
      totalWithResult++;

      const homeTeamStat = teamStats.find((t) => t.team === game.homeTeam);
      const awayTeamStat = teamStats.find((t) => t.team === game.awayTeam);
      const homeElo = eloRatings.find((e) => e.team === game.homeTeam);
      const awayElo = eloRatings.find((e) => e.team === game.awayTeam);

      const defaultTS = { team: game.homeTeam, woba: 0.320, bullpenFip: 4.0, totalWar: 12, sfr: 0 };
      const defaultElo = { team: game.homeTeam, elo: 1500, winPct: 0.5 };

      const input: PredictionInput = {
        game,
        homeSPStats: findPitcher(pitcherStats, game.homeSP!, game.homeTeam),
        awaySPStats: findPitcher(pitcherStats, game.awaySP!, game.awayTeam),
        homeTeamStats: homeTeamStat || { ...defaultTS, team: game.homeTeam },
        awayTeamStats: awayTeamStat || { ...defaultTS, team: game.awayTeam },
        homeElo: homeElo || { ...defaultElo, team: game.homeTeam },
        awayElo: awayElo || { ...defaultElo, team: game.awayTeam },
        headToHead: { wins: 0, losses: 0 }, // 백테스트에서는 상대전적 무시
        homeRecentForm: 0.5,
        awayRecentForm: 0.5,
        parkFactor: DEFAULT_PARK_FACTORS[game.stadium] ?? 1.0,
      };

      const result = predict(input);
      if (result.predictedWinner === actualWinner) {
        correctPredictions++;
      }
    }

    // rate limit 준수
    if (finishedGames.length > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('\n========== BACKTEST RESULTS ==========');
  console.log(`Period: ${startDate} ~ ${endDate}`);
  console.log(`Total games: ${totalGames}`);
  console.log(`Model accuracy: ${totalGames > 0 ? ((correctPredictions / totalGames) * 100).toFixed(1) : 0}% (${correctPredictions}/${totalGames})`);
  console.log(`Home win baseline: ${totalWithResult > 0 ? ((homeWins / totalWithResult) * 100).toFixed(1) : 0}% (${homeWins}/${totalWithResult})`);
  console.log(`Model vs baseline: ${totalGames > 0 ? (((correctPredictions / totalGames) - (homeWins / totalWithResult)) * 100).toFixed(1) : 0}pp`);
  console.log('======================================');
}

main().catch(console.error);
