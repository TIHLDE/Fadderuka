'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '~/components/ui/theme-provider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      aria-label="Bytt fargetema"
      className={className}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      type="button"
    >
      {theme === 'dark' ? (
        <Moon className="h-[18px] w-[18px]" />
      ) : (
        <Sun className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
