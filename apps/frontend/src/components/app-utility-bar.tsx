import type { ReactNode } from 'react';

import { ThemeToggleButton } from '@/theme/theme-toggle-button';

interface AppUtilityBarProps {
  readonly children?: ReactNode;
}

/** Top-right utility strip for pages without the main navbar (auth, etc.). */
export function AppUtilityBar({ children }: AppUtilityBarProps) {
  return (
    <header className="app-utility-bar">
      <div className="app-utility-bar__inner">
        <div className="app-utility-bar__spacer" aria-hidden />
        <div className="app-header-actions">
          {children}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
