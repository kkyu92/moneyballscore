import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Login, { metadata as loginMeta } from '../login/page';
import Settings, { metadata as settingsMeta } from '../settings/page';
import Community, { metadata as communityMeta } from '../community/page';

describe('Placeholder 페이지 3', () => {
  it.each([
    ['login', Login, '회원 기능'],
    ['settings', Settings, '설정'],
    ['community', Community, '커뮤니티'],
  ])('%s renders placeholder + ETA', (_name, Component, expectedText) => {
    render(<Component />);
    expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument();
    expect(screen.queryAllByText(/2026-08~09|박제 중/).length).toBeGreaterThan(0);
  });

  it.each([
    ['login', loginMeta],
    ['settings', settingsMeta],
    ['community', communityMeta],
  ])('%s exports robots noindex/nofollow metadata (plan #21 Step 2)', (_name, meta) => {
    const robots = meta.robots as { index?: boolean; follow?: boolean };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(false);
  });
});
