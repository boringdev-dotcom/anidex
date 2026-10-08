import type { Species } from '../../data/types';
import { useStore } from '../../store/useStore';
import { fmtLength, fmtWeight, fmtYears } from '../../lib/format';

/** The hero's measurements row, field note, and the "Compare to you" toggle. */
export function Vitals({ sp }: { sp: Species }) {
  const compare = useStore((s) => s.compare);
  const ph = sp.physical;
  if (!ph) return null;
  const isHand = ph.compare === 'hand';
  const items = [
    { k: 'Weight', v: fmtWeight(ph.weightKg), note: ph.weightNote },
    ph.heightM ? { k: ph.heightLabel === 'standing' ? 'Height' : 'Shoulder', v: fmtLength(ph.heightM) } : null,
    ph.lengthLabel === 'standing height' ? null : { k: ph.lengthLabel === 'wingspan' ? 'Wingspan' : 'Length', v: fmtLength(ph.lengthM) },
    { k: 'Lifespan', v: fmtYears(ph.lifespanYrs), note: 'in the wild' },
  ].filter(Boolean) as { k: string; v: string; note?: string }[];

  return (
    <div className="vitals">
      <dl className="vitals__grid" style={{ ['--cols' as string]: items.length }}>
        {items.map((it) => (
          <div key={it.k} title={it.note}>
            <dt className="label">{it.k}</dt>
            <dd className="num">{it.v}</dd>
          </div>
        ))}
      </dl>
      <p className="vitals__fact">
        <span className="label">Field note</span> {ph.fact}
      </p>
      <button
        className={`compare-btn${compare ? ' is-on' : ''}`}
        aria-pressed={compare}
        onClick={() => useStore.setState({ compare: !compare })}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          {isHand ? (
            <path d="M6 18v-6l-2-3a1 1 0 0 1 1.6-1.2L7 9.5V3.5a1 1 0 0 1 2 0V9V2.5a1 1 0 0 1 2 0V9V3.5a1 1 0 0 1 2 0V10V5.5a1 1 0 0 1 2 0V13a5 5 0 0 1-5 5H6z" fill="none" stroke="currentColor" strokeWidth="1.1" />
          ) : (
            <g fill="none" stroke="currentColor" strokeWidth="1.1">
              <circle cx="10" cy="3.6" r="1.8" />
              <path d="M10 6.2v6.3M10 12.5l-2.4 5.5M10 12.5l2.4 5.5M6.2 8.6l3.8-1.4 3.8 1.4" />
            </g>
          )}
        </svg>
        {compare ? 'Hide comparison' : isHand ? 'Compare to a hand' : 'Compare to you'}
      </button>
    </div>
  );
}
