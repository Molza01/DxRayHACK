import { createContext, useContext, useState, useEffect, createElement } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('ci-theme')) || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ci-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return createElement(ThemeContext.Provider, { value: { theme, toggleTheme } }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}
