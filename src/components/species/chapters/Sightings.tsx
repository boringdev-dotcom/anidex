import type { Species } from '../../../data/types';
import { useStore } from '../../../store/useStore';
import { monthRanges } from '../../../lib/format';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { MonthRing } from './MonthRing';

export function Sightings({ sp, n }: { sp: Species; n: number }) {
  const active = useStore((s) => s.activePlace);
  const set = (i: number) => useStore.setState({ activePlace: i });
  const { places, bestMonths, tip } = sp.sightings;
  return (
    <section className="chapter ch-sight" aria-labelledby="sight-title">
      <div className="stage split">
        <div className="col-text">
          <Reveal split="fade">
            <ChapterLabel n={n}>Where and when to see them</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="sight-title" className="display h2" split="lines">
            {`Best seen ${monthRanges(bestMonths).replace(/^Year-round$/, 'year-round')}`}
          </Reveal>
          <ol className="places" onMouseLeave={() => set(-1)}>
            {places.map((p, i) => (
              <Reveal as="li" key={p.name} split="fade" delay={0.1 + i * 0.06}>
                <button
                  className={`place${active === i ? ' is-active' : ''}`}
                  onMouseEnter={() => set(i)}
                  onFocus={() => set(i)}
                  onBlur={() => set(-1)}
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
