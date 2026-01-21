import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'sunset';
  const stored = localStorage.getItem('app_theme_v2');
  if (['light', 'dark', 'professional', 'modern', 'executive', 'sunset', 'swiggy'].includes(stored)) return stored;
  return 'sunset';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    localStorage.setItem('app_theme_v2', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'professional';
      if (prev === 'professional') return 'modern';
      if (prev === 'modern') return 'executive';
      if (prev === 'executive') return 'sunset';
      if (prev === 'sunset') return 'swiggy';
      return 'dark';
    });
  };

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

