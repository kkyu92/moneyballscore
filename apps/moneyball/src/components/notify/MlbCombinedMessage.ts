export interface RecapPayload {
  date: string;
  games: number;
  correct: number;
  brier: number;
}

export interface PreviewGame {
  home: string;
  away: string;
  predicted: string;
  confidence: number;
  bigGame: boolean;
}

export interface PreviewPayload {
  date: string;
  games: PreviewGame[];
}

import { TELEGRAM_MAX_MESSAGE_LENGTH, WINNER_PROB_CONFIDENT } from '@moneyball/shared';

export function formatMlbCombinedMessage(
  payload: { recap: RecapPayload; preview: PreviewPayload },
): string {
  const lines: string[] = [];

  if (payload.recap.games > 0) {
    lines.push(`[MLB recap] ${payload.recap.date}`);
    lines.push(`어제 ${payload.recap.games}경기 / 적중 ${payload.recap.correct}/${payload.recap.games}`);
    lines.push(`Brier ${payload.recap.brier.toFixed(3)}`);
    lines.push('');
  }

  if (payload.preview.games.length > 0) {
    lines.push(`[MLB preview] ${payload.preview.date} 새벽 경기`);
    payload.preview.games.forEach((g) => {
      const isBig = g.bigGame || g.confidence > WINNER_PROB_CONFIDENT;
      const mark = isBig ? '⭐ ' : '';
      const conf = Math.round(g.confidence * 100);
      lines.push(`${mark}${g.home} vs ${g.away} → ${g.predicted} ${conf}%`);
    });
  }

  return lines.join('\n');
}

export function splitMessage(text: string): string[] {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return [text];

  const parts: string[] = [];
  const lines = text.split('\n');
  let current = '';

  const flushOversize = (line: string) => {
    if (line.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return [line];
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += TELEGRAM_MAX_MESSAGE_LENGTH) {
      chunks.push(line.slice(i, i + TELEGRAM_MAX_MESSAGE_LENGTH));
    }
    return chunks;
  };

  for (const line of lines) {
    if (line.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      if (current) { parts.push(current); current = ''; }
      flushOversize(line).forEach((c) => parts.push(c));
      continue;
    }
    const sep = current ? 1 : 0;  // newline 박제 시점만 +1
    if (current.length + sep + line.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      parts.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) parts.push(current);

  return parts;
}
