import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ServiceWorkerRegister } from '../ServiceWorkerRegister';

describe('ServiceWorkerRegister', () => {
  it('renders nothing', () => {
    const { container } = render(<ServiceWorkerRegister />);
    expect(container.firstChild).toBeNull();
  });

  it('skips register in non-production environment', () => {
    // NODE_ENV = 'test' in vitest by default — register should silent skip
    // navigator.serviceWorker may not exist in jsdom — both paths exit early
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
  });
});
