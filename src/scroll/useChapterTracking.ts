import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { live, useStore } from '../store/useStore';
import { clamp } from '../lib/math';

/**
 * Tracks a list of tall chapter sections whose inner stage is position:sticky.
 * Writes a continuous chapter position into `live.pos`:
 *   - integer i while chapter i's stage is held on screen
 *   - i..i+1 during the 100vh hand-off between chapter i and i+1
 * and per-chapter hold progress into `live.progress[i]`.
 */
export function useChapterTracking(selector: string, deps: unknown[] = []) {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(selector));
    let tops: number[] = [];
    let heights: number[] = [];

    const measure = () => {
      const y = window.scrollY;
      tops = sections.map((s) => s.getBoundingClientRect().top + y);
      heights = sections.map((s) => s.offsetHeight);
    };
    measure();
    live.chapterCount = sections.length;
    live.progress.fill(0);

    const tick = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      let pos = 0;
      // Phones (split layout, no sticky stages): a chapter is active once its top passes a reading
      // line just below the 3D stage, and hands over during the last stretch before the next one arrives.
      if (window.matchMedia('(max-width: 768px)').matches && document.querySelector('.species')) {
        const line = y + vh * 0.62;
        const handover = vh * 0.22;
        for (let i = 0; i < sections.length; i++) {
          live.progress[i] = clamp((line - tops[i]) / Math.max(1, heights[i]));
          if (line >= tops[i] - 1) {
            const nextTop = i < sections.length - 1 ? tops[i + 1] : Infinity;
            pos = i + clamp((line - (nextTop - handover)) / handover);
          }
        }
        live.pos = pos;
        const ch = Math.round(pos);
        if (useStore.getState().chapter !== ch) useStore.setState({ chapter: ch });
        return;
      }
      for (let i = 0; i < sections.length; i++) {
        const holdStart = tops[i];
        const holdEnd = tops[i] + heights[i] - vh;
        live.progress[i] = clamp((y - holdStart) / Math.max(1, holdEnd - holdStart));
        if (y >= holdStart - 1) {
          pos = i + (i < sections.length - 1 ? clamp((y - holdEnd) / vh) : 0);
        }
      }
      live.pos = pos;
      const ch = Math.round(pos);
      if (useStore.getState().chapter !== ch) useStore.setState({ chapter: ch });
    };

    tick();
    gsap.ticker.add(tick);
    const ro = new ResizeObserver(() => {
      measure();
      tick();
    });
    ro.observe(document.body);
    ScrollTrigger.addEventListener('refresh', measure);
    document.fonts?.ready.then(measure);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      ScrollTrigger.removeEventListener('refresh', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
