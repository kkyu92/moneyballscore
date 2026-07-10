import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopStatPickCard } from '@/components/predictions/TopStatPickCard';

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: {
    src: string; alt: string; width: number; height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

describe('TopStatPickCard — cycle 1537 polish-ui wave-238 regression guard', () => {
  const defaultProps = {
    gameId: 1001,
    homeTeam: 'LG' as const,
    awayTeam: 'KT' as const,
    homeWinProb: 0.62,
    date: '2026-07-10',
  };

  it('aria-labelledby="top-stat-pick-title" 박제 (a11y)', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const section = screen.getByRole('region', { name: /LG|KT/i });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-labelledby', 'top-stat-pick-title');
  });

  it('id="top-stat-pick-title" 박제 (aria-labelledby 참조)', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const title = document.getElementById('top-stat-pick-title');
    expect(title).not.toBeNull();
  });

  it('팩터 분석 보기 link aria-label 박제 (팀명 포함)', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label');
    expect(link.getAttribute('aria-label')).toMatch(/팩터 분석 보기/);
  });

  it('CSS var 색상 badge — bg-[var(--color-accent)]/20 박제 (hardcoded hex 아닌 token)', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const badge = screen.getByText('통계 모델 추천 픽');
    expect(badge.className).toContain('var(--color-accent)');
    expect(badge.className).not.toContain('#c5a23e');
  });

  it('link hover — CSS var text-[var(--color-accent-light)] 박제', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('var(--color-accent-light)');
    expect(link.className).not.toContain('#e2c96b');
  });

  it('팀 로고 img 2개 박제 (TeamLogo 양팀)', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const logos = screen.getAllByRole('img');
    expect(logos.length).toBeGreaterThanOrEqual(2);
  });

  it('favoredTeam 로고 size=48 박제', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const imgs = screen.getAllByRole('img');
    const sizes = imgs.map(img => Number(img.getAttribute('width')));
    expect(sizes).toContain(48);
  });

  it('win probability % 표시', () => {
    render(<TopStatPickCard {...defaultProps} />);
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('underdogTeam opacity-60 시각 계층', () => {
    render(<TopStatPickCard {...defaultProps} />);
    const container = document.querySelector('.opacity-60');
    expect(container).not.toBeNull();
  });
});
