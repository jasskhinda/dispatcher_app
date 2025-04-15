'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [isSystemTheme, setIsSystemTheme] = useState(true);

  // Function to toggle between light and dark modes
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      // When manually toggling, we're no longer following system preference
      setIsSystemTheme(false);
      // Save preference to localStorage
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('isSystemTheme', 'false');
      return newTheme;
    });
  };

  // Function to reset to system preference
  const resetToSystemTheme = () => {
    setIsSystemTheme(true);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    localStorage.setItem('isSystemTheme', 'true');
    localStorage.removeItem('theme');
  };

  useEffect(() => {
    try {
      // Check for saved theme preference
      const savedTheme = localStorage.getItem('theme');
      const savedIsSystemTheme = localStorage.getItem('isSystemTheme');

      if (savedIsSystemTheme === 'false' && savedTheme) {
        setTheme(savedTheme);
        setIsSystemTheme(false);
      } else {
        // Check system preference on initial load
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');
        setIsSystemTheme(true);

        // Add listener for system theme changes
        const handleChange = (e) => {
          if (isSystemTheme) {
            setTheme(e.matches ? 'dark' : 'light');
          }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    } catch (error) {
      console.error('Error in theme initialization:', error);
      // Set default theme if localStorage access fails
      setTheme('light');
      setIsSystemTheme(false);
    }
  }, [isSystemTheme]);

  useEffect(() => {
    try {
      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (error) {
      console.error('Error applying theme to document:', error);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      isSystemTheme, 
      toggleTheme, 
      resetToSystemTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
