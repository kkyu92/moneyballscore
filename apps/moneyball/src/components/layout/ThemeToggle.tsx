'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  const icon = theme === 'dark' ? '\u{1F319}' : theme === 'light' ? '\u{2600}\u{FE0F}' : '\u{1F4BB}';
  const label = theme === 'dark' ? '다크' : theme === 'light' ? '라이트' : '시스템';

  return (
    <button
      onClick={next}
      className="p-2 text-brand-200 hover:text-white transition-colors text-sm"
      aria-label={`테마: ${label}`}
      title={`테마: ${label}`}
    >
      {icon}
    </button>
  );
}
