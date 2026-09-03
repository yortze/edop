import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const KEY = 'edop_theme';
const ThemeContext = createContext(null);

// Trois états : 'auto' (suit l'appareil), 'light', 'dark'.
function readPreference() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

function systemIsDark() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(systemIsDark);

  // L'utilisateur change le thème de son téléphone pendant sa visite :
  // en mode « auto », la page suit sans rechargement.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    try {
      if (preference === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, preference);
    } catch { /* navigation privée : on garde juste le thème de la session */ }
  }, [resolved, preference]);

  // Le bouton fait défiler auto → clair → sombre → auto.
  const cycle = useCallback(() => {
    setPreference(p => (p === 'auto' ? 'light' : p === 'light' ? 'dark' : 'auto'));
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
