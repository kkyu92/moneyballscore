import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Test infrastructure smoke', () => {
  it('renders text', () => {
    render(<div>hello world</div>);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });
});
