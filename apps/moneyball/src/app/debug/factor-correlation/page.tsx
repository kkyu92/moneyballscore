import { createClient } from '@supabase/supabase-js';

// /debug/factor-correlation — 환경 변수 → 경기 결과 상관 분석
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher)
//
// 2024+2025 시즌 백필 완료 + 2026 진행분 합쳐서 (N ~1458) 경기 환경 요소가
// 실제로 결과에 영향 주는지 조사. 팩터 가중치 튜닝의 사전 작업 —
// "모델 상수 가정이 데이터와 일치하나" 검증.
//
// 다루는 것:
//   1. Home advantage 실측 — 홈 승률 vs 가정 +1.5%p
//   2. 구장별 평균 득점 환경
//   3. 낮/밤, 요일, 기온, 바람, 강수
//   4. 팀별 홈/원정 승률 편차 — 균일 가정 검증
//   5. 매치업 매트릭스 10×9 — 팀 간 상성

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface GameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  home_team_id: number;
  away_team_id: number;
  winner_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  weather: {
    tempC?: number;
    precipMm?: number;
    precipPct?: number;
    windSpeedKmh?: number;
  } | null;
}

/** Wald 95% CI 반폭. */
function ci95(p: number, n: number): number {
  if (n === 0) return 0;
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

function fmtPM(v: number): string {
  const s = v > 0 ? '+' : '';
  return s + (v * 100).toFixed(1) + '%p';
}

interface SplitRow {
  key: string;
  n: number;
  homeWins: number;
  homeWinRate: number;
  ci: number;
  avgTotalRuns: number;
}

function makeSplit<K extends string>(
  games: GameRow[],
  keyer: (g: GameRow) => K | null,
): SplitRow[] {
  const acc = new Map<K, { n: number; hw: number; runs: number }>();
  for (const g of games) {
    const k = keyer(g);
    if (k == null) continue;
    if (g.winner_team_id == null) continue;
    const a = acc.get(k) ?? { n: 0, hw: 0, runs: 0 };
    a.n++;
    if (g.winner_team_id === g.home_team_id) a.hw++;
    a.runs += (g.home_score ?? 0) + (g.away_score ?? 0);
    acc.set(k, a);
  }
  const rows: SplitRow[] = [];
  for (const [key, a] of acc) {
    const rate = a.hw / a.n;
    rows.push({
      key,
      n: a.n,
      homeWins: a.hw,
      homeWinRate: rate,
      ci: ci95(rate, a.n),
      avgTotalRuns: a.runs / a.n,
    });
  }
  return rows.sort((x, y) => y.n - x.n);
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function weekdayOf(date: string): string {
  const d = new Date(date + 'T00:00:00+09:00');
  return WEEKDAY_KO[d.getUTCDay()];
}

function tempBucket(t: number | undefined): string | null {
  if (t == null) return null;
  if (t < 10) return '<10°C';
  if (t < 15) return '10-15°C';
  if (t < 20) return '15-20°C';
  if (t < 25) return '20-25°C';
  if (t < 30) return '25-30°C';
  return '≥30°C';
}

function windBucket(w: number | undefined): string | null {
  if (w == null) return null;
  if (w < 3) return '<3 km/h';
  if (w < 8) return '3-8';
  if (w < 15) return '8-15';
  return '≥15';
}

function precipLabel(g: GameRow): string | null {
  const w = g.weather;
  if (!w) return null;
  const mm = w.precipMm;
  if (mm != null) return mm > 0 ? '비' : '맑음';
  const pct = w.precipPct;
  if (pct != null) return pct > 40 ? '비' : '맑음';
  return null;
}

export default async function FactorCorrelationPage() {
  const db = getAdminClient();

  // 2024+2025 백필 완료 + 2026 진행분. 완료 + winner 확정만. 1000 row cap
  // 회피 위해 페이지네이션 수동 처리.
  const rawGames: GameRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: chunk, error: chunkErr } = await db
      .from('games')
      .select(
        'id, game_date, game_time, stadium, home_team_id, away_team_id, winner_team_id, home_score, away_score, weather',
      )
      .gte('game_date', '2024-01-01')
      .eq('status', 'final')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)
      .order('game_date', { ascending: true })
      .range(from, from + pageSize - 1);
    if (chunkErr) {
      return <div className="p-6 text-red-600">DB error: {chunkErr.message}</div>;
    }
    if (!chunk || chunk.length === 0) break;
    rawGames.push(...(chunk as GameRow[]));
    if (chunk.length < pageSize) break;
  }

  // teams 코드 조회 (팀명 표시용)
  const { data: teamsData } = await db
    .from('teams')
    .select('id, code, name_ko')
    .order('id');
  const teamMap = new Map<number, { code: string; name: string }>();
  for (const t of teamsData ?? []) {
    teamMap.set(t.id as number, { code: t.code as string, name: t.name_ko as string });
  }

  const games = rawGames.filter((g) => g.winner_team_id != null);
  const decided = games.length;

  if (decided === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500">검증 가능한 경기가 없습니다.</p>
      </div>
    );
  }

  // 전체 홈 어드밴티지
  const homeWins = games.filter((g) => g.winner_team_id === g.home_team_id).length;
  const homeWinRate = homeWins / decided;
  const homeCi = ci95(homeWinRate, decided);

  // 구장별
  const stadiumSplit = makeSplit(games, (g) => g.stadium).filter((r) => r.n >= 20);

  // 낮밤
  const dayNightSplit = makeSplit(games, (g) => {
    const hStr = g.game_time?.slice(0, 2);
    const h = hStr ? parseInt(hStr, 10) : null;
    if (h == null) return null;
    return h < 17 ? '낮 (14-16시)' : '밤 (17시+)';
  });

  // 요일
  const weekdaySplit = makeSplit(games, (g) => weekdayOf(g.game_date));

  // 기온
  const tempSplit = makeSplit(games, (g) => tempBucket(g.weather?.tempC));

  // 바람
  const windSplit = makeSplit(games, (g) => windBucket(g.weather?.windSpeedKmh));

  // 강수
  const precipSplit = makeSplit(games, precipLabel);

  // 8. 팀별 홈/원정 승률
  interface TeamSplit {
    teamId: number;
    code: string;
    name: string;
    homeN: number; homeWins: number; homeRate: number; homeCi: number;
    awayN: number; awayWins: number; awayRate: number; awayCi: number;
    totalN: number;
  }
  const teamStats = new Map<number, TeamSplit>();
  for (const tid of teamMap.keys()) {
    const meta = teamMap.get(tid)!;
    teamStats.set(tid, {
      teamId: tid, code: meta.code, name: meta.name,
      homeN: 0, homeWins: 0, homeRate: 0, homeCi: 0,
      awayN: 0, awayWins: 0, awayRate: 0, awayCi: 0,
      totalN: 0,
    });
  }
  for (const g of games) {
    if (g.winner_team_id == null) continue;
    const home = teamStats.get(g.home_team_id);
    const away = teamStats.get(g.away_team_id);
    if (!home || !away) continue;
    home.homeN++;
    if (g.winner_team_id === g.home_team_id) home.homeWins++;
    away.awayN++;
    if (g.winner_team_id === g.away_team_id) away.awayWins++;
  }
  const teamRows: TeamSplit[] = [];
  for (const s of teamStats.values()) {
    s.homeRate = s.homeN ? s.homeWins / s.homeN : 0;
    s.homeCi = ci95(s.homeRate, s.homeN);
    s.awayRate = s.awayN ? s.awayWins / s.awayN : 0;
    s.awayCi = ci95(s.awayRate, s.awayN);
    s.totalN = s.homeN + s.awayN;
    if (s.totalN > 0) teamRows.push(s);
  }
  teamRows.sort((a, b) => b.homeRate - a.homeRate);

  // 9. 매치업 매트릭스 (home × away) — 홈팀 기준 승률
  // 각 셀 N ~50 (3 시즌) 이라 CI ±14%p. 평균 (리그 홈 승률 51.5%) 대비 편차 강조.
  interface MatchupCell { n: number; homeWins: number; rate: number }
  const matrix = new Map<string, MatchupCell>();
  for (const g of games) {
    if (g.winner_team_id == null) continue;
    const key = `${g.home_team_id}-${g.away_team_id}`;
    const c = matrix.get(key) ?? { n: 0, homeWins: 0, rate: 0 };
    c.n++;
    if (g.winner_team_id === g.home_team_id) c.homeWins++;
    matrix.set(key, c);
  }
  for (const c of matrix.values()) c.rate = c.n ? c.homeWins / c.n : 0;
  const orderedTeamIds = teamRows.map((t) => t.teamId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Factor Correlation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          환경 변수 → 경기 결과 상관 분석 (2025 시즌 + 2026 진행분).
          팩터 가중치 튜닝 전 사전 검증 — 상수 가정이 데이터와 일치하나.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          표본: 완료된 경기 중 승부 확정분 <span className="font-mono">{decided}</span>경기
          (무승부 제외). Wald 95% CI.
        </p>
      </header>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="text-lg font-bold">1. Home Advantage — 실측 vs 가정 (+1.5%p)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="홈 승률 실측" value={fmtPct(homeWinRate)} suffix={`${homeWins}/${decided} · ±${(homeCi * 100).toFixed(1)}%p`} />
          <Stat label="모델 가정" value="51.5%" suffix="+1.5%p (2026-04-21 실측 반영)" />
          <Stat
            label="Gap (실측 − 가정)"
            value={fmtPM(homeWinRate - 0.515)}
            tone={Math.abs(homeWinRate - 0.515) < 0.015 ? 'good' : Math.abs(homeWinRate - 0.515) < 0.03 ? 'warn' : 'bad'}
          />
          <Stat label="표본 충분성" value={decided >= 500 ? '충분' : '부족'} suffix={`N=${decided}`} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          홈 어드밴티지 상수는 이 페이지 데이터로 재보정됨. 2024·2023 백필 시 CI 좁아지면 자동 refine 가능.
        </p>
      </section>

      <SplitSection title="2. 구장별 홈 승률 · 평균 득점" rows={stadiumSplit} overall={homeWinRate} showRuns />
      <SplitSection title="3. 낮 vs 밤" rows={dayNightSplit} overall={homeWinRate} showRuns />
      <SplitSection
        title="4. 요일별"
        rows={WEEKDAY_KO.map((d) => weekdaySplit.find((r) => r.key === d)).filter(
          (r): r is SplitRow => !!r,
        )}
        overall={homeWinRate}
        showRuns
      />
      <SplitSection title="5. 기온별" rows={tempSplit} overall={homeWinRate} showRuns />
      <SplitSection title="6. 바람 속도별" rows={windSplit} overall={homeWinRate} showRuns />
      <SplitSection title="7. 강수 여부" rows={precipSplit} overall={homeWinRate} showRuns />

      <TeamSplitSection rows={teamRows} overall={homeWinRate} />
      <MatchupMatrix teamIds={orderedTeamIds} teamMap={teamMap} matrix={matrix} overall={homeWinRate} />
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good' ? 'text-green-600' : tone === 'warn' ? 'text-yellow-600' : tone === 'bad' ? 'text-red-600' : '';
  return (
    <div className="bg-gray-50 dark:bg-[var(--color-surface)] rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${toneClass}`}>{value}</p>
      {suffix && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{suffix}</p>}
    </div>
  );
}

