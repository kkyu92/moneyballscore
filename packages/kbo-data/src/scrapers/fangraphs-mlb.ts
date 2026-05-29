import * as cheerio from 'cheerio';
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

export interface FangraphsMlbTeam {
  teamCode: string;
  woba: number; fip: number; xfip: number; war: number;
  ldPct: number; gbPct: number; fbPct: number; iffbPct: number;
  hrFbPct: number; pullPct: number; centPct: number; oppoPct: number;
}

export async function fetchFangraphsMlbTeams(season: number): Promise<FangraphsMlbTeam[]> {
  await rateLimit();

  const url = `https://www.fangraphs.com/leaders/major-league?pos=all&stats=bat&lg=all&season=${season}&type=8&team=0,ts&pageitems=2000000000`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`fangraphs-mlb HTTP ${res.status}`, 'warning');
    throw new Error(`fangraphs HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = $('table#LeaderBoard1_dg1_ctl00 tbody tr');

  if (rows.length === 0) {
    Sentry.captureMessage('fangraphs-mlb parse fail — selector 변경 가능', 'warning');
    throw new Error('parse fail');
  }

  const teams: FangraphsMlbTeam[] = [];
  rows.each((_, el) => {
    const $tds = $(el).find('td');
    if ($tds.length < 14) return;
    teams.push({
      teamCode: $tds.eq(1).text().trim(),
      woba: parseFloat($tds.eq(2).text()),
      fip: parseFloat($tds.eq(3).text()),
      xfip: parseFloat($tds.eq(4).text()),
      war: parseFloat($tds.eq(5).text()),
      ldPct: parseFloat($tds.eq(6).text()),
      gbPct: parseFloat($tds.eq(7).text()),
      fbPct: parseFloat($tds.eq(8).text()),
      iffbPct: parseFloat($tds.eq(9).text()),
      hrFbPct: parseFloat($tds.eq(10).text()),
      pullPct: parseFloat($tds.eq(11).text()),
      centPct: parseFloat($tds.eq(12).text()),
      oppoPct: parseFloat($tds.eq(13).text()),
    });
  });

  return teams;
}
