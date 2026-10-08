import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import gsap from 'gsap';
import type { SpeciesRecord, SpeciesSummary } from '../../data/api';
import { fetchSpecies, forgetSpecies, prefetchSpecies, researchStatus, STATUS_LABEL } from '../../data';
import { live, useStore } from '../../store/useStore';
import { useChapterTracking } from '../../scroll/useChapterTracking';
import { ChapterLabel } from '../ui/ChapterLabel';
import { Reveal } from '../ui/Reveal';
import { RotateIcon, StageSlot } from '../ui/StageSlot';
import { UnitsToggle } from '../species/Vitals';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';
import { findings, overlapSentence, pairPath, pairShapeKey, realSize, statRows, type StatRow } from '../../lib/compare';
import { fmtLength } from '../../lib/format';
import { SpeciesPicker } from './SpeciesPicker';

export interface CompareData {
  a: SpeciesRecord;
  b: SpeciesRecord;
  /** relatives of each side, for "more matchups" and the pickers */
  relA: SpeciesSummary[];
  relB: SpeciesSummary[];
}

/** Open-data species without research yet have no measurements: research them, then reload. */
function useResearchFor(sp: SpeciesRecord) {
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (sp.tier !== 'auto' || sp.research) return;
    let stop = false;
    let timer: number | undefined;
    const poll = async (start: boolean) => {
      try {
        const r = await researchStatus(sp.slug, start);
        if (stop) return;
        const running = r.state === 'queued' || r.state === 'running';
        setBusy(running);
        if (r.state === 'done') {
          forgetSpecies(sp.slug);
          await fetchSpecies(sp.slug);
          if (stop) return;
          // real measurements: rebuild the pair at true scale, then refresh the page's numbers
          useStore.setState((s) => ({ modelRev: s.modelRev + 1 }));
          revalidator.revalidate();
        } else if (running) timer = window.setTimeout(() => poll(false), 6000);
      } catch {
        /* the page works without it */
      }
    };
    poll(true);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.slug, sp.research]);
  return busy;
}

