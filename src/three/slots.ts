/**
 * Phone layout: instead of a fixed stage, chapters place "slots" in their own content where the
 * 3D should appear. The director picks the most visible slot of each kind every frame and fits the
 * specimen or globe into its on-screen rectangle, so the 3D scrolls with the page like an
 * illustration, and stays put where a slot is sticky (subspecies, population, sightings).
 */
export type SlotKind = 'specimen' | 'globe';

export interface Slot {
  el: HTMLElement;
  kind: SlotKind;
  /** chapter key the slot belongs to (hero, family, range, population, sightings, next) */
  chapter: string;
  /** px kept clear at the bottom of the slot for its overlay labels */
  reserve: number;
}

const slots = new Set<Slot>();

export function registerSlot(slot: Slot): () => void {
  slots.add(slot);
  return () => {
    slots.delete(slot);
  };
}

export interface SlotView {
  slot: Slot;
  /** centre and size in CSS px */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 share of the slot that is on screen below the header */
  visible: number;
}

/** The most visible slot of a kind, or null when none is on screen. */
export function bestSlot(kind: SlotKind, viewportH: number, headerH: number): SlotView | null {
  let best: SlotView | null = null;
  for (const s of slots) {
    if (s.kind !== kind || !s.el.isConnected) continue;
    const r = s.el.getBoundingClientRect();
    if (r.height < 2 || r.width < 2) continue; // hidden (desktop)
    const top = Math.max(r.top, headerH);
    const bottom = Math.min(r.bottom, viewportH);
    const visible = Math.max(0, Math.min(1, (bottom - top) / r.height));
    if (!best || visible > best.visible) {
      // the 3D fits the slot minus the strip reserved for its labels
      const h = Math.max(20, r.height - s.reserve);
      best = { slot: s, x: r.left + r.width / 2, y: r.top + h / 2, w: r.width, h, visible };
    }
  }
  return best && best.visible > 0 ? best : null;
}
