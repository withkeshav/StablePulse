import { useEffect, useState } from 'preact/hooks';
import { THEME_KEY } from '../utils/storage.js';

export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light';
    } catch {
      return 'light';
    }
  });

  const [effectiveTheme, setEffectiveTheme] = useState(() => resolveTheme(theme));

  useEffect(() => {
    setEffectiveTheme(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore write errors in private mode
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (theme === 'system') setEffectiveTheme(media.matches ? 'dark' : 'light');
      };
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    return undefined;
  }, [theme]);

  return { theme, setTheme, effectiveTheme };
}
