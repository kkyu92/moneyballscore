import { KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import type { PipelineResult } from '../types';

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
    `<b>⚾ ${result.date} KBO 승부예측</b>`,
    `경기 ${result.gamesFound}개 | 예측 ${result.predictionsGenerated}개 | 스킵 ${result.gamesSkipped}개`,
    '',
  ];

  for (const pred of predictions) {
    const home = KBO_TEAMS[pred.homeTeam].name.split(' ')[0];
    const away = KBO_TEAMS[pred.awayTeam].name.split(' ')[0];
    const winner = KBO_TEAMS[pred.predictedWinner].name.split(' ')[0];
    const pct = Math.round(pred.homeWinProb * 100);
    const conf = pred.confidence >= 0.3 ? '🔥' : pred.confidence >= 0.15 ? '📊' : '⚖️';

    lines.push(`${conf} ${away} vs ${home} → <b>${winner}</b> (${pct}%)`);
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`⚠️ 에러 ${result.errors.length}건`);
  }

  lines.push('');
  lines.push(`🔗 <a href="https://moneyball-kbo.vercel.app/predictions/${result.date}">상세 보기</a>`);

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
    const home = KBO_TEAMS[r.homeTeam].name.split(' ')[0];
    const away = KBO_TEAMS[r.awayTeam].name.split(' ')[0];
    const mark = r.isCorrect ? '✅' : '❌';
    lines.push(`${mark} ${away} ${r.awayScore}:${r.homeScore} ${home}`);
  }

  lines.push('');
  lines.push(`🔗 <a href="https://moneyball-kbo.vercel.app/dashboard">대시보드</a>`);

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
