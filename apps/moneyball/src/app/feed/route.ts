import { createClient } from '@/lib/supabase/server';
import { type TeamCode, shortTeamName } from '@moneyball/shared';
import { getRecentWeeks } from '@/lib/reviews/computeWeekRange';
import { getRecentMonths } from '@/lib/reviews/computeMonthRange';

export const revalidate = 3600;

const SITE_URL = 'https://moneyballscore.vercel.app';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const supabase = await createClient();

  const { data: games } = await supabase
    .from('games')
    .select(`
      id, game_date, game_time, status, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code, name_ko),
      away_team:teams!games_away_team_id_fkey(code, name_ko),
      predictions!inner(
        predicted_winner, confidence, reasoning, prediction_type, is_correct,
        winner:teams!predictions_predicted_winner_fkey(code, name_ko)
      )
    `)
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: true })
    .limit(50);

  const reviewItems: string[] = [];

  const recentWeeks = getRecentWeeks(3);
  for (const w of recentWeeks) {
    const pubDate = new Date(`${w.endDate}T23:59:00+09:00`).toUTCString();
    reviewItems.push(`    <item>
      <title>${escapeXml(`${w.label} 주간 리뷰`)}</title>
      <link>${SITE_URL}/reviews/weekly/${w.weekId}</link>
      <guid isPermaLink="true">${SITE_URL}/reviews/weekly/${w.weekId}</guid>
      <description>${escapeXml(`${w.label} 주간 예측 적중률·하이라이트·팀별 성과·팩터 인사이트`)}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`);
  }

  const recentMonths = getRecentMonths(2);
  for (const m of recentMonths) {
    const pubDate = new Date(`${m.endDate}T23:59:00+09:00`).toUTCString();
    reviewItems.push(`    <item>
      <title>${escapeXml(`${m.label} 월간 리뷰`)}</title>
      <link>${SITE_URL}/reviews/monthly/${m.monthId}</link>
      <guid isPermaLink="true">${SITE_URL}/reviews/monthly/${m.monthId}</guid>
      <description>${escapeXml(`${m.label} 월간 예측 성과 · 전월 대비 diff · 팀 순위 · 팩터 장기 트렌드`)}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`);
  }

  const missesPubDate = new Date().toUTCString();
  reviewItems.push(`    <item>
      <title>${escapeXml("회고: 크게 빗나간 예측")}</title>
      <link>${SITE_URL}/reviews/misses</link>
      <guid isPermaLink="false">${SITE_URL}/reviews/misses</guid>
      <description>${escapeXml("고확신으로 틀린 예측의 사후 분석 — 편향 지목 팩터와 놓친 것을 투명하게 공개")}</description>
      <pubDate>${missesPubDate}</pubDate>
    </item>`);

  interface FeedGameRow {
    id: number;
    game_date: string;
    game_time: string | null;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
    predictions: Array<{
      predicted_winner: number | null;
      confidence: number;
      reasoning: { homeWinProb?: number } | null;
      prediction_type: string;
      is_correct: boolean | null;
      winner: { code: string | null; name_ko: string | null } | null;
    }>;
  }
  const feedGames = (games ?? []) as unknown as FeedGameRow[];

  const items = feedGames.map((game) => {
    const pred = game.predictions?.[0];
    if (!pred) return null;

    const homeCode = game.home_team?.code as TeamCode;
    const awayCode = game.away_team?.code as TeamCode;
    const homeName = shortTeamName(homeCode);
    const awayName = shortTeamName(awayCode);
    const winnerName = shortTeamName(pred.winner?.code as TeamCode);
    // 예측 승자 적중 확률 = max(hwp, 1-hwp). reasoning.homeWinProb 부재 시 confidence fallback.
    const hwp = pred.reasoning?.homeWinProb;
    const winnerProb = hwp != null
      ? Math.max(hwp, 1 - hwp)
      : 0.5 + pred.confidence / 2;
    const pct = Math.round(winnerProb * 100);

    const isFinal = game.status === 'final';
    const resultTag = isFinal && pred.is_correct != null
      ? (pred.is_correct ? ' [적중]' : ' [실패]')
      : '';

    const title = `${awayName} vs ${homeName} — ${winnerName} ${pct}% 승 예측${resultTag}`;
    const description = isFinal
      ? `${awayName} ${game.away_score} : ${game.home_score} ${homeName}. AI 예측: ${winnerName} 승 (${pct}%).`
      : `${game.game_date} ${game.game_time?.slice(0, 5)} 경기. AI 예측: ${winnerName} 승 (${pct}%).`;

    const pubDate = new Date(`${game.game_date}T${game.game_time ?? '18:30'}+09:00`).toUTCString();

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${SITE_URL}/analysis/game/${game.id}</link>
      <guid isPermaLink="true">${SITE_URL}/analysis/game/${game.id}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
  }).filter(Boolean);

  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MoneyBall Score — 세이버메트릭스 승부예측</title>
    <link>${SITE_URL}</link>
    <description>wOBA, FIP, WAR 등 세이버메트릭스 지표 기반 프로야구 매일 승부예측</description>
    <language>ko</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed" rel="self" type="application/rss+xml"/>
${reviewItems.join('\n')}
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