/** Name tags above each animal; positions come from the director every frame. */
function PairLabels({ a, b }: { a: SpeciesRecord; b: SpeciesRecord }) {
  const ra = useRef<HTMLDivElement>(null);
  const rb = useRef<HTMLDivElement>(null);
  const units = useStore((s) => s.units);
  useEffect(() => {
    const tick = () => {
      const p = live.pairLabels;
      for (const [el, anchor] of [
        [ra.current, p.a],
        [rb.current, p.b],
      ] as const) {
        if (!el) continue;
        const show = anchor.on && p.opacity > 0.02;
        el.style.opacity = show ? String(p.opacity) : '0';
        if (show) {
          const x = Math.min(window.innerWidth - 70, Math.max(70, anchor.x));
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${anchor.y.toFixed(1)}px, 0)`;
        }
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  const sizes = { a: realSize(a), b: realSize(b) };
  const tag = (sp: SpeciesRecord, side: 'a' | 'b') => {
    const size = sizes[side];
    const other = sizes[side === 'a' ? 'b' : 'a'];
    // the pair builder draws anything under ~4% of its partner's size larger, so it stays visible
    const enlarged = size.metres < other.metres * 0.035;
    const m: [number, number] = [size.metres, size.metres];
    return (
      <>
        <span className="pair-tag__name">{sp.commonName}</span>
        <span className="pair-tag__k num">
          {size.approx ? '≈ ' : ''}
          {fmtLength(m, units)} {size.by === 'height' ? 'tall' : 'long'}
          {enlarged ? ' · enlarged to show' : ''}
        </span>
      </>
    );
  };
  return (
    <div className="pair-tags" aria-hidden="true">
      <div ref={ra} className="pair-tag">
        {tag(a, 'a')}
      </div>
      <div ref={rb} className="pair-tag">
        {tag(b, 'b')}
      </div>
    </div>
  );
}

function StatsTable({ rows, a, b }: { rows: StatRow[]; a: SpeciesRecord; b: SpeciesRecord }) {
  const bar = (row: StatRow, side: 'a' | 'b') => {
    const v = row[side].value;
    const other = row[side === 'a' ? 'b' : 'a'].value;
    if (v == null) return 0;
    const max = row.ladder ? 7 : Math.max(v, other ?? 0);
    return Math.max(0.03, v / (max || 1));
  };
  return (
    <div className="cmp-table" role="table" aria-label={`${a.commonName} and ${b.commonName} side by side`}>
      <div className="cmp-row cmp-row--head" role="row">
        <span role="columnheader" className="cmp-row__name cmp-row__name--a">
          {a.commonName}
        </span>
        <span role="columnheader" className="label cmp-row__k" />
        <span role="columnheader" className="cmp-row__name cmp-row__name--b">
          {b.commonName}
        </span>
      </div>
      {rows.map((r) => {
        const wa = bar(r, 'a');
        const wb = bar(r, 'b');
        const lead = r.a.value != null && r.b.value != null && r.a.value !== r.b.value ? (r.a.value > r.b.value ? 'a' : 'b') : null;
        return (
          <div className="cmp-row" role="row" key={r.key} data-key={r.key}>
            <span role="cell" className={`cmp-row__side cmp-row__side--a${lead === 'a' ? ' is-lead' : ''}`}>
              <span className="cmp-row__v num">{r.a.text}</span>
              <span className="cmp-bar cmp-bar--a" style={{ ['--w' as string]: wa }} />
            </span>
            <span role="rowheader" className="label cmp-row__k">
              {r.label}
            </span>
            <span role="cell" className={`cmp-row__side cmp-row__side--b${lead === 'b' ? ' is-lead' : ''}`}>
              <span className="cmp-bar cmp-bar--b" style={{ ['--w' as string]: wb }} />
              <span className="cmp-row__v num">{r.b.text}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Keyed by the pair, like the species page: moving from one matchup to another mounts a fresh page.
 * Page transitions fade the old page out, and a reused element would stay invisible.
 */
export default function ComparePage() {
  const data = useLoaderData() as CompareData;
  return <CompareStory key={`${data.a.slug}|${data.b.slug}`} {...data} />;
}

function CompareStory({ a, b, relA, relB }: CompareData) {
  const go = useTransitionNavigate();
  const units = useStore((s) => s.units);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const busyA = useResearchFor(a);
  const busyB = useResearchFor(b);
  const shape = pairShapeKey(a.slug, b.slug);

  useEffect(() => {
    live.chapterKeys = ['cmp-hero', 'cmp-stats', 'cmp-range', 'cmp-more'];
    useStore.setState({ page: 'compare', slug: null, pair: [a.slug, b.slug], shape, previewShape: null, activePlace: -1, compare: false });
    document.title = `${a.commonName} vs ${b.commonName} · AniDex`;
  }, [a, b, shape]);
  useEffect(() => () => useStore.setState({ pair: null }), []);
  useChapterTracking('.compare .chapter', [a.slug, b.slug]);

  const rows = statRows(a, b, units);
  const found = findings(a, b);
  const name = (who: 'a' | 'b') => (who === 'a' ? a : b).commonName;

  const choose = (side: 'a' | 'b', s: SpeciesSummary) => {
    setPicking(null);
    const [x, y] = side === 'a' ? [s.slug, b.slug] : [a.slug, s.slug];
    go(pairPath(x, y), pairShapeKey(x, y));
  };
  const hover = (side: 'a' | 'b', s: SpeciesSummary | null) => {
    if (!s) return useStore.setState({ previewShape: null });
    prefetchSpecies(s.slug);
    const [x, y] = side === 'a' ? [s.slug, b.slug] : [a.slug, s.slug];
    useStore.setState({ previewShape: pairShapeKey(x, y) });
  };

  // more matchups: each side against its closest relatives, without repeats
  const seen = new Set([`${a.slug}|${b.slug}`, `${b.slug}|${a.slug}`]);
  const matchups: [SpeciesSummary | SpeciesRecord, SpeciesSummary][] = [];
  for (const [base, rel] of [
    [a, relA],
    [b, relB],
  ] as const) {
    for (const r of rel) {
      if (r.slug === a.slug || r.slug === b.slug) continue;
      const k = `${base.slug}|${r.slug}`;
      if (seen.has(k)) continue;
      seen.add(k);
      seen.add(`${r.slug}|${base.slug}`);
      matchups.push([base, r]);
      if (matchups.filter(([x]) => x.slug === base.slug).length >= 3) break;
    }
  }

  return (
    <main className="compare" data-page>
      <PairLabels a={a} b={b} />

      <section className="chapter cmp-hero" aria-labelledby="cmp-title">
        <div className="stage cmp">
          <StageSlot kind="specimen" chapter="cmp-hero" className="m-slot--cmp" reserve={0}>
            <span className="slot-tag">
              <RotateIcon /> Drag to turn
            </span>
            <span className="slot-tag">To scale</span>
          </StageSlot>
          <div className="cmp__top">
            <Reveal split="fade" immediate delay={0.4}>
              <ChapterLabel n={1}>Compare</ChapterLabel>
            </Reveal>
            <Reveal as="p" className="label cmp__hint" split="fade" immediate delay={0.5}>
              Shown to scale · drag to turn
            </Reveal>
          </div>

          <div className="cmp__bottom">
            <h1 id="cmp-title" className="display cmp__title">
              <span className="cmp__name">
                <button className="cmp__swap-name" onClick={() => setPicking(picking === 'a' ? null : 'a')} aria-expanded={picking === 'a'}>
                  {a.commonName}
                </button>
              </span>
              <span className="cmp__vs italic">vs</span>
              <span className="cmp__name">
                <button className="cmp__swap-name" onClick={() => setPicking(picking === 'b' ? null : 'b')} aria-expanded={picking === 'b'}>
                  {b.commonName}
                </button>
              </span>
            </h1>
            <div className="cmp__aside">
              {found.length > 0 ? (
                <ul className="cmp__findings">
                  {found.map((f) => (
                    <li key={f.label}>
                      <span className="label">{f.label}</span>
                      <span className="cmp__finding">
                        <strong>{name(f.who)}</strong>, {f.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cmp__note">{busyA || busyB ? 'Gathering measurements for this matchup…' : 'Not enough published measurements to compare these two yet.'}</p>
              )}
              <div className="cmp__actions">
                <button className="compare-btn" onClick={() => setPicking(picking === 'a' ? null : 'a')}>
                  Change {a.commonName}
                </button>
                <button className="compare-btn" onClick={() => setPicking(picking === 'b' ? null : 'b')}>
                  Change {b.commonName}
                </button>
                <button className="compare-btn" onClick={() => go(pairPath(b.slug, a.slug), pairShapeKey(b.slug, a.slug))} aria-label="Swap sides">
                  ⇄
                </button>
              </div>
              {picking && (
                <div className="cmp__picker">
                  <SpeciesPicker
                    key={picking}
                    label={`Replace ${picking === 'a' ? a.commonName : b.commonName} with`}
                    suggestions={picking === 'a' ? relB : relA}
                    exclude={[a.slug, b.slug]}
                    autoFocus
                    onPick={(s) => choose(picking, s)}
                    onHover={(s) => hover(picking, s)}
                    onClose={() => setPicking(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="chapter cmp-stats" aria-labelledby="cmp-stats-title">
        <div className="stage cmp-stats__wrap">
          <div className="cmp-stats__head">
            <Reveal split="fade">
              <ChapterLabel n={2}>Side by side</ChapterLabel>
            </Reveal>
            <UnitsToggle />
          </div>
          <Reveal as="h2" id="cmp-stats-title" className="display h2" split="lines">
            {`${a.commonName} and ${b.commonName}, measured up`}
          </Reveal>
          {rows.length ? (
            <StatsTable rows={rows} a={a} b={b} />
          ) : (
            <p className="cmp__note">{busyA || busyB ? 'Gathering measurements for this matchup…' : 'No published measurements for these two yet.'}</p>
          )}
          <p className="label cmp-stats__src">
            Typical adults, midpoint of published ranges. Population is the latest wild estimate. Sources on each species’ page.
          </p>
        </div>
      </section>

      <section className="chapter cmp-range" aria-labelledby="cmp-range-title">
        <div className="stage cmp-range__wrap">
          <Reveal split="fade">
            <ChapterLabel n={3}>Where they live</ChapterLabel>
          </Reveal>
          <StageSlot kind="globe" chapter="cmp-range" className="m-slot--cmp-globe" />
          <Reveal as="h2" id="cmp-range-title" className="display h2 cmp-range__title" split="lines">
            {overlapSentence(a, b)}
          </Reveal>
          <ul className="legend label cmp-range__legend" aria-label="Map legend">
            <li>
              <i className="lg lg--present" aria-hidden="true" /> {a.commonName}
            </li>
            <li>
              <i className="lg lg--ring" aria-hidden="true" /> {b.commonName}
            </li>
          </ul>
          <p className="label cmp-range__src">Ranges from GBIF occurrence records, trimmed to each species’ core area.</p>
        </div>
      </section>

      <section className="chapter cmp-more" aria-labelledby="cmp-more-title">
        <div className="stage cmp-more__wrap">
          <Reveal split="fade">
            <ChapterLabel n={4}>More matchups</ChapterLabel>
          </Reveal>
          <ul className="cmp-more__list" id="cmp-more-title">
            {matchups.map(([x, y]) => (
              <li key={`${x.slug}-${y.slug}`}>
                <a
                  href={pairPath(x.slug, y.slug)}
                  className="cmp-more__link"
                  onClick={(e) => {
                    e.preventDefault();
                    go(pairPath(x.slug, y.slug), pairShapeKey(x.slug, y.slug));
                  }}
                  onMouseEnter={() => {
                    prefetchSpecies(y.slug);
                    useStore.setState({ previewShape: pairShapeKey(x.slug, y.slug) });
                  }}
                  onMouseLeave={() => useStore.setState({ previewShape: null })}
                >
                  <span className="display">{x.commonName}</span>
                  <span className="italic muted cmp-more__vs">vs</span>
                  <span className="display">{y.commonName}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="cmp-more__pages">
            {[a, b].map((sp) => (
              <a
                key={sp.slug}
                href={`/species/${sp.slug}`}
                className="label label--ink cmp-more__page"
                style={{ ['--status' as string]: `var(--st-${sp.status.iucn})` }}
                onClick={(e) => {
                  e.preventDefault();
                  go(`/species/${sp.slug}`, sp.slug);
                }}
              >
                Open the {sp.commonName} page <span className="status-chip">{STATUS_LABEL[sp.status.iucn]}</span> →
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
