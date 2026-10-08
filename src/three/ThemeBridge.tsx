import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { readTokens } from '../theme/tokens';
import { palette, paletteTargets } from './palette';
import { prefersReducedMotion } from '../hooks/useMediaQuery';

/** Lerps the shared WebGL colours toward the current CSS tokens (~600ms, matching the DOM transition). */
export function ThemeBridge() {
  const theme = useStore((s) => s.theme);
  const first = useRef(true);
  useEffect(() => {
    const t = readTokens();
    paletteTargets.ink.setStyle(t.ink);
    paletteTargets.bg.setStyle(t.bg);
    if (first.current || prefersReducedMotion()) {
      palette.uInk.value.copy(paletteTargets.ink);
      palette.uBg.value.copy(paletteTargets.bg);
      first.current = false;
    }
  }, [theme]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt / 0.16);
    palette.uInk.value.lerp(paletteTargets.ink, k);
    palette.uBg.value.lerp(paletteTargets.bg, k);
    palette.uAccent.value.lerp(paletteTargets.accent, k);
  });
  return null;
}
