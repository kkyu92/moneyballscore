import * as Sentry from '@sentry/nextjs';

const RATE_LIMIT_MS = 2000;
let lastFetchAt = 0;

async function rateLimit() {
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastFetchAt = Date.now();
}

export interface SavantTeam {
  teamCode: string;
  xwoba: number;        // 0~0.5
  barrelPct: number;    // 0~30
  hardHitPct: number;   // 0~100
  launchAngle: number;  // -30~50
}

export async function fetchSavantTeamStatcast(season: number): Promise<SavantTeam[]> {
  await rateLimit();

  const url = `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=team&year=${season}&csv=true`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`savant HTTP ${res.status}`, 'warning');
    throw new Error(`savant HTTP ${res.status}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split('\n');
  if (lines.length < 2) throw new Error('parse fail — empty CSV');

  const header = lines[0].split(',');
  const teamIdx = header.indexOf('team');
  const xwobaIdx = header.indexOf('xwoba');
  const barrelIdx = header.indexOf('brl_percent');
  const hardHitIdx = header.indexOf('hard_hit_percent');
  const launchIdx = header.indexOf('launch_angle');

  if ([teamIdx, xwobaIdx, barrelIdx, hardHitIdx, launchIdx].some((i) => i === -1)) {
    Sentry.captureMessage('savant CSV format 변경', 'warning');
    throw new Error('parse fail — CSV format 변경');
  }

  const teams: SavantTeam[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const xwoba = parseFloat(cols[xwobaIdx]);
    const barrelPct = parseFloat(cols[barrelIdx]);
    const hardHitPct = parseFloat(cols[hardHitIdx]);
    const launchAngle = parseFloat(cols[launchIdx]);

    if (xwoba < 0 || xwoba > 0.5) continue;
    if (barrelPct < 0 || barrelPct > 30) continue;
    if (hardHitPct < 0 || hardHitPct > 100) continue;
    if (launchAngle < -30 || launchAngle > 50) continue;

    teams.push({
      teamCode: cols[teamIdx],
      xwoba, barrelPct, hardHitPct, launchAngle,
    });
  }

  return teams;
}
