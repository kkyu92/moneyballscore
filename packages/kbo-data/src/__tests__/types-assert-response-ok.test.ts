import { describe, it, expect } from 'vitest';
import { assertResponseOk } from '../types';

function mockResponse(status: number, statusText = ''): Response {
  return { ok: status >= 200 && status < 300, status, statusText } as Response;
}

describe('assertResponseOk', () => {
  it('returns nothing on res.ok=true', () => {
    expect(() => assertResponseOk(mockResponse(200), 'X')).not.toThrow();
    expect(() => assertResponseOk(mockResponse(204), 'X')).not.toThrow();
  });

  it('throws with `${label}: ${status} ${statusText}` form when statusText present', () => {
    expect(() => assertResponseOk(mockResponse(500, 'Internal Server Error'), 'KBO API error')).toThrowError(
      'KBO API error: 500 Internal Server Error',
    );
  });

  it('throws with `${label}: ${status}` only when statusText empty (no trailing space)', () => {
    expect(() => assertResponseOk(mockResponse(404, ''), 'Naver record fetch X')).toThrowError(
      'Naver record fetch X: 404',
    );
  });

  it('label distinguishes 6 scraper sources', () => {
    const labels = [
      'KBO live API error',
      'KBO API error',
      'KBO pitcher basic error',
      'Naver schedule API error',
      'Naver record fetch ABC',
      'Fancy Stats leaders error',
    ];
    for (const label of labels) {
      expect(() => assertResponseOk(mockResponse(503), label)).toThrowError(`${label}: 503`);
    }
  });
});
