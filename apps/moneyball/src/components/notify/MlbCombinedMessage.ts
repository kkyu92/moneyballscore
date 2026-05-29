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

const BIG_GAME_THRESHOLD = 0.65;
const MAX_TELEGRAM_LENGTH = 4096;

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
      const isBig = g.bigGame || g.confidence > BIG_GAME_THRESHOLD;
      const mark = isBig ? '⭐ ' : '';
      const conf = Math.round(g.confidence * 100);
      lines.push(`${mark}${g.home} vs ${g.away} → ${g.predicted} ${conf}%`);
    });
  }

  return lines.join('\n');
}

export function splitMessage(text: string): string[] {
  if (text.length <= MAX_TELEGRAM_LENGTH) return [text];

  const parts: string[] = [];
  const lines = text.split('\n');
  let current = '';

  const flushOversize = (line: string) => {
    if (line.length <= MAX_TELEGRAM_LENGTH) return [line];
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += MAX_TELEGRAM_LENGTH) {
      chunks.push(line.slice(i, i + MAX_TELEGRAM_LENGTH));
    }
    return chunks;
  };

  for (const line of lines) {
    if (line.length > MAX_TELEGRAM_LENGTH) {
      if (current) { parts.push(current); current = ''; }
      flushOversize(line).forEach((c) => parts.push(c));
      continue;
    }
    const sep = current ? 1 : 0;  // newline 박제 시점만 +1
    if (current.length + sep + line.length > MAX_TELEGRAM_LENGTH) {
      parts.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) parts.push(current);

  return parts;
}
