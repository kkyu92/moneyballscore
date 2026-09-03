import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2870 polish-ui (2-chain lock fallback): /dashboard 는 색인 허용(robots disallow 미포함) +
// sitemap.xml 등재(priority 0.8) + 커스텀 OG 메타데이터(title/description) 를 갖췄으나
// opengraph-image.tsx/twitter-image.tsx 전용 파일이 없어 루트 기본 이미지로 폴백 —
// accuracy/standings 등 동급 색인 페이지와의 패리티 누락 (silent SEO gap family, wave-144 계열 재발).

describe('silent drift cycle 2870 — dashboard OG/twitter 이미지 패리티', () => {
  it('opengraph-image.tsx 가 design-tokens BRAND_GRADIENT_KBO_135 를 사용한다 (raw hex 아님)', () => {
    const src = readFileSync(join(__dirname, '../opengraph-image.tsx'), 'utf8');
    expect(src).toContain('BRAND_GRADIENT_KBO_135');
    expect(src).toContain('from "@/lib/design-tokens"');
  });

  it('twitter-image.tsx 가 opengraph-image 를 재-export 한다 (accuracy/standings 동일 패턴)', () => {
    const src = readFileSync(join(__dirname, '../twitter-image.tsx'), 'utf8');
    expect(src).toContain('export { default } from "./opengraph-image"');
  });
});
