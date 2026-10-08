import { useEffect } from 'react';
import { allSpecies, STATUS_SHORT } from '../../data';
import { live, useStore } from '../../store/useStore';
import { useChapterTracking } from '../../scroll/useChapterTracking';
import { Reveal } from '../ui/Reveal';
import { SearchBox } from './SearchBox';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';
import { scrollToEl } from '../../scroll/smoothScroll';

export default function Landing() {
  const go = useTransitionNavigate();
  useEffect(() => {
    live.chapterKeys = ['landing-hero', 'landing-index'];
    useStore.setState({ page: 'landing', slug: null, shape: 'ambient', previewShape: null, activePlace: -1 });
    document.title = 'AniDex — A field guide to the animals we might lose';
  }, []);
  useChapterTracking('.landing .chapter');

  const threatened = allSpecies.filter((s) => ['VU', 'EN', 'CR'].includes(s.status.iucn)).length;

  return (
    <main className="landing" data-page>
      <section className="chapter landing-hero">
        <div className="landing-hero__top">
          <Reveal as="p" className="label label--dot" split="fade" immediate delay={0.2}>
            A field guide to the animals we might lose
          </Reveal>
          <Reveal as="p" className="label num landing-hero__vol" split="fade" immediate delay={0.3}>
            Vol. 01 · {allSpecies.length} species
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
        </Reveal>

        <div className="landing-hero__foot">
          <p className="label">
            {threatened} of {allSpecies.length} species here are threatened
          </p>
          <button className="label label--ink scroll-cue" onClick={() => scrollToEl(document.querySelector('.landing-index')!)}>
            <span className="scroll-cue__line" aria-hidden="true" />
            Browse the index
          </button>
        </div>
      </section>

      <section className="chapter landing-index" aria-labelledby="index-title">
        <div className="landing-index__head">
          <Reveal as="p" className="label label--dot" split="fade">
            The index
          </Reveal>
          <Reveal as="h2" id="index-title" className="display h2" split="lines">
            {allSpecies.length} species, one planet. Hover to preview, click to explore.
          </Reveal>
        </div>
        <ol className="index-list">
          {allSpecies.map((s, i) => (
            <li key={s.slug}>
              <a
                href={`/species/${s.slug}`}
                className="index-row"
                onMouseEnter={() => useStore.setState({ previewShape: s.slug })}
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
                <span className="index-row__sci italic muted">{s.scientificName}</span>
                <span className="index-row__class label">{s.taxonomy.class}</span>
                <span className="status-chip index-row__status" style={{ ['--status' as string]: `var(--st-${s.status.iucn})` }}>
                  {STATUS_SHORT[s.status.iucn]}
                </span>
              </a>
            </li>
          ))}
        </ol>
        <footer className="landing-foot label">
          <span>Ranges from GBIF occurrence data. Status from the IUCN Red List. Figures sourced per species.</span>
          <span>Specimens are stipple renderings of 3D models generated with Hunyuan 3D.</span>
        </footer>
      </section>
    </main>
  );
}