function SplitSection({
  title,
  rows,
  overall,
  showRuns,
}: {
  title: string;
  rows: SplitRow[];
  overall: number;
  showRuns: boolean;
}) {
  return (
    <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">데이터 없음</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
              <th className="py-2 pr-3 font-medium">구분</th>
              <th className="py-2 pr-3 font-medium text-right">N</th>
              <th className="py-2 pr-3 font-medium text-right">홈 승률</th>
              <th className="py-2 pr-3 font-medium text-right">vs 전체</th>
              <th className="py-2 pr-3 font-medium text-right">95% CI</th>
              {showRuns && <th className="py-2 font-medium text-right">평균 득점</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.homeWinRate - overall;
              const smallSample = r.n < 30;
              return (
                <tr
                  key={r.key}
                  className={`border-b border-gray-100 dark:border-gray-800 ${smallSample ? 'text-gray-400 dark:text-gray-500' : ''}`}
                  title={smallSample ? `표본 작음 (N=${r.n} < 30)` : undefined}
                >
                  <td className="py-2 pr-3 font-medium">{r.key}</td>
                  <td className="py-2 pr-3 text-right font-mono">{r.n}</td>
                  <td className="py-2 pr-3 text-right font-mono font-semibold">{fmtPct(r.homeWinRate)}</td>
                  <td
                    className={`py-2 pr-3 text-right font-mono text-xs ${
                      smallSample ? '' : Math.abs(diff) > 0.05 ? 'text-brand-600' : ''
                    }`}
                  >
                    {fmtPM(diff)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">±{(r.ci * 100).toFixed(1)}%p</td>
                  {showRuns && (
                    <td className="py-2 text-right font-mono">{r.avgTotalRuns.toFixed(1)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * 팀별 홈/원정 승률. 모델의 "균일 +1.5%p 가정" 검증.
 * 편차가 크면 팀별 홈 어드밴티지 변수가 필요하다는 신호.
 */
function TeamSplitSection({
  rows,
  overall,
}: {
  rows: Array<{ teamId: number; code: string; name: string; homeN: number; homeRate: number; homeCi: number; awayN: number; awayRate: number; awayCi: number; totalN: number }>;
  overall: number;
}) {
  return (
    <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
      <h2 className="text-lg font-bold">8. 팀별 홈/원정 승률 — 균일 가정 검증</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        리그 평균 홈 승률 <span className="font-mono">{fmtPct(overall)}</span> 가정하에,
        팀별 홈 승률 편차가 ±5%p 이상이면 균일 상수의 한계. 홈·원정 gap (홈 − 원정) 이
        각 팀의 "실질 홈 어드밴티지".
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
            <th className="py-2 pr-3 font-medium">팀</th>
            <th className="py-2 pr-3 font-medium text-right">홈 N</th>
            <th className="py-2 pr-3 font-medium text-right">홈 승률</th>
            <th className="py-2 pr-3 font-medium text-right">홈 ±CI</th>
            <th className="py-2 pr-3 font-medium text-right">원정 N</th>
            <th className="py-2 pr-3 font-medium text-right">원정 승률</th>
            <th className="py-2 pr-3 font-medium text-right">원정 ±CI</th>
            <th className="py-2 font-medium text-right">홈 − 원정 gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const gap = r.homeRate - r.awayRate;
            const homeDev = r.homeRate - overall;
            const extreme = Math.abs(homeDev) > 0.05;
            return (
              <tr key={r.teamId} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3 font-medium">{r.name}</td>
                <td className="py-2 pr-3 text-right font-mono">{r.homeN}</td>
                <td className={`py-2 pr-3 text-right font-mono font-semibold ${extreme ? (homeDev > 0 ? 'text-brand-600' : 'text-red-600') : ''}`}>
                  {fmtPct(r.homeRate)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs text-gray-500">±{(r.homeCi * 100).toFixed(1)}%p</td>
                <td className="py-2 pr-3 text-right font-mono">{r.awayN}</td>
                <td className="py-2 pr-3 text-right font-mono font-semibold">{fmtPct(r.awayRate)}</td>
                <td className="py-2 pr-3 text-right font-mono text-xs text-gray-500">±{(r.awayCi * 100).toFixed(1)}%p</td>
                <td className={`py-2 text-right font-mono ${Math.abs(gap) > 0.08 ? 'text-brand-600 font-semibold' : ''}`}>
                  {fmtPM(gap)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/**
 * 매치업 매트릭스 10×9 — 홈팀(행) × 원정팀(열) 홈 승률.
 * 각 셀 N ~50 (3 시즌) CI ±14%p 로 개별 셀은 노이즈 큼. 하지만 row 평균과의
 * 편차가 극단적 (>15%p) 인 셀은 "팀 상성" 가능성. 리그 평균 (51.5%) 대비 색상.
 */
function MatchupMatrix({
  teamIds,
  teamMap,
  matrix,
  overall,
}: {
  teamIds: number[];
  teamMap: Map<number, { code: string; name: string }>;
  matrix: Map<string, { n: number; homeWins: number; rate: number }>;
  overall: number;
}) {
  return (
    <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
      <h2 className="text-lg font-bold">9. 매치업 매트릭스 — 홈팀 기준 승률</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        행 = 홈팀, 열 = 원정팀. 각 셀은 해당 매치업 홈 승률 (N 작음 · CI ±14%p).
        리그 평균 <span className="font-mono">{fmtPct(overall)}</span> 대비 ±15%p 이상 편차 셀은
        색상 강조 — 팀 상성 가능성.
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="p-1"></th>
              {teamIds.map((aid) => (
                <th key={aid} className="p-1 text-center font-semibold text-gray-500 dark:text-gray-400 min-w-[52px]">
                  {teamMap.get(aid)?.name ?? aid}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamIds.map((hid) => (
              <tr key={hid}>
                <td className="p-1 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap pr-2">
                  {teamMap.get(hid)?.name ?? hid}
                </td>
                {teamIds.map((aid) => {
                  if (hid === aid) return <td key={aid} className="p-1 text-center text-gray-300">—</td>;
                  const cell = matrix.get(`${hid}-${aid}`);
                  if (!cell || cell.n === 0) {
                    return <td key={aid} className="p-1 text-center text-gray-300">·</td>;
                  }
                  const dev = cell.rate - overall;
                  const extreme = Math.abs(dev) > 0.15;
                  const bg = extreme
                    ? dev > 0
                      ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold'
                    : '';
                  return (
                    <td
                      key={aid}
                      className={`p-1 text-center font-mono ${bg}`}
                      title={`N=${cell.n} · 홈 ${cell.homeWins}/${cell.n}`}
                    >
                      {(cell.rate * 100).toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        값: 홈 승률 % (정수 반올림). hover 로 N 확인.
      </p>
    </section>
  );
}
