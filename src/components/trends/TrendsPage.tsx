import { useEffect, useMemo } from 'react';
import { useLoaderData, useSearchParams } from 'react-router';
import { line, curveMonotoneX } from 'd3-shape';
import { prefetchSpecies } from '../../data';
import type { TrendItem, TrendsResponse } from '../../data/api';
import { fmtEstimate } from '../../lib/format';
import { live, useStore } from '../../store/useStore';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';

/** Windows the reader can compare over. "all" = each animal's first figure to its latest. */
const WINDOWS = [
  { key: 'all', label: 'Whole record', from: null },
  { key: '1970', label: 'Since 1970', from: 1970 },
  { key: '2000', label: 'Since 2000', from: 2000 },
] as const;

/** A change within ±10% reads as holding steady: the figures aren't precise enough to say more. */
const STEADY = 0.1;
/** Too short a gap between two figures says nothing about a trend. */
const MIN_YEARS = 5;

interface Change {
  item: TrendItem;
  from: { year: number; estimate: number };
  to: { year: number; estimate: number };
  ratio: number;
}

/** Change from the start of the window (the last figure at or before it) to the latest figure. */
function changeOf(item: TrendItem, since: number | null): Change | null {
  const pts = [...item.population.points].filter((p) => p.estimate > 0).sort((a, b) => a.year - b.year);
  if (pts.length < 2) return null;
  const to = pts.at(-1)!;
  const from = since == null ? pts[0] : [...pts].reverse().find((p) => p.year <= since);
  if (!from || to.year - from.year < MIN_YEARS) return null;
  return { item, from, to, ratio: to.estimate / from.estimate };
}

