import { describe, expect, it } from 'vitest';
import { assertSelectOk, type SelectResult } from '../pipeline/db-error';

describe('assertSelectOk — cycle 143 silent drift family helper', () => {
  it('정상 select (error null) → data 그대로 반환', () => {
    const result: SelectResult<{ id: number }[]> = {
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    };
    const { data } = assertSelectOk(result, 'test');
    expect(data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('정상 count (head: true 모드) → count 그대로 반환', () => {
    const result: SelectResult<unknown> = {
      count: 5,
      error: null,
    };
    const { count } = assertSelectOk(result, 'test');
    expect(count).toBe(5);
  });

  it('data null + error null (maybeSingle 빈 row) → data null 정상', () => {
    const result: SelectResult<{ id: number }> = {
      data: null,
      error: null,
    };
    const { data } = assertSelectOk(result, 'test');
    expect(data).toBeNull();
  });

  it('count null + error null (count 0 또는 미지원) → count null 정상', () => {
    const result: SelectResult<unknown> = {
      count: null,
      error: null,
    };
    const { count } = assertSelectOk(result, 'test');
    expect(count).toBeNull();
  });

  it('error 존재 시 명시적 throw (silent fallback 차단)', () => {
    const result: SelectResult<unknown> = {
      data: null,
      error: { message: 'connection refused' },
    };
    expect(() => assertSelectOk(result, 'runPredict existing')).toThrow(
      'runPredict existing select failed: connection refused',
    );
  });

  it('error + data 동시 존재 (drift 케이스) → throw 우선', () => {
    const result: SelectResult<{ id: number }[]> = {
      data: [{ id: 1 }],
      error: { message: 'partial result' },
    };
    expect(() => assertSelectOk(result, 'gap count')).toThrow(
      'gap count select failed: partial result',
    );
  });

  it('context 문자열이 throw 메시지에 박제됨 (영역 식별 가시성)', () => {
    const result: SelectResult<unknown> = {
      data: null,
      error: { message: 'syntax error' },
    };
    expect(() => assertSelectOk(result, 'todayTotal count')).toThrow(
      'todayTotal count select failed: syntax error',
    );
  });

  it('count + data 둘 다 부재 시 둘 다 null 정상화', () => {
    const result: SelectResult<unknown> = {
      error: null,
    };
    const out = assertSelectOk(result, 'test');
    expect(out.data).toBeNull();
    expect(out.count).toBeNull();
  });
});
