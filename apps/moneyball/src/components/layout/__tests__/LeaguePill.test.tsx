import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaguePill } from '../LeaguePill';

describe('LeaguePill', () => {
  it('renders KBO and MLB pills', () => {
    render(<LeaguePill activeLeague="kbo" />);
    expect(screen.getByText('KBO')).toBeDefined();
    expect(screen.getByText('MLB')).toBeDefined();
  });

  it('KBO active state', () => {
    render(<LeaguePill activeLeague="kbo" />);
    const kboPill = screen.getByText('KBO').closest('a');
    expect(kboPill?.getAttribute('aria-current')).toBe('page');
  });

  it('MLB pill link points to /mlb', () => {
    render(<LeaguePill activeLeague="kbo" />);
    const mlbLink = screen.getByText('MLB').closest('a');
    expect(mlbLink?.getAttribute('href')).toBe('/mlb');
  });

  it('KBO pill link points to /', () => {
    render(<LeaguePill activeLeague="mlb" />);
    const kboLink = screen.getByText('KBO').closest('a');
    expect(kboLink?.getAttribute('href')).toBe('/');
  });
});
