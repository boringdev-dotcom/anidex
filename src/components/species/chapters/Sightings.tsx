import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Species } from '../../../data/types';
import { useStore } from '../../../store/useStore';
import { StageSlot } from '../../ui/StageSlot';
import { monthRanges } from '../../../lib/format';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { MonthRing } from './MonthRing';

export function Sightings({ sp, n }: { sp: Species; n: number }) {
  const active = useStore((s) => s.activePlace);
  const chapter = useStore((s) => s.chapter);
  const set = (i: number) => useStore.setState({ activePlace: i });
  const { places, bestMonths, tip } = sp.sightings!;
  const listRef = useRef<HTMLOListElement>(null);
  const lastTap = useRef(0);
  const CH = n - 1;

  // phones: the place you are reading becomes active, so the pinned globe turns to it as you scroll
  useEffect(() => {
    if (chapter !== CH) return;
    const tick = () => {
      if (!window.matchMedia('(max-width: 768px)').matches || !listRef.current) return;
      if (performance.now() - lastTap.current < 2500) return;
      const line = window.innerHeight * 0.66;
      let best = -1;
      let bestD = Infinity;
      listRef.current.querySelectorAll(':scope > li').forEach((li, i) => {
        const r = li.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - line);
        if (r.bottom > 0 && r.top < window.innerHeight && d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0 && useStore.getState().activePlace !== best) useStore.setState({ activePlace: best });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [chapter, CH]);

  const shown = active >= 0 ? places[active] : null;
  return (
    <section className="chapter ch-sight" aria-labelledby="sight-title">
      <div className="stage split">
        <StageSlot kind="globe" chapter="sightings" className="m-slot--sightings" reserve={58}>
          <div>
            <p className="slot-title">{shown ? shown.name : 'Where to go'}</p>
            <p className="slot-sub">{shown ? shown.country : `${places.length} places`}</p>
          </div>
          <span className="slot-tag">{monthRanges(bestMonths)}</span>
        </StageSlot>
        <div className="col-text">
          <Reveal split="fade">
            <ChapterLabel n={n}>Where and when to see them</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="sight-title" className="display h2" split="lines">
            {`Best seen ${monthRanges(bestMonths).replace(/^Year-round$/, 'year-round')}`}
          </Reveal>
          <ol className="places" ref={listRef} onMouseLeave={() => set(-1)}>
            {places.map((p, i) => (
              <Reveal as="li" key={p.name} split="fade" delay={0.1 + i * 0.06}>
                <button
                  className={`place${active === i ? ' is-active' : ''}`}
                  onMouseEnter={() => set(i)}
                  onFocus={() => set(i)}
                  onClick={() => {
                    lastTap.current = performance.now();
                    set(i);
                  }}
                  onBlur={() => {
                    if (!window.matchMedia('(max-width: 768px)').matches) set(-1);
                  }}
                  aria-describedby={p.note ? `place-note-${i}` : undefined}
                >
                  <span className="place__num label num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="place__name">{p.name}</span>
                  <span className="place__country label">{p.country}</span>
                </button>
                {p.note && (
                  <p id={`place-note-${i}`} className="place__note muted">
                    {p.note}
                  </p>
                )}
              </Reveal>
            ))}
          </ol>
          <Reveal className="sight__foot" split="fade" delay={0.3}>
            <MonthRing months={bestMonths} />
            {tip && <p className="sight__tip">{tip}</p>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
