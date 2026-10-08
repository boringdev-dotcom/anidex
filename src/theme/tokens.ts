export interface ThemeTokens {
  bg: string;
  ink: string;
}

export function readTokens(): ThemeTokens {
  const cs = getComputedStyle(document.documentElement);
  return {
    bg: cs.getPropertyValue('--bg').trim() || '#0b0b0c',
    ink: cs.getPropertyValue('--ink').trim() || '#ede6d6',
  };
}
