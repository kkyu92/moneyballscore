import { describe, it, expect } from 'vitest';
import { formatMlbCombinedMessage, splitMessage } from '../MlbCombinedMessage';

describe('MlbCombinedMessage', () => {
  it('formats recap + preview combined', () => {
    const msg = formatMlbCombinedMessage({
      recap: { date: '2026-05-28', games: 5, correct: 3, brier: 0.245 },
      preview: { date: '2026-05-29', games: [
        { home: 'LAD', away: 'NYY', predicted: 'LAD', confidence: 0.62, bigGame: true },
        { home: 'BOS', away: 'TOR', predicted: 'BOS', confidence: 0.55, bigGame: false },
      ]},
    });

    expect(msg).toContain('[MLB recap]');
    expect(msg).toContain('어제 5경기');
    expect(msg).toContain('3/5');
    expect(msg).toContain('0.245');
    expect(msg).toContain('[MLB preview]');
    expect(msg).toContain('LAD vs NYY');
    expect(msg).toContain('⭐'); // 빅매치 마크
  });

  it('splits messages > 4096 char', () => {
    const longMsg = 'a'.repeat(5000);
    const parts = splitMessage(longMsg);
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(4096));
  });

  it('returns empty string when both recap.games=0 and preview.games=[]', () => {
    const msg = formatMlbCombinedMessage({
      recap: { date: '2026-05-28', games: 0, correct: 0, brier: 0 },
      preview: { date: '2026-05-29', games: [] },
    });
    expect(msg).toBe('');
  });

  it('빅매치 criteria = confidence > 0.65 또는 bigGame=true', () => {
    const msg = formatMlbCombinedMessage({
      recap: { date: '2026-05-28', games: 0, correct: 0, brier: 0 },
      preview: { date: '2026-05-29', games: [
        { home: 'LAD', away: 'NYY', predicted: 'LAD', confidence: 0.66, bigGame: false },
      ]},
    });
    expect(msg).toContain('⭐'); // confidence > 0.65 자동 빅매치
  });
});
