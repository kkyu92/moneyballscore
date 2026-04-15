import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisLink } from '@/components/shared/AnalysisLink';

describe('AnalysisLink', () => {
  it('renders href with game id', () => {
    render(<AnalysisLink gameId={42} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/analysis/game/42');
  });

  it('default label is "AI 분석 보기"', () => {
    render(<AnalysisLink gameId={1} />);
    expect(screen.getByText('AI 분석 보기')).toBeInTheDocument();
  });

  it('custom label override', () => {
    render(<AnalysisLink gameId={1} label="상세 분석" />);
    expect(screen.getByText('상세 분석')).toBeInTheDocument();
  });

  it('aria-label includes game id', () => {
    render(<AnalysisLink gameId={99} />);
    expect(screen.getByLabelText(/경기 99/)).toBeInTheDocument();
  });

  it('min-height 44px for a11y touch target', () => {
    render(<AnalysisLink gameId={1} />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('min-h-[44px]');
  });
});
