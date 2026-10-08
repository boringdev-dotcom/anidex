import { useEffect, useState } from 'react';
import { useLoaderData } from 'react-router';
import { nearMe, prefetchSpecies, STATUS_SHORT } from '../../data';
import type { NearResponse, SpeciesSummary } from '../../data/api';
import { fmtCompact } from '../../lib/format';
import type { LandingData } from '../../router';
import { live, useStore } from '../../store/useStore';
import { useChapterTracking } from '../../scroll/useChapterTracking';
import { Reveal } from '../ui/Reveal';
import { SearchBox } from './SearchBox';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';
import { scrollToEl } from '../../scroll/smoothScroll';

type NearState =
  | { state: 'idle' | 'locating' | 'loading' | 'denied' | 'unsupported' | 'error' }
  | { state: 'done'; result: NearResponse };

/** Ask for the visitor's location once, round it to half a degree (~50 km), and look up what lives there. */
function useNearMe() {
  const [near, setNear] = useState<NearState>({ state: 'idle' });
  const find = () => {
    if (!('geolocation' in navigator)) return setNear({ state: 'unsupported' });
    setNear({ state: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const round = (v: number) => Math.round(v * 2) / 2;
        setNear({ state: 'loading' });
        nearMe(round(pos.coords.latitude), round(pos.coords.longitude))
          .then((result) => {
            setNear({ state: 'done', result });
            requestAnimationFrame(() => scrollToEl(document.querySelector('.landing-index')!));
          })
          .catch(() => setNear({ state: 'error' }));
      },
      (err) => setNear({ state: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 3600_000 },
    );
  };
  return { near, find, reset: () => setNear({ state: 'idle' }) };
}

const NEAR_NOTE: Partial<Record<NearState['state'], string>> = {
  locating: 'Finding you…',
  loading: 'Looking at records around you…',
  denied: 'Location is off for this site. Allow it in your browser to see what lives near you.',
  unsupported: 'This browser can’t share a location.',
  error: 'Couldn’t check right now. Try again in a moment.',
};

export default function Landing() {
  const go = useTransitionNavigate();
  const { near, find, reset } = useNearMe();
  useEffect(() => {
    live.chapterKeys = ['landing-hero', 'landing-index'];
    useStore.setState({ page: 'landing', slug: null, shape: 'ambient', previewShape: null, activePlace: -1 });
    document.title = 'AniDex — A field guide to the animals we might lose';
  }, []);
  useChapterTracking('.landing .chapter');

  const { stats, featured } = useLoaderData() as LandingData;
  const total = stats?.total ?? featured.length;
  const threatened = stats?.threatened ?? 0;

  return (
    <main className="landing" data-page>
      <section className="chapter landing-hero">
        <div className="landing-hero__top">
          <Reveal as="p" className="label label--dot" split="fade" immediate delay={0.2}>
            A field guide to the animals we might lose
          </Reveal>
          <Reveal as="p" className="label num landing-hero__vol" split="fade" immediate delay={0.3}>
            Vol. 01 · {total.toLocaleString('en-US')} species
          </Reveal>
        </div>

        <h1 className="landing-hero__title display mega">
          <Reveal as="span" className="landing-hero__l1" split="chars" immediate delay={0.25}>
            Search the
          </Reveal>
          <Reveal as="span" className="landing-hero__l2 italic" split="chars" immediate delay={0.45}>
            living planet
          </Reveal>
        </h1>

        <Reveal className="landing-hero__search" split="fade" immediate delay={0.7}>
          <SearchBox />
          <div className="near">
            <button className="near__btn label label--ink" onClick={find} disabled={near.state === 'locating' || near.state === 'loading'}>
              <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="8" cy="8" r="2.2" />
                <circle cx="8" cy="8" r="5.6" />
                <path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4" />
              </svg>
              What lives near me?
            </button>
            <span className={`near__note label${near.state === 'locating' || near.state === 'loading' ? ' is-busy' : ''}`} role="status" aria-live="polite">
              {NEAR_NOTE[near.state] ?? 'Uses your location once, rounded to about 50 km. Not stored.'}
            </span>
          </div>
        </Reveal>

        <div className="landing-hero__foot">
          <p className="label">
            {threatened.toLocaleString('en-US')} of {total.toLocaleString('en-US')} species here are threatened
          </p>
          <button className="label label--ink scroll-cue" onClick={() => scrollToEl(document.querySelector('.landing-index')!)}>
            <span className="scroll-cue__line" aria-hidden="true" />
            Browse the index
          </button>
        </div>
      </section>

      <section className="chapter landing-index" aria-labelledby="index-title">
        {near.state === 'done' ? (
          <div className="landing-index__head">
            <p className="label label--dot">
              Near you · within about {near.result.radiusKm} km
              <button className="near__back label label--ink" onClick={reset}>
                Show best known
              </button>
            </p>
            <h2 id="index-title" className="display h2">
              {near.result.items.length
                ? `${near.result.items.length} of these animals have been seen around you since 2000.`
                : 'None of the animals here have wild records near you yet.'}
            </h2>
          </div>
        ) : (
          <div className="landing-index__head">
            <Reveal as="p" className="label label--dot" split="fade">
              Best known
            </Reveal>
            <Reveal as="h2" id="index-title" className="display h2" split="lines">
              The animals people look up most. Hover to preview, click to explore.
            </Reveal>
          </div>
        )}
        <ol className="index-list">
          {(near.state === 'done' ? near.result.items : featured).map((s: SpeciesSummary & { records?: number }, i) => (
            <li key={s.slug}>
              <a
                href={`/species/${s.slug}`}
                className="index-row"
                onMouseEnter={() => {
                  useStore.setState({ previewShape: s.slug });
                  prefetchSpecies(s.slug);
                }}
                onMouseLeave={() => useStore.setState({ previewShape: null })}
                onFocus={() => useStore.setState({ previewShape: s.slug })}
                onBlur={() => useStore.setState({ previewShape: null })}
                onClick={(e) => {
                  e.preventDefault();
                  go(`/species/${s.slug}`, s.slug);
                }}
              >
                <span className="index-row__num label num">{String(i + 1).padStart(2, '0')}</span>
                <span className="index-row__name display">{s.commonName}</span>
                <span className="index-row__sci italic muted">
                  {s.records != null ? `${fmtCompact(s.records)} sightings nearby` : s.scientificName}
                </span>
                <span className="index-row__class label">{s.class}</span>
                {s.iucn && (
                  <span className="status-chip index-row__status" style={{ ['--status' as string]: `var(--st-${s.iucn})` }}>
                    {STATUS_SHORT[s.iucn]}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ol>
        <a href="/explore" className="compare-btn landing-explore" onClick={(e) => { e.preventDefault(); go('/explore', 'ambient'); }}>
          Explore all {total.toLocaleString('en-US')} species →
        </a>
        <footer className="landing-foot label">
          <span>Ranges from GBIF occurrence data. Status from the IUCN Red List. Figures sourced per species.</span>
          <span>Specimens are stipple renderings of 3D models generated with Hunyuan 3D.</span>
        </footer>
      </section>
    </main>
  );
}
