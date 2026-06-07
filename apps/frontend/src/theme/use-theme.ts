import { useContext } from 'react';

import type { ThemeContextValue } from '@/theme/theme-context';
import { ThemeContext } from '@/theme/theme-context';

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
