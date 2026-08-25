import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2595 polish-ui (2-chain lock fallback): contact/page.tsx 문의 유형
// "메일 쓰기" CTA 만 rounded-md, 같은 li family 컨테이너(rounded-lg)와
// 사이트 전역 bg-brand-500/600 primary 버튼(13건 전부 rounded-lg) 대비 이탈.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2595 — contact 문의 유형 메일 쓰기 버튼 border-radius', () => {
  it('메일 쓰기 CTA가 사이트 전역 primary 버튼 컨벤션(rounded-lg)과 정렬', () => {
    expect(src).toContain(
      'bg-brand-500 text-white rounded-lg hover:bg-brand-600',
    );
    expect(src).not.toContain('bg-brand-500 text-white rounded-md');
  });
});
