import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FactorErrorsBars } from '@/components/analysis/FactorErrorsBars';

describe('FactorErrorsBars', () => {
  it('empty → "데이터 없음" placeholder', () => {
    render(<FactorErrorsBars errors={[]} />);
    expect(screen.getByText(/데이터 없음/)).toBeInTheDocument();
  });

  it('양의 편향(+) → 녹색 (홈 유리)', () => {
    const { container } = render(
      <FactorErrorsBars
        errors={[{ factor: 'home_bullpen_fip', predictedBias: 0.15 }]}
      />
    );
    // bar element with factor-favor class
    const bar = container.querySelector('.bg-\\[var\\(--color-factor-favor\\)\\]');
    expect(bar).toBeInTheDocument();
  });

  it('음의 편향(-) → 오렌지 (원정 유리)', () => {
    const { container } = render(
      <FactorErrorsBars
        errors={[{ factor: 'away_recent_form', predictedBias: -0.12 }]}
      />
    );
    const bar = container.querySelector('.bg-\\[var\\(--color-factor-against\\)\\]');
    expect(bar).toBeInTheDocument();
  });

  it('factor 이름 표시', () => {
    render(
      <FactorErrorsBars
        errors={[
          { factor: 'home_sp_fip', predictedBias: 0.08 },
          { factor: 'away_lineup_woba', predictedBias: -0.05 },
        ]}
      />
    );
    expect(screen.getByText('home_sp_fip')).toBeInTheDocument();
    expect(screen.getByText('away_lineup_woba')).toBeInTheDocument();
  });

  it('편향 수치 +0.08 포맷팅', () => {
    render(
      <FactorErrorsBars errors={[{ factor: 'f1', predictedBias: 0.08 }]} />
    );
    expect(screen.getByText('+0.08')).toBeInTheDocument();
  });

  it('diagnosis 표시', () => {
    render(
      <FactorErrorsBars
        errors={[
          {
            factor: 'home_bullpen_fip',
            predictedBias: 0.15,
            diagnosis: '9회 블론 세이브로 역전',
          },
        ]}
      />
    );
    expect(screen.getByText(/9회 블론/)).toBeInTheDocument();
  });

  it('aria-label 포함 (scren reader)', () => {
    render(
      <FactorErrorsBars
        errors={[{ factor: 'home_bullpen_fip', predictedBias: 0.15 }]}
      />
    );
    expect(
      screen.getByLabelText(/home_bullpen_fip 편향 \+0.15/)
    ).toBeInTheDocument();
  });
});
