import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Login from '../login/page';
import Settings from '../settings/page';
import Community from '../community/page';

describe('Placeholder 페이지 3', () => {
  it.each([
    ['login', Login, '회원 기능'],
    ['settings', Settings, '설정'],
    ['community', Community, '커뮤니티'],
  ])('%s renders placeholder + ETA', (_name, Component, expectedText) => {
    render(<Component />);
    expect(screen.getByText(new RegExp(expectedText))).toBeDefined();
    expect(screen.queryAllByText(/2026-08~09|박제 중/).length).toBeGreaterThan(0);
  });
});
