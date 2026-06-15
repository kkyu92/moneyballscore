import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PWAInstallButton } from '../PWAInstallButton';

const pathnameMock = vi.fn<() => string | null>(() => null);
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

describe('PWAInstallButton', () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue(null);
    try {
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  it('does not render before beforeinstallprompt fires', () => {
    const { container } = render(<PWAInstallButton />);
    expect(container.firstChild).toBeNull();
  });

  it('renders prompt UI after beforeinstallprompt event', () => {
    render(<PWAInstallButton />);

    act(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
      };
      event.prompt = () => Promise.resolve();
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    expect(screen.getByText('앱으로 설치')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설치' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '나중에' })).toBeInTheDocument();
  });

  it('hides after user dismisses', () => {
    render(<PWAInstallButton />);

    act(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
      };
      event.prompt = () => Promise.resolve();
      event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
      window.dispatchEvent(event);
    });

    const dismissBtn = screen.getByRole('button', { name: '나중에' });
    act(() => {
      dismissBtn.click();
    });

    expect(screen.queryByText('앱으로 설치')).toBeNull();
  });

  it('respects sessionStorage dismiss flag', () => {
    try {
      window.sessionStorage.setItem('pwa-install-dismissed', '1');
    } catch {
      // private mode — skip test gracefully
      return;
    }

    const { container } = render(<PWAInstallButton />);

    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders English copy on /en/* routes', () => {
    pathnameMock.mockReturnValue('/en/mlb');
    render(<PWAInstallButton />);

    act(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
      };
      event.prompt = () => Promise.resolve();
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    expect(screen.getByText('Install as app')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Later' })).toBeInTheDocument();
    expect(screen.queryByText('앱으로 설치')).toBeNull();
  });
});
