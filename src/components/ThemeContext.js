// ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, defaultTheme, getThemeByLevel } from './themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, userLevel }) => {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [autoTheme, setAutoTheme] = useState(true);

  const theme = themes[currentTheme];

  // Auto-set theme based on user level
  useEffect(() => {
    if (userLevel && autoTheme) {
      const levelTheme = getThemeByLevel(userLevel);
      if (levelTheme) {
        setCurrentTheme(Object.keys(themes).find(key => themes[key] === levelTheme));
      }
    }
  }, [userLevel, autoTheme]);

  const switchTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      setAutoTheme(false); // Disable auto theme when manually switching
      localStorage.setItem('dashboardTheme', themeName);
      localStorage.setItem('autoTheme', 'false');
    }
  };

  const enableAutoTheme = () => {
    setAutoTheme(true);
    localStorage.setItem('autoTheme', 'true');
    if (userLevel) {
      const levelTheme = getThemeByLevel(userLevel);
      if (levelTheme) {
        setCurrentTheme(Object.keys(themes).find(key => themes[key] === levelTheme));
      }
    }
  };

  // Load preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboardTheme');
    const savedAutoTheme = localStorage.getItem('autoTheme');
    
    if (savedAutoTheme === 'false') {
      setAutoTheme(false);
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    }
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Apply shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    
    // Apply gradient variables
    if (theme.gradients) {
      Object.entries(theme.gradients).forEach(([key, value]) => {
        root.style.setProperty(`--gradient-${key}`, value);
      });
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        theme,
        themeLevel: theme.level,
        switchTheme,
        enableAutoTheme,
        autoTheme,
        userLevel,
        availableThemes: Object.keys(themes),
        getThemeByLevel
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