function fmtChange(r: number): string {
  if (r >= 2) return `×${r >= 10 ? Math.round(r) : r.toFixed(1).replace(/\.0$/, '')}`;
  const pct = Math.round((r - 1) * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : '±'}${Math.abs(pct)}%`;
}

const SCOPE_NOTE = { regional: 'one population', index: 'index, not a count' } as const;

/** Then and now: which animals have come back, and which are still slipping away. */
export default function TrendsPage() {
  const { items, tally } = useLoaderData() as TrendsResponse;
  const [params, setParams] = useSearchParams();
  const win = WINDOWS.find((w) => w.key === params.get('since')) ?? WINDOWS[0];

  useEffect(() => {
    live.chapterKeys = ['landing-index'];
    live.pos = 0;
    useStore.setState({ page: 'landing', slug: null, shape: 'ambient', previewShape: null, activePlace: -1 });
    document.title = 'Then and now · AniDex';
    window.scrollTo(0, 0);
  }, []);

  const changes = useMemo(() => items.map((it) => changeOf(it, win.from)).filter((c): c is Change => !!c), [items, win]);
  const up = changes.filter((c) => c.ratio > 1 + STEADY).sort((a, b) => b.ratio - a.ratio);
  const down = changes.filter((c) => c.ratio < 1 - STEADY).sort((a, b) => a.ratio - b.ratio);
  const steady = changes.filter((c) => c.ratio >= 1 - STEADY && c.ratio <= 1 + STEADY);
  const known = tally.increasing + tally.stable + tally.decreasing;

  return (
    <main className="trends" data-page>
      <section className="chapter landing-index trends__inner">
        <header className="trends__head">
          <p className="label label--dot">Then and now</p>
          <h1 className="display h2">
            Who is coming <em>back</em>, and who is slipping <em>away</em>
          </h1>
          <p className="lede">
            {changes.length
              ? `Of the ${changes.length} animals here with counts ${win.from ? `going back to ${win.from}` : 'over time'}, ${up.length} have grown and ${down.length} have shrunk.`
              : 'No animal here has counts that far back yet.'}
          </p>

          {known > 0 && (
            <div className="tally" aria-label="Red List population trends">
              <div className="tally__bar" aria-hidden="true">
                {(['increasing', 'stable', 'decreasing'] as const).map((k) => (
                  <span key={k} className={`tally__seg tally__seg--${k}`} style={{ flexGrow: tally[k] }} />
                ))}
              </div>
              <p className="label tally__legend">
                Across all {(known + tally.unknown).toLocaleString('en-US')} species, the Red List says populations are{' '}
                <span className="tally__k tally__k--increasing">increasing for {tally.increasing}</span>,{' '}
                <span className="tally__k tally__k--stable">stable for {tally.stable}</span> and{' '}
                <span className="tally__k tally__k--decreasing">decreasing for {tally.decreasing}</span>
                {tally.unknown ? ` (unknown for ${tally.unknown})` : ''}.
              </p>
            </div>
          )}

          <div className="chips" role="group" aria-label="Compare over">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                className={`chip${w === win ? ' is-on' : ''}`}
                aria-pressed={w === win}
                onClick={() => setParams(w.key === 'all' ? {} : { since: w.key }, { replace: true, preventScrollReset: true })}
              >
                {w.label}
              </button>
            ))}
          </div>
        </header>

        <div className="trends__cols">
          <Column title="Coming back" note="Grew by more than 10%" list={up} since={win.from} />
          <Column title="Slipping away" note="Fell by more than 10%" list={down} since={win.from} />
        </div>
        {steady.length > 0 && <Column title="Holding steady" note="Within 10% either way" list={steady} since={win.from} />}

        <p className="trends__foot label">
          Figures are published estimates, sourced on each animal’s page. Methods change over the decades, so early numbers are rougher than recent ones.
        </p>
      </section>
    </main>
  );
}

function Column({ title, note, list, since }: { title: string; note: string; list: Change[]; since: number | null }) {
  const go = useTransitionNavigate();
  return (
    <section className="trend-col" aria-label={title}>
      <h2 className="h3">
        {title} <span className="label num">{list.length}</span>
      </h2>
      <p className="label trend-col__note">{note}</p>
      {list.length === 0 ? (
        <p className="muted trend-col__empty">None in this window.</p>
      ) : (
        <ol className="trend-list">
          {list.map((c) => (
            <li key={c.item.slug}>
              <a
                href={`/species/${c.item.slug}`}
                className={`trend-row ${c.ratio > 1 + STEADY ? 'is-up' : c.ratio < 1 - STEADY ? 'is-down' : 'is-flat'}`}
                onMouseEnter={() => {
                  useStore.setState({ previewShape: c.item.slug });
                  prefetchSpecies(c.item.slug);
                }}
                onMouseLeave={() => useStore.setState({ previewShape: null })}
                onClick={(e) => {
                  e.preventDefault();
                  go(`/species/${c.item.slug}`, c.item.slug);
                }}
              >
                <span className="trend-row__name">
                  <span className="display">{c.item.commonName}</span>
                  {c.item.population.scope && <span className="label trend-row__scope">{SCOPE_NOTE[c.item.population.scope]}</span>}
                </span>
                <Spark item={c.item} from={since == null ? null : c.from.year} />
                <span className="trend-row__change display num">{fmtChange(c.ratio)}</span>
                <span className="trend-row__fig label num">
                  {fmtEstimate(c.from.estimate)} → {fmtEstimate(c.to.estimate)} · {c.from.year}–{c.to.year}
                  <span className="trend-row__unit"> · {c.item.population.unit}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** The whole series, faint before the window starts. */
function Spark({ item, from }: { item: TrendItem; from: number | null }) {
  const W = 120;
  const H = 34;
  const pts = [...item.population.points].sort((a, b) => a.year - b.year);
  const y0 = pts[0].year;
  const y1 = pts.at(-1)!.year;
  const max = Math.max(...pts.map((p) => p.estimate)) || 1;
  const x = (y: number) => 3 + ((y - y0) / Math.max(1, y1 - y0)) * (W - 6);
  const y = (v: number) => H - 3 - (v / max) * (H - 6);
  const path = line<(typeof pts)[number]>()
    .x((p) => x(p.year))
    .y((p) => y(p.estimate))
    .curve(curveMonotoneX);
  const inWin = from == null ? pts : pts.filter((p) => p.year >= from);
  const last = pts.at(-1)!;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={path(pts) ?? ''} className="spark__all" />
      {inWin.length > 1 && <path d={path(inWin) ?? ''} className="spark__win" />}
      <circle cx={x(last.year)} cy={y(last.estimate)} r="2.4" className="spark__dot" />
    </svg>
  );
}
