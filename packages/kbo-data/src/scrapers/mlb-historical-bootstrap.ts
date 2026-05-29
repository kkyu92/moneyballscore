export const RETROSHEET_ATTRIBUTION =
  'The information used here was obtained free of charge from and is copyrighted by Retrosheet. Interested parties may contact Retrosheet at www.retrosheet.org';

export interface HistoricalGame {
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

export async function fetchRetrosheetSeasonGames(season: number): Promise<HistoricalGame[]> {
  const url = `https://www.retrosheet.org/gamelogs/gl${season}.txt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`retrosheet HTTP ${res.status}`);

  const csv = await res.text();
  const games: HistoricalGame[] = [];

  for (const line of csv.split('\n')) {
    if (!line.trim()) continue;
    const cols = line.replace(/"/g, '').split(',');
    if (cols.length < 11) continue;

    const dateStr = cols[0];
    const gameDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    const awayTeam = cols[3];
    const homeTeam = cols[6];
    const awayScore = parseInt(cols[9], 10);
    const homeScore = parseInt(cols[10], 10);

    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;

    games.push({
      gameDate,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      winner: homeScore > awayScore ? homeTeam : awayTeam,
    });
  }

  return games;
}
