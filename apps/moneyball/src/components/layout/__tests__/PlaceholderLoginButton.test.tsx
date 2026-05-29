import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceholderLoginButton } from '../PlaceholderLoginButton';

describe('PlaceholderLoginButton', () => {
  it('renders ETA placeholder', () => {
    render(<PlaceholderLoginButton />);
    expect(screen.getByText(/박제 중/)).toBeDefined();
  });

  it('button is disabled', () => {
    render(<PlaceholderLoginButton />);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('ETA 박제 시점 명시 (2026-08~09)', () => {
    render(<PlaceholderLoginButton />);
    expect(screen.getByText(/2026-08~09/)).toBeDefined();
  });

  it('aria-describedby 박제 (accessibility)', () => {
    render(<PlaceholderLoginButton />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
  });
});
