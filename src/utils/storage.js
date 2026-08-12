export const THEME_KEY = 'stablesense:theme';
export const REFRESH_KEY = 'stablesense:refresh';
export const COMPACT_KEY = 'stablesense:compact';
export const CACHE_PREFIX = 'stablesense:v2:';

const LEGACY = {
  theme: 'stablepulse:theme',
  refresh: 'stablepulse:refresh',
  compact: 'stablepulse:compact',
  cache: 'stablepulse:v2:',
};

export function migrateLegacyKeys() {
  try {
    const theme = localStorage.getItem(LEGACY.theme);
    if (theme !== null) {
      if (localStorage.getItem(THEME_KEY) === null) localStorage.setItem(THEME_KEY, theme);
      localStorage.removeItem(LEGACY.theme);
    }
    const refresh = localStorage.getItem(LEGACY.refresh);
    if (refresh !== null) {
      if (localStorage.getItem(REFRESH_KEY) === null) localStorage.setItem(REFRESH_KEY, refresh);
      localStorage.removeItem(LEGACY.refresh);
    }
    const compact = localStorage.getItem(LEGACY.compact);
    if (compact !== null) {
      if (localStorage.getItem(COMPACT_KEY) === null) localStorage.setItem(COMPACT_KEY, compact);
      localStorage.removeItem(LEGACY.compact);
    }
    pruneLegacyCache();
  } catch {
    // storage unavailable (private mode); migration is best-effort
  }
}

function pruneLegacyCache() {
  const doomed = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LEGACY.cache)) doomed.push(key);
  }
  doomed.forEach((key) => localStorage.removeItem(key));
}
