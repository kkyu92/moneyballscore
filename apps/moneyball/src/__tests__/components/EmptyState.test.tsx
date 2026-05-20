import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/shared/EmptyState';

describe('EmptyState', () => {
  it('inline size → span text only', () => {
    const { container } = render(<EmptyState size="inline" title="기록 없음" />);
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span?.textContent).toBe('기록 없음');
    expect(container.querySelector('div[role="status"]')).toBeNull();
  });

  it('md size (default) → card with title', () => {
    render(<EmptyState title="예측 기록이 아직 없습니다" />);
    expect(screen.getByText('예측 기록이 아직 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('description + icon render', () => {
    render(
      <EmptyState
        icon="⚾"
        title="기록 없음"
        description="시즌 경기가 진행되면 자동 집계됩니다"
      />,
    );
    expect(screen.getByText('⚾')).toBeInTheDocument();
    expect(
      screen.getByText('시즌 경기가 진행되면 자동 집계됩니다'),
    ).toBeInTheDocument();
  });

  it('cta → link with href', () => {
    render(
      <EmptyState
        title="검색 결과가 없습니다"
        cta={{ href: '/predictions', label: '예측 보기' }}
      />,
    );
    const link = screen.getByRole('link', { name: '예측 보기' });
    expect(link).toHaveAttribute('href', '/predictions');
  });

  it('lg size → p-10 padding', () => {
    const { container } = render(
      <EmptyState size="lg" title="없음" />,
    );
    expect(container.querySelector('.p-10')).toBeInTheDocument();
  });
});
