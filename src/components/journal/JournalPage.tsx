import { useEffect, useMemo, useState } from 'react';
import { useLoaderData } from 'react-router';
import { prefetchSpecies, STATUS_SHORT } from '../../data';
import type { Stats } from '../../data/api';
import { clearJournal, rankFor, useJournal } from '../../lib/journal';
import { live, useStore } from '../../store/useStore';
import { CLASS_LABEL } from '../explore/Explore';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';

const THREATENED = ['VU', 'EN', 'CR'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The visitor's own collection: every animal they have met, in the order they met it. */
export default function JournalPage() {
  const stats = useLoaderData() as Stats | null;
  const go = useTransitionNavigate();
  const journal = useJournal();
  const list = useMemo(() => Object.values(journal).sort((a, b) => b.n - a.n), [journal]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    live.chapterKeys = ['landing-index'];
    live.pos = 0;
    useStore.setState({ page: 'landing', slug: null, shape: 'ambient', previewShape: null, activePlace: -1 });
    document.title = 'Field journal · AniDex';
    window.scrollTo(0, 0);
  }, []);

  const count = list.length;
  const { current, next } = rankFor(count);
  const prevAt = current?.at ?? 0;
  const progress = next ? (count - prevAt) / (next.at - prevAt) : 1;
  const threatened = list.filter((e) => e.iucn && THREATENED.includes(e.iucn)).length;
  const guessed = list.filter((e) => e.via.includes('guessed')).length;
  const byClass = new Map<string, number>();
  for (const e of list) byClass.set(e.cls, (byClass.get(e.cls) ?? 0) + 1);
  const classes = (stats?.byClass ?? []).filter((c) => c.name !== 'Other').slice(0, 9);

  const open = (slug: string) => go(`/species/${slug}`, slug);

  return (
    <main className="journal" data-page>
      <section className="chapter landing-index journal__inner">
        <header className="journal__head">
          <p className="label label--dot">Your field journal</p>
          <h1 className="display h2">
            {count ? (
              <>
                <span className="num">{count}</span> species <em>recorded</em>
              </>
            ) : (
              <>
                An empty <em>journal</em>
              </>
            )}
          </h1>

          {count > 0 ? (
            <>
              <div className="rank">
                <p className="rank__line">
                  <span className="label">Title</span> <span className="display rank__title">{current?.title}</span>
                  {next && (
                    <span className="label rank__next">
                      {next.at - count} more to {next.title}
                    </span>
                  )}
                </p>
                <div className="rank__bar" aria-hidden="true">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
              <p className="label journal__facts">
                <span className="num">{threatened}</span> of them threatened · <span className="num">{guessed}</span> found in the daily specimen
                {stats ? (
                  <>
                    {' '}
                    · <span className="num">{Math.round((count / stats.total) * 1000) / 10}%</span> of all {stats.total.toLocaleString('en-US')} species
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <>
              <p className="lede">Every animal you open is stamped in here, numbered in the order you met it. Fill a page, earn a title.</p>
              <div className="journal__start">
                <button className="compare-btn is-on" onClick={() => go('/daily', 'ambient')}>
                  Guess today’s specimen
                </button>
                <button className="compare-btn" onClick={() => go('/explore', 'ambient')}>
                  Explore all species
                </button>
              </div>
            </>
          )}
        </header>

        {count > 0 && classes.length > 0 && (
          <ol className="kinds" aria-label="By animal group">
            {classes.map((c) => {
              const seen = byClass.get(c.name) ?? 0;
              return (
                <li key={c.name} className={seen ? 'is-seen' : ''}>
                  <span className="kinds__name">{CLASS_LABEL[c.name] ?? c.name}</span>
                  <span className="kinds__bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(seen ? 3 : 0, (seen / c.count) * 100)}%` }} />
                  </span>
                  <span className="label num">
                    {seen} / {c.count}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {count > 0 && (
          <ol className="stamps">
            {list.map((e) => (
              <li key={e.slug}>
                <a
                  href={`/species/${e.slug}`}
                  className="stamp"
                  style={e.iucn ? { ['--status' as string]: `var(--st-${e.iucn})` } : undefined}
                  onMouseEnter={() => {
                    useStore.setState({ previewShape: e.slug });
                    prefetchSpecies(e.slug);
                  }}
                  onMouseLeave={() => useStore.setState({ previewShape: null })}
                  onClick={(ev) => {
                    ev.preventDefault();
                    open(e.slug);
                  }}
                >
                  <span className="stamp__top">
                    <span className="label num">
                      No. {String(e.n).padStart(3, '0')} · {day(e.at)}
                    </span>
                    {e.via.includes('guessed') && <span className="stamp__badge label">Guessed</span>}
                  </span>
                  <span className="stamp__name display">{e.name}</span>
                  <span className="stamp__sci italic muted">{e.sci}</span>
                  <span className="stamp__foot">
                    {e.iucn && <span className="status-chip">{STATUS_SHORT[e.iucn]}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}

        <footer className="journal__foot label">
          <span>Kept in this browser only. Nothing is sent anywhere.</span>
          {count > 0 &&
            (confirming ? (
              <span>
                Erase all {count}?{' '}
                <button
                  className="label label--ink journal__clear"
                  onClick={() => {
                    clearJournal();
                    setConfirming(false);
                  }}
                >
                  Yes, erase
                </button>{' '}
                <button className="label label--ink journal__clear" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </span>
            ) : (
              <button className="label label--ink journal__clear" onClick={() => setConfirming(true)}>
                Start a new journal
              </button>
            ))}
        </footer>
      </section>
    </main>
  );
}
