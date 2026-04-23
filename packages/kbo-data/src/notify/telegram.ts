import {
  KBO_TEAMS,
  shortTeamName,
  classifyWinnerProb,
  WINNER_TIER_EMOJI,
  WINNER_TIER_LABEL,
  winnerProbOf,
} from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import type { PipelineResult, ScrapedGame } from '../types';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return { token, chatId };
}

async function sendMessage(text: string, parseMode: 'HTML' | 'MarkdownV2' = 'HTML') {
  const { token, chatId } = getConfig();
  if (!token || !chatId) {
    console.warn('[Telegram] BOT_TOKEN or CHAT_ID not configured, skipping');
    return;
  }

  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[Telegram] Send failed: ${res.status} ${err}`);
  }
}

/**
 * 예측 생성 완료 알림
 */
export async function notifyPredictions(
  result: PipelineResult,
  predictions: Array<{
    homeTeam: TeamCode;
    awayTeam: TeamCode;
    predictedWinner: TeamCode;
    confidence: number;
    homeWinProb: number;
  }>
) {
  const lines = [
    `<b>⚾ ${result.date} 승부예측</b>`,
    `경기 ${result.gamesFound}개 | 예측 ${result.predictionsGenerated}개 | 스킵 ${result.gamesSkipped}개`,
    '',
  ];

  for (const pred of predictions) {
    const home = shortTeamName(pred.homeTeam);
    const away = shortTeamName(pred.awayTeam);
    const winner = shortTeamName(pred.predictedWinner);
    // 예측 승자 적중 확률 = max(hwp, 1-hwp). 홈/원정 무관 "우리 예측이 맞을 확률".
    const pct = Math.round(winnerProbOf(pred.homeWinProb) * 100);
    const tier = classifyWinnerProb(pred.homeWinProb);
    const emoji = WINNER_TIER_EMOJI[tier];
    // Telegram 은 "적중" 단어로 사용자에게 익숙한 기존 카피 유지.
    const label = tier === 'confident' ? '적중' : WINNER_TIER_LABEL[tier];

    lines.push(`${emoji} <b>${label}</b> ${away} vs ${home} → <b>${winner}</b> ${pct}%`);
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`⚠️ 에러 ${result.errors.length}건`);
  }

  lines.push('');
  lines.push(`🔗 <a href="https://moneyballscore.vercel.app/predictions/${result.date}">상세 보기</a>`);

  await sendMessage(lines.join('\n'));
}

/**
 * 결과 검증 완료 알림
 */
export async function notifyResults(
  date: string,
  results: Array<{
    homeTeam: TeamCode;
    awayTeam: TeamCode;
    predictedWinner: TeamCode;
    actualWinner: TeamCode;
    isCorrect: boolean;
    homeScore: number;
    awayScore: number;
  }>
) {
  if (results.length === 0) return;

  const correct = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 70 ? '🎯' : pct >= 50 ? '✅' : '😅';

  const lines = [
    `<b>${emoji} ${date} 결과: ${correct}/${total} 적중 (${pct}%)</b>`,
    '',
  ];

  for (const r of results) {
    const home = shortTeamName(r.homeTeam);
    const away = shortTeamName(r.awayTeam);
    const mark = r.isCorrect ? '✅' : '❌';
    lines.push(`${mark} ${away} ${r.awayScore}:${r.homeScore} ${home}`);
  }

  lines.push('');
  lines.push(`🔗 <a href="https://moneyballscore.vercel.app/dashboard">대시보드</a>`);

  await sendMessage(lines.join('\n'));
}

/**
 * 에러 알림
 */
export async function notifyError(context: string, error: string) {
  await sendMessage(
    `<b>🚨 MoneyBall 에러</b>\n\n<b>Context:</b> ${context}\n<b>Error:</b> <code>${error}</code>`
  );
}

/**
 * PLAN_v5 §4.4 — 하루 시작 09:00 KST 예고 알림.
 * 오늘 편성 + 예측 생성 예상 시각 안내.
 */
export async function notifyAnnounce(
  date: string,
  games: ScrapedGame[],
  estimatedTime: string,
) {
  if (games.length === 0) {
    await sendMessage(`<b>⚾ ${date} KBO</b>\n\n오늘 편성된 경기가 없습니다.`);
    return;
  }

  const active = games.filter((g) => g.status !== 'postponed');
  const cancelled = games.filter((g) => g.status === 'postponed');

  const lines = [
    `<b>⚾ ${date} KBO 오늘의 경기</b>`,
    '',
    `편성 ${games.length}경기${cancelled.length > 0 ? ` (취소 ${cancelled.length})` : ''}:`,
  ];

  for (const g of active) {
    const home = shortTeamName(g.homeTeam);
    const away = shortTeamName(g.awayTeam);
    lines.push(`• ${g.gameTime} ${away} vs ${home} (${g.stadium})`);
  }

  if (cancelled.length > 0) {
    lines.push('');
    for (const g of cancelled) {
      const home = shortTeamName(g.homeTeam);
      const away = shortTeamName(g.awayTeam);
      lines.push(`🚫 ${g.gameTime} ${away} vs ${home} — 경기 취소`);
    }
  }

  lines.push('');
  if (active.length > 0) {
    lines.push(`🔔 예측 알림: ${estimatedTime} 전체 ${active.length}경기 한번에 전송`);
    lines.push('<i>※ 선발투수 확정 시 순차 예측. 경기 시작까지 미확정이면 해당 경기는 "예측 기록 없음" 으로 표시.</i>');
    lines.push('');
  }
  lines.push(`🔗 <a href="https://moneyballscore.vercel.app/">자세히</a>`);

  await sendMessage(lines.join('\n'));
}

/**
 * 파이프라인 상태 요약 알림
 */
export async function notifyPipelineStatus(
  result: PipelineResult,
  durationMs: number
) {
  const status = result.errors.length > 0
    ? (result.predictionsGenerated > 0 ? '⚠️ 부분 성공' : '❌ 실패')
    : '✅ 성공';

  await sendMessage(
    `<b>Pipeline ${status}</b>\n` +
    `날짜: ${result.date}\n` +
    `경기: ${result.gamesFound} | 예측: ${result.predictionsGenerated} | 스킵: ${result.gamesSkipped}\n` +
    `소요: ${(durationMs / 1000).toFixed(1)}초` +
    (result.errors.length > 0 ? `\n에러: ${result.errors[0]}` : '')
  );
}
