// ThemeSwitcher.js
import React from 'react';
import { useTheme } from './ThemeContext';
import { themes } from './themes';
import { FaPalette, FaUser, FaMagic } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const { 
    currentTheme, 
    theme, 
    switchTheme, 
    availableThemes, 
    autoTheme, 
    enableAutoTheme, 
    userLevel 
  } = useTheme();

  return (
    <div className="theme-switcher">
      <div className="theme-controls">
        <div className="theme-selector">
          <FaPalette />
          <select
            value={currentTheme}
            onChange={(e) => switchTheme(e.target.value)}
            className="theme-dropdown"
          >
            {availableThemes.map((themeName) => (
              <option key={themeName} value={themeName}>
                {themes[themeName].name} (Level {themes[themeName].level})
              </option>
            ))}
          </select>
        </div>

        <button
          className={`auto-theme-btn ${autoTheme ? 'active' : ''}`}
          onClick={enableAutoTheme}
          title="Use theme based on your level"
        >
          <FaMagic />
        </button>
      </div>

      <div className="theme-info">
        <div className="level-badge">
          <FaUser />
          <span>Level {theme.level}</span>
        </div>
        
        <div className="theme-preview">
          <div 
            className="color-preview primary"
            style={{ backgroundColor: theme.colors.primary }}
            title="Primary Color"
          />
          <div 
            className="color-preview accent"
            style={{ backgroundColor: theme.colors.accent }}
            title="Accent Color"
          />
          <div 
            className="color-preview surface"
            style={{ backgroundColor: theme.colors.surface }}
            title="Surface Color"
          />
        </div>
      </div>

      <style jsx>{`
        .theme-switcher {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--gradient-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          box-shadow: var(--shadow-medium);
          min-width: 200px;
        }

        .theme-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .theme-dropdown {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 4px 8px;
          color: var(--color-text);
          font-size: 14px;
          cursor: pointer;
          outline: none;
          flex: 1;
        }

        .auto-theme-btn {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-textSecondary);
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .auto-theme-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .auto-theme-btn:hover {
          background: var(--color-primary);
          color: white;
        }

        .theme-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .level-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--color-primary);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .theme-preview {
          display: flex;
          gap: 4px;
        }

        .color-preview {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid var(--color-border);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .color-preview:hover {
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .theme-switcher {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ThemeSwitcher;
