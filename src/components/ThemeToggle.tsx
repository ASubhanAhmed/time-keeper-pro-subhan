import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Palette } from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'gold';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as ThemeMode | null;
      if (stored && ['light', 'dark', 'gold'].includes(stored)) return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'gold');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'gold') root.classList.add('gold');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'gold' : 'light');
  };

  const icon = theme === 'light' ? <Moon className="h-4 w-4" /> : theme === 'dark' ? <Palette className="h-4 w-4" /> : <Sun className="h-4 w-4" />;

  return (
    <Button variant="ghost" size="icon" onClick={cycle} className="h-9 w-9">
      {icon}
    </Button>
  );
}
