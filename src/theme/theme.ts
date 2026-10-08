import { useStore, type Theme } from '../store/useStore';

const KEY = 'anidex-theme';

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function apply(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', t === 'dark' ? '#0B0B0C' : '#F3EBD8');
  useStore.getState().setTheme(t);
}

export function toggleTheme() {
  const next: Theme = useStore.getState().theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode: theme still applies for this visit */
  }
  apply(next);
}

/** Follow the OS setting until the visitor makes an explicit choice. */
export function initTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  apply(stored() ?? (mq.matches ? 'light' : 'dark'));
  mq.addEventListener('change', (e) => {
    if (!stored()) apply(e.matches ? 'light' : 'dark');
  });
}
