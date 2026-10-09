import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { listSpecies, prefetchSpecies, STATUS_SHORT } from '../../data';
import type { ListResponse, SpeciesSummary, Stats } from '../../data/api';
import { live, useStore } from '../../store/useStore';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';
import { IndexPreview } from '../landing/IndexPreview';

export interface ExploreData {
  list: ListResponse;
  stats: Stats | null;
}

const STATUSES = ['CR', 'EN', 'VU', 'NT', 'LC', 'EX'];
const CLASS_LABEL: Record<string, string> = {
  Mammalia: 'Mammals',
  Aves: 'Birds',
  Reptilia: 'Reptiles',
  Amphibia: 'Amphibians',
  Actinopterygii: 'Ray-finned fish',
  Elasmobranchii: 'Sharks & rays',
  Insecta: 'Insects',
  Malacostraca: 'Crustaceans',
  Cephalopoda: 'Cephalopods',
};

/** Browse every species: filter by class and Red List status, search, sort, load more. */
export default function Explore() {
  const { list, stats } = useLoaderData() as ExploreData;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const go = useTransitionNavigate();
  const [items, setItems] = useState<SpeciesSummary[]>(list.items);
  const [page, setPage] = useState(list.page);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(params.get('q') ?? '');
  const debounce = useRef<number | undefined>(undefined);

  useEffect(() => {
    setItems(list.items);
    setPage(list.page);
  }, [list]);

  useEffect(() => {
    live.chapterKeys = ['landing-index'];
    live.pos = 0;
    useStore.setState({ page: 'landing', slug: null, shape: 'ambient', previewShape: null, activePlace: -1 });
    document.title = 'Explore · AniDex';
    window.scrollTo(0, 0);
  }, []);

  const cls = params.get('class') ?? '';
  const status = (params.get('status') ?? '').split(',').filter(Boolean);
  const sort = params.get('sort') ?? 'popular';

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const toggleStatus = (s: string) => {
    const set = new Set(status);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    update({ status: [...set].join(',') || null });
  };

  const loadMore = async () => {
    setLoading(true);
    try {
      const more = await listSpecies({ ...Object.fromEntries(params), page: page + 1, pageSize: list.pageSize });
      setItems((cur) => [...cur, ...more.items]);
      setPage(more.page);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="explore" data-page>
      <section className="chapter explore__inner">
        <header className="explore__head">
          <p className="label label--dot">Explore</p>
          <h1 className="display h2">
            {list.total.toLocaleString('en-US')} {list.total === 1 ? 'species' : 'species'}
            {cls ? <em> · {CLASS_LABEL[cls] ?? cls}</em> : null}
          </h1>
          <div className="explore__controls">
            <input
              className="explore__search"
              type="search"
              placeholder="Filter by name"
              value={q}
              aria-label="Filter by name"
              onChange={(e) => {
                setQ(e.target.value);
                window.clearTimeout(debounce.current);
                const v = e.target.value;
                debounce.current = window.setTimeout(() => update({ q: v.trim() || null }), 250);
              }}
            />
            <label className="explore__sort label">
              Sort
              <select value={sort} onChange={(e) => update({ sort: e.target.value === 'popular' ? null : e.target.value })}>
                <option value="popular">Best known</option>
                <option value="status">Most threatened</option>
                <option value="name">A to Z</option>
              </select>
            </label>
          </div>
          <div className="chips" role="group" aria-label="Animal group">
            <button className={`chip${!cls ? ' is-on' : ''}`} onClick={() => update({ class: null })}>
              All
            </button>
            {(stats?.byClass ?? []).slice(0, 9).map((c) => (
              <button key={c.name} className={`chip${cls === c.name ? ' is-on' : ''}`} onClick={() => update({ class: cls === c.name ? null : c.name })}>
                {CLASS_LABEL[c.name] ?? c.name} <span className="num muted">{c.count}</span>
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Red List status">
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`chip chip--status${status.includes(s) ? ' is-on' : ''}`}
                style={{ ['--status' as string]: `var(--st-${s})` }}
                aria-pressed={status.includes(s)}
                onClick={() => toggleStatus(s)}
              >
                <i aria-hidden="true" /> {STATUS_SHORT[s]}
              </button>
            ))}
          </div>
        </header>

        {items.length === 0 ? (
          <p className="lede">Nothing matches those filters yet.</p>
        ) : (
          <ol className="index-list explore__list">
            {items.map((s) => (
              <li key={s.slug}>
                <a
                  href={`/species/${s.slug}`}
                  className="index-row explore-row"
                  onMouseEnter={() => {
                    useStore.setState({ previewShape: s.slug });
                    prefetchSpecies(s.slug);
                  }}
                  onMouseLeave={() => useStore.setState({ previewShape: null })}
                  onClick={(e) => {
                    e.preventDefault();
                    go(`/species/${s.slug}`, s.slug);
                  }}
                >
                  <span className="explore-row__thumb" aria-hidden="true">
                    {s.photo?.thumb ? <img src={s.photo.thumb} alt="" loading="lazy" decoding="async" /> : null}
                  </span>
                  <span className="index-row__name display">{s.commonName}</span>
                  <span className="index-row__sci italic muted">{s.scientificName}</span>
                  <span className="index-row__class label">{CLASS_LABEL[s.class ?? ''] ?? s.class}</span>
                  {s.iucn && (
                    <span className="status-chip index-row__status" style={{ ['--status' as string]: `var(--st-${s.iucn})` }}>
                      {STATUS_SHORT[s.iucn]}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ol>
        )}
        <IndexPreview items={items} />
        {items.length < list.total && (
          <button className="compare-btn explore__more" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading…' : `Show more · ${(list.total - items.length).toLocaleString('en-US')} left`}
          </button>
        )}
        <button className="label label--ink explore__home" onClick={() => navigate('/')}>
          ← Back to search
        </button>
      </section>
    </main>
  );
}
