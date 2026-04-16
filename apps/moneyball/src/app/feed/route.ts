import { createClient } from '@/lib/supabase/server';
import { KBO_TEAMS, toKSTDateString, type TeamCode } from '@moneyball/shared';

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
        predicted_winner, confidence, prediction_type, is_correct,
        winner:teams!predictions_predicted_winner_fkey(code, name_ko)
      )
    `)
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: true })
    .limit(50);

  const items = (games ?? []).map((game: any) => {
    const pred = game.predictions?.[0];
    if (!pred) return null;

    const homeCode = game.home_team?.code as TeamCode;
    const awayCode = game.away_team?.code as TeamCode;
    const homeName = KBO_TEAMS[homeCode]?.name.split(' ')[0] ?? homeCode;
    const awayName = KBO_TEAMS[awayCode]?.name.split(' ')[0] ?? awayCode;
    const winnerName = KBO_TEAMS[pred.winner?.code as TeamCode]?.name.split(' ')[0] ?? '';
    const pct = Math.round((0.5 + pred.confidence / 2) * 100);

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
    <title>MoneyBall KBO — 세이버메트릭스 승부예측</title>
    <link>${SITE_URL}</link>
    <description>wOBA, FIP, WAR 등 세이버메트릭스 지표 기반 KBO 프로야구 매일 승부예측</description>
    <language>ko</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed" rel="self" type="application/rss+xml"/>
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
