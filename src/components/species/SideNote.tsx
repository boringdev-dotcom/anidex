import type { ReactNode } from 'react';
import type { Species } from '../../data/types';
import { fmtEstimate } from '../../lib/format';
import { Reveal } from '../ui/Reveal';
import { rangeCounts } from './chapters/popMath';

interface Row {
  k: string;
  v: ReactNode;
  sub?: string;
}

/** Desktop only: a small museum-style label under the specimen, so the right side of a chapter carries facts too. */
function SideNote({ title, rows, children }: { title: string; rows: Row[]; children?: ReactNode }) {
  if (!rows.length) return null;
  return (
    <Reveal as="aside" className="side-note" split="fade" delay={0.3}>
      <p className="label side-note__title">{title}</p>
      {children}
      <dl className="side-note__rows">
        {rows.map((r) => (
          <div key={r.k}>
            <dt className="label">{r.k}</dt>
            <dd>
              {r.v}
              {r.sub && <span className="side-note__sub">{r.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

const countries = (sp: Species) => {
  const n = sp.range.countries.length;
  return n ? `${n} ${n === 1 ? 'country' : 'countries'}` : null;
};

/** About chapter: where the animal sits in the tree of life and where it lives. */
export function AboutNote({ sp }: { sp: Species }) {
  const { taxonomy: t } = sp;
  const genus = sp.scientificName.split(' ')[0];
  const regions = sp.range.regions.slice(0, 3).join(', ');
  const rows = ([
    { k: 'Class', v: t.class },
    { k: 'Order', v: t.order },
    { k: 'Family', v: t.family },
    { k: 'Genus', v: <i>{genus}</i> },
    regions ? { k: 'Lives in', v: regions, sub: countries(sp) ?? undefined } : null,
  ] as (Row | null)[]).filter((r): r is Row => !!r && !!r.v);
  return <SideNote title="Specimen label" rows={rows} />;
}

/** Status chapter: the numbers behind the category. */
export function StatusNote({ sp }: { sp: Species }) {
  const pts = sp.population?.points ?? [];
  const first = pts[0];
  const last = pts[pts.length - 1];
  const rows: Row[] = [];
  // only a global count is quoted as "in the wild"; regional and index series still show their change
  if (last && !sp.population?.scope) rows.push({ k: 'In the wild', v: `~${fmtEstimate(last.estimate)}`, sub: `estimate, ${last.year}` });
  if (first && last && last.year > first.year && first.estimate > 0) {
    const pct = Math.round(((last.estimate - first.estimate) / first.estimate) * 100);
    rows.push({ k: `Since ${first.year}`, v: `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`, sub: sp.population?.scope ? 'tracked population' : undefined });
  }
  const c = countries(sp);
  if (c) rows.push({ k: 'Found in', v: c });
  const { lost, total } = rangeCounts(sp, new Date().getFullYear());
  if (lost > 0) rows.push({ k: 'Lost from', v: `${lost} of ${total}`, sub: 'mapped areas' });

  return (
    <SideNote title="In numbers" rows={rows}>
      {pts.length > 2 && <Spark sp={sp} />}
    </SideNote>
  );
}

/** Population line, oldest to newest, in the status colour. */
function Spark({ sp }: { sp: Species }) {
  const pts = sp.population!.points;
  const x0 = pts[0].year;
  const x1 = pts[pts.length - 1].year;
  const max = Math.max(...pts.map((p) => p.estimate)) || 1;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(((p.year - x0) / (x1 - x0 || 1)) * 100).toFixed(2)},${(38 - (p.estimate / max) * 34).toFixed(2)}`).join('');
  return (
    <figure className="side-note__spark" aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d={d} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="label num">
        <span>{x0}</span>
        <span>{x1}</span>
      </figcaption>
    </figure>
  );
}
