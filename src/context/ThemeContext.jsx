import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseDb';
import { useAuth } from './AuthContext';
import { THEMES, DEFAULT_THEME, DEFAULT_ACCENT, getTheme } from '../styles/themes.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { userData } = useAuth();

  const [themeId, setThemeId] = useState(() => {
    try { return localStorage.getItem('lawOfficeTheme') || DEFAULT_THEME; }
    catch { return DEFAULT_THEME; }
  });

  const [accentId, setAccentId] = useState(() => {
    try { return localStorage.getItem('lawOfficeAccent') || DEFAULT_ACCENT; }
    catch { return DEFAULT_ACCENT; }
  });

  const [loading, setLoading] = useState(true);

  // Load theme from Firebase on mount / office change
  useEffect(() => {
    if (!userData?.officeId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'offices', userData.officeId));
        if (!cancelled && snap.exists()) {
          const data = snap.data();
          if (data.theme && THEMES[data.theme]) setThemeId(data.theme);
          if (data.accentColor && THEMES.dark.colors.accent[data.accentColor]) {
            setAccentId(data.accentColor);
          }
        }
      } catch (e) {
        console.warn('Theme load failed:', e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userData?.officeId]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('lawOfficeTheme', themeId);
    localStorage.setItem('lawOfficeAccent', accentId);
  }, [themeId, accentId]);

  // Apply theme CSS variables to document root
  useEffect(() => {
    const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    const c = theme.colors;

    root.style.setProperty('--theme-bg-page',     c.bg.page);
    root.style.setProperty('--theme-bg-card',      c.bg.card);
    root.style.setProperty('--theme-bg-input',     c.bg.input);
    root.style.setProperty('--theme-bg-hover',     c.bg.hover);
    root.style.setProperty('--theme-border-default', c.border.default);
    root.style.setProperty('--theme-border-focus',   c.border.focus);
    root.style.setProperty('--theme-text-primary',   c.text.primary);
    root.style.setProperty('--theme-text-secondary', c.text.secondary);
    root.style.setProperty('--theme-text-muted',     c.text.muted);
    root.style.setProperty('--theme-text-disabled',  c.text.disabled);

    const accent = c.accent[accentId] || c.accent[DEFAULT_ACCENT];
    root.style.setProperty('--theme-accent-main',  accent.main);
    root.style.setProperty('--theme-accent-light', accent.light);
    root.style.setProperty('--theme-accent-dark',  accent.dark);
    root.style.setProperty('--theme-accent-bg',    accent.bg);
  }, [themeId, accentId]);

  const saveTheme = useCallback(async (newThemeId, newAccentId) => {
    if (!userData?.officeId) return;
    await setDoc(
      doc(db, 'offices', userData.officeId),
      { theme: newThemeId, accentColor: newAccentId, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }, [userData?.officeId]);

  const theme = getTheme(themeId, accentId);

  const value = {
    themeId,
    accentId,
    theme,
    setThemeId,
    setAccentId,
    saveTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}