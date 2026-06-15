import { describe, expect, it } from 'vitest';
import { shouldNotifyPipelineStatus } from '../pipeline/notify-status-predicate';

describe('shouldNotifyPipelineStatus (cycle 1191 wave 20)', () => {
  describe('predict mode', () => {
    it('predictions>0 + errors=[] → notify (정상 성공)', () => {
      expect(shouldNotifyPipelineStatus('predict', 5, 0)).toBe(true);
    });

    it('predictions=0 + errors=[] → silent (legitimate window_too_early / already_predicted)', () => {
      expect(shouldNotifyPipelineStatus('predict', 0, 0)).toBe(false);
    });

    it('predictions=0 + errors>0 → notify (wave 20 신규 fix — 명시적 실패 즉시 가시)', () => {
      expect(shouldNotifyPipelineStatus('predict', 0, 1)).toBe(true);
    });

    it('predictions>0 + errors>0 → notify (부분 성공)', () => {
      expect(shouldNotifyPipelineStatus('predict', 3, 2)).toBe(true);
    });
  });

  describe('predict_final mode — 항상 notify (silent drift alert 와 별개 status 채널)', () => {
    it('predictions=0 + errors=[] → notify', () => {
      expect(shouldNotifyPipelineStatus('predict_final', 0, 0)).toBe(true);
    });
    it('predictions>0 + errors>0 → notify', () => {
      expect(shouldNotifyPipelineStatus('predict_final', 5, 1)).toBe(true);
    });
  });

  describe('verify mode — 항상 notify', () => {
    it('predictions=0 + errors=[] → notify', () => {
      expect(shouldNotifyPipelineStatus('verify', 0, 0)).toBe(true);
    });
  });

  describe('announce / mlb / 기타 — silent (status 채널 미사용)', () => {
    it('announce → silent', () => {
      expect(shouldNotifyPipelineStatus('announce', 0, 0)).toBe(false);
    });
    it('mlb_predict_final → silent (별도 채널)', () => {
      expect(shouldNotifyPipelineStatus('mlb_predict_final', 5, 0)).toBe(false);
    });
    it('mlb_statsapi_scrape → silent', () => {
      expect(shouldNotifyPipelineStatus('mlb_statsapi_scrape', 5, 0)).toBe(false);
    });
  });
});
