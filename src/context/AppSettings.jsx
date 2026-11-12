import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  init,
  getLang,
  setLang as setLangCore,
  t as translate,
} from '@/assets/js/core/i18n.js';

const MODE_KEY = 'ncl:theme-mode';
const SettingsContext = createContext(null);

const VALID_MODES = ['light', 'dark', 'system'];

function readMode() {
  try {
    const saved = globalThis.localStorage?.getItem(MODE_KEY);
    return VALID_MODES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function AppSettingsProvider({ children }) {
  const [lang, setLangState] = useState('ms');
  const [mode, setModeState] = useState(readMode);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    init();
    setLangState(getLang());
    setReady(true);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangCore(next);
    setLangState(getLang());
  }, []);

  const setMode = useCallback((next) => {
    const value = VALID_MODES.includes(next) ? next : 'system';
    setModeState(value);
    try {
      globalThis.localStorage?.setItem(MODE_KEY, value);
    } catch {
      /* storage not available */
    }
  }, []);

  const t = useCallback((key, vars) => translate(key, vars), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, mode, setMode, t, isReady }),
    [lang, setLang, mode, setMode, t, isReady],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider.');
  }
  return context;
}