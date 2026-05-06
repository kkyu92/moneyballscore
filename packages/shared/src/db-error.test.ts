import { describe, it, expect } from 'vitest';
import {
  assertSelectOk,
  assertWriteOk,
  type SelectResult,
  type WriteResult,
} from './db-error';

describe('assertSelectOk', () => {
  it('error null 시 data + count 반환', () => {
    const result: SelectResult<{ id: number }> = {
      data: { id: 1 },
      count: null,
      error: null,
    };
    const out = assertSelectOk(result, 'test.select.basic');
    expect(out.data).toEqual({ id: 1 });
    expect(out.count).toBeNull();
  });

  it('error 존재 시 throw + context 포함', () => {
    const result: SelectResult<unknown> = {
      data: null,
      count: null,
      error: { message: 'permission denied' },
    };
    expect(() => assertSelectOk(result, 'test.select.fail')).toThrow(
      'test.select.fail select failed: permission denied',
    );
  });

  it('data null 은 정상 케이스 (maybeSingle 빈 row)', () => {
    const result: SelectResult<unknown> = {
      data: null,
      count: null,
      error: null,
    };
    const out = assertSelectOk(result, 'test.select.empty');
    expect(out.data).toBeNull();
  });

  it('count 모드 (head:true) 정상 반환', () => {
    const result: SelectResult<unknown> = {
      data: null,
      count: 42,
      error: null,
    };
    const out = assertSelectOk(result, 'test.select.count');
    expect(out.count).toBe(42);
  });
});

describe('assertWriteOk (cycle 168 write 측 첫 진입)', () => {
  it('error null 시 throw 없이 통과', () => {
    const result: WriteResult = { error: null };
    expect(() => assertWriteOk(result, 'test.write.ok')).not.toThrow();
  });

  it('error 존재 시 throw + context 포함', () => {
    const result: WriteResult = {
      error: { message: 'unique violation' },
    };
    expect(() => assertWriteOk(result, 'test.write.fail')).toThrow(
      'test.write.fail write failed: unique violation',
    );
  });

  it('void 반환 (write 결과 데이터 사용 안 함)', () => {
    const result: WriteResult = { error: null };
    const out = assertWriteOk(result, 'test.write.void');
    expect(out).toBeUndefined();
  });
});
