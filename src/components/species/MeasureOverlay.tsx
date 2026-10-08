import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Species } from '../../data/types';
import { live } from '../../store/useStore';
import { fmtLength } from '../../lib/format';
import { REFERENCES } from '../../three/specimen/Specimen';

/** HTML labels pinned to the 3D measurement lines and the comparison figure. Positions come from the director. */
export function MeasureOverlay({ sp }: { sp: Species }) {
  const len = useRef<HTMLDivElement>(null);
  const ht = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const m = live.measure;
      const place = (el: HTMLDivElement | null, a: { x: number; y: number; on: boolean }, o: number) => {
        if (!el) return;
        const show = a.on && o > 0.02;
        el.style.opacity = show ? String(o) : '0';
        // keep centred labels on screen (the reference can sit near the edge on phones)
        const x = el.dataset.clamp ? Math.min(window.innerWidth - 56, Math.max(56, a.x)) : a.x;
        if (show) el.style.transform = `translate3d(${x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      };
      place(len.current, m.len, m.opacity);
      place(ht.current, m.ht, m.opacity);
      place(ref.current, m.ref, m.compare);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const ph = sp.physical;
  if (!ph) return null;
  const refInfo = REFERENCES[ph.compare];
  return (
    <div className="measure" aria-hidden="true">
      <div ref={len} className="measure__tag measure__tag--len">
        <span className="measure__v num">{fmtLength(ph.lengthM)}</span>
        <span className="measure__k">{ph.lengthLabel}</span>
      </div>
      {ph.heightM && ph.heightLabel && (
        <div ref={ht} className="measure__tag measure__tag--ht">
          <span className="measure__v num">{fmtLength(ph.heightM)}</span>
          <span className="measure__k">{ph.heightLabel}</span>
        </div>
      )}
      <div ref={ref} className="measure__tag measure__tag--ref" data-clamp="1">
        <span className="measure__k">{refInfo.label}</span>
      </div>
    </div>
  );
}
