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

let probe: CanvasRenderingContext2D | null = null;
/** Resolve any CSS colour (including oklch and nested vars) to a hex string three.js can parse. */
export function cssColorToHex(css: string, fallback = '#e8875a'): string {
  probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  if (!probe || !css) return fallback;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = fallback;
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** The colour for "lost" markers on the globe (the red end of the status scale, in the current theme). */
export function readLossColor(): string {
  return cssColorToHex(getComputedStyle(document.documentElement).getPropertyValue('--loss').trim());
}
