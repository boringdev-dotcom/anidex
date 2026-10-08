import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Page = 'landing' | 'species';

interface State {
  theme: Theme;
  page: Page;
  /** Slug of the species page currently shown, if any. */
  slug: string | null;
  /** Shape currently requested for the point cloud: 'ambient' or a species slug. */
  shape: string;
  /** Hover preview on the landing page overrides `shape` while set. */
  previewShape: string | null;
  /** Active chapter index (rounded scroll position) for UI that needs to re-render. */
  chapter: number;
  /** Index of the hovered sighting place, or -1. */
  activePlace: number;
  /** Where the globe's range layer came from, for the caption. */
  rangeSource: string | null;
  /** "Compare to you": show a person or hand at true scale beside the hero specimen. */
  compare: boolean;
  /** True while a page transition is running. */
  transitioning: boolean;

  setTheme: (t: Theme) => void;
  set: (p: Partial<State>) => void;
}

const initialTheme = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';

export const useStore = create<State>((set) => ({
  theme: initialTheme,
  page: 'landing',
  slug: null,
  shape: 'ambient',
  previewShape: null,
  chapter: 0,
  activePlace: -1,
  transitioning: false,
  compare: false,
  rangeSource: null,
  setTheme: (theme) => set({ theme }),
  set: (p) => set(p),
}));

/**
 * Hot, per-frame values written by DOM-side code and read by the WebGL scene in useFrame.
 * Kept outside React/zustand so nothing re-renders at 60fps.
 */
export const live = {
  /** Continuous chapter position: integer = chapter fully on screen. */
  pos: 0,
  /** In-chapter progress 0..1 for each chapter while it is held. */
  progress: new Float32Array(16),
  chapterCount: 0,
  /** Chapter keys of the current page in order (e.g. hero, family, range...). */
  chapterKeys: [] as string[],
  /** Relative size of the selected subspecies (1 = largest) and whether it is extinct. */
  variantScale: 1,
  variantGhost: 0,
  /** Screen anchors (css px) for the hero's measurement labels, written by the director. */
  measure: {
    opacity: 0,
    compare: 0,
    len: { x: 0, y: 0, on: false },
    ht: { x: 0, y: 0, on: false },
    ref: { x: 0, y: 0, on: false },
  },
  /** Normalised pointer position -1..1. */
  pointer: { x: 0, y: 0 },
  /** Year currently shown by the population scrubber, or null outside that chapter. */
  year: null as number | null,
  /** Region of the range history the globe should face while scrubbing, or -1. */
  historyFocus: -1,
};
