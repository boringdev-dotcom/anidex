import type { Species } from '../../data/types';
import { useStore } from '../../store/useStore';
import { fmtHeight, fmtLength, fmtWeight, fmtYears, type Units } from '../../lib/format';

const FT = 3.28084;

/** Metric / imperial switch, shared by every measurement on the site. */
export function UnitsToggle() {
  const units = useStore((s) => s.units);
  const set = (u: Units) => useStore.setState({ units: u });
  return (
    <div className="units" role="radiogroup" aria-label="Units">
      <button role="radio" aria-checked={units === 'metric'} className={units === 'metric' ? 'is-on' : ''} onClick={() => set('metric')}>
        m · kg
      </button>
      <button role="radio" aria-checked={units === 'imperial'} className={units === 'imperial' ? 'is-on' : ''} onClick={() => set('imperial')}>
        ft · lb
      </button>
    </div>
  );
}

/** "Your height" slider for Compare to you. Steps by 1 cm or 1 inch. */
function HeightControl() {
  const units = useStore((s) => s.units);
  const h = useStore((s) => s.userHeightM);
  const imperial = units === 'imperial';
  // the slider works in whole cm or whole inches so each step is a natural unit
  const value = imperial ? Math.round(h * FT * 12) : Math.round(h * 100);
  const [min, max] = imperial ? [36, 90] : [90, 230];
  const toM = (v: number) => (imperial ? v / 12 / FT : v / 100);
  const set = (v: number) => useStore.setState({ userHeightM: Math.min(2.3, Math.max(0.9, toM(v))) });
  return (
    <div className="height-ctl">
      <label htmlFor="your-height" className="label">
        Your height
      </label>
      <div className="height-ctl__row">
        <button className="height-ctl__step" aria-label="Shorter" onClick={() => set(value - 1)}>
          −
        </button>
        <input
          id="your-height"
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-valuetext={fmtHeight(h, units)}
          onChange={(e) => set(Number(e.target.value))}
        />
        <button className="height-ctl__step" aria-label="Taller" onClick={() => set(value + 1)}>
          +
        </button>
        <output htmlFor="your-height" className="height-ctl__out num">
          {fmtHeight(h, units)}
        </output>
      </div>
    </div>
  );
}

/** The hero's measurements card, field note, and the "Compare to you" toggle. */
export function Vitals({ sp }: { sp: Species }) {
  const compare = useStore((s) => s.compare);
  const units = useStore((s) => s.units);
  const ph = sp.physical;
  if (!ph) return null;
  const isHand = ph.compare === 'hand';
  const items = [
    { k: 'Weight', v: fmtWeight(ph.weightKg, units), note: ph.weightNote },
    ph.heightM ? { k: ph.heightLabel === 'standing' ? 'Height' : 'Shoulder', v: fmtLength(ph.heightM, units) } : null,
    ph.lengthLabel === 'standing height' ? null : { k: ph.lengthLabel === 'wingspan' ? 'Wingspan' : 'Length', v: fmtLength(ph.lengthM, units) },
    { k: 'Lifespan', v: fmtYears(ph.lifespanYrs), note: 'in the wild' },
  ].filter(Boolean) as { k: string; v: string; note?: string }[];

  return (
    <div className="vitals">
      <div className="vitals__head">
        <span className="label">Measurements</span>
        <UnitsToggle />
      </div>
      <dl className="vitals__grid">
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
      <div className="compare-row">
        <button className={`compare-btn${compare ? ' is-on' : ''}`} aria-pressed={compare} onClick={() => useStore.setState({ compare: !compare })}>
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
      {compare && !isHand && <HeightControl />}
    </div>
  );
}
