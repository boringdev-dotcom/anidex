/**
 * Drag-to-rotate for the specimen and the globe.
 *
 * The canvas sits behind the page with pointer-events: none, so input is read from window events.
 * The director publishes each object's on-screen circle every frame (`hit`); a press inside one of
 * them, away from links, buttons and the timeline, starts a drag on that object.
 */
export type DragTarget = 'specimen' | 'globe';

interface Spin {
  /** accumulated user rotation (radians) */
  yaw: number;
  pitch: number;
  /** angular velocity after release (rad/s) */
  vYaw: number;
  vPitch: number;
  /** pending delta from pointer moves, consumed by the director each frame */
  dYaw: number;
  dPitch: number;
  /** performance.now() of the last input */
  last: number;
}

const spin = (): Spin => ({ yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, dYaw: 0, dPitch: 0, last: 0 });

export const interaction = {
  active: null as DragTarget | null,
  specimen: spin(),
  globe: spin(),
  /** screen-space circles in CSS px, written by the director */
  hit: {
    specimen: { x: 0, y: 0, r: 0, on: false },
    globe: { x: 0, y: 0, r: 0, on: false },
  },
};

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="slider"], [role="option"], .timeline, .search, .rail, .site-header';
const SPEED = 0.0085; // radians per CSS pixel

function targetAt(x: number, y: number, el: Element | null): DragTarget | null {
  if (el?.closest(INTERACTIVE)) return null;
  const { specimen, globe } = interaction.hit;
  const d = (h: typeof specimen) => (h.on ? Math.hypot(x - h.x, y - h.y) / Math.max(h.r, 1) : Infinity);
  const ds = d(specimen);
  const dg = d(globe);
  if (Math.min(ds, dg) > 1) return null;
  return ds <= dg ? 'specimen' : 'globe';
}

export function attachInteraction(): () => void {
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let cursor = '';

  const setCursor = (c: string) => {
    if (c === cursor) return;
    cursor = c;
    document.documentElement.style.cursor = c;
  };

  const down = (e: PointerEvent) => {
    if (e.button !== 0 || interaction.active) return;
    const t = targetAt(e.clientX, e.clientY, e.target as Element);
    if (!t) return;
    interaction.active = t;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    const s = interaction[t];
    s.vYaw = s.vPitch = 0;
    s.last = lastT;
    if (e.pointerType === 'mouse') e.preventDefault(); // no text selection while dragging
    document.documentElement.classList.add('is-dragging');
    setCursor('grabbing');
  };

  const move = (e: PointerEvent) => {
    if (interaction.active && e.pointerId === pointerId) {
      const now = performance.now();
      const dt = Math.max(1, now - lastT) / 1000;
      const dx = (e.clientX - lastX) * SPEED;
      const dy = (e.clientY - lastY) * SPEED;
      const s = interaction[interaction.active];
      s.dYaw += dx;
      s.dPitch += dy;
      // smoothed velocity for the throw
      s.vYaw = s.vYaw * 0.6 + (dx / dt) * 0.4;
      s.vPitch = s.vPitch * 0.6 + (dy / dt) * 0.4;
      s.last = now;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      return;
    }
    if (e.pointerType === 'mouse') setCursor(targetAt(e.clientX, e.clientY, e.target as Element) ? 'grab' : '');
  };

  const up = (e: PointerEvent) => {
    if (!interaction.active || e.pointerId !== pointerId) return;
    const s = interaction[interaction.active];
    // a pause before release means no throw
    if (performance.now() - lastT > 80) s.vYaw = s.vPitch = 0;
    s.last = performance.now();
    interaction.active = null;
    pointerId = -1;
    document.documentElement.classList.remove('is-dragging');
    setCursor(e.pointerType === 'mouse' ? 'grab' : '');
  };

  window.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return () => {
    window.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    setCursor('');
  };
}
