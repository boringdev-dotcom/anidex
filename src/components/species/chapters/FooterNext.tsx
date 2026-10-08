import { prefetchSpecies, STATUS_LABEL } from '../../../data';
import type { SpeciesRecord } from '../../../data/api';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { useTransitionNavigate } from '../../ui/useTransitionNavigate';
import { useStore } from '../../../store/useStore';
import { useEffect } from 'react';
import { StageSlot } from '../../ui/StageSlot';

export function FooterNext({ sp, n }: { sp: SpeciesRecord; n: number }) {
  const next = sp.nextSummary;
  const go = useTransitionNavigate();
  const chapter = useStore((s) => s.chapter);
  const active = chapter === n - 1;

  // phones have no hover: when this chapter is on screen, the specimen morphs into the next animal as a teaser
  useEffect(() => {
    if (!next || !window.matchMedia('(max-width: 768px)').matches) return;
    const { previewShape, transitioning } = useStore.getState();
    if (transitioning) return;
    if (active && previewShape !== next.slug) useStore.setState({ previewShape: next.slug });
    if (!active && previewShape === next.slug) useStore.setState({ previewShape: null });
  }, [active, next]);
  if (!next) return null;
  return (
    <section className="chapter ch-next" aria-labelledby="next-title">
      <div className="stage next">
        <Reveal split="fade">
          <ChapterLabel n={n}>Next specimen</ChapterLabel>
        </Reveal>
        <StageSlot kind="specimen" chapter="next" className="m-slot--next" reserve={30}>
          <span className="slot-tag">Up next</span>
          <span className="slot-tag">{next.class}</span>
        </StageSlot>
        <a
          href={`/species/${next.slug}`}
          className="next__link"
          style={{ ['--status' as string]: `var(--st-${next.iucn ?? 'NE'})` }}
          onClick={(e) => {
            e.preventDefault();
            go(`/species/${next.slug}`, next.slug);
          }}
          onMouseEnter={() => {
            useStore.setState({ previewShape: next.slug });
            prefetchSpecies(next.slug);
          }}
          onMouseLeave={() => useStore.setState({ previewShape: null })}
          onFocus={() => useStore.setState({ previewShape: next.slug })}
          onBlur={() => useStore.setState({ previewShape: null })}
        >
          <Reveal as="span" id="next-title" className="display mega next__name" split="chars">
            {next.commonName}
          </Reveal>
          <span className="next__meta">
            <span className="italic">{next.scientificName}</span>
            {next.iucn && <span className="status-chip">{STATUS_LABEL[next.iucn]}</span>}
            <span className="label label--ink next__go">
              Continue <span aria-hidden="true">→</span>
            </span>
          </span>
        </a>
        <footer className="site-foot label">
          <span>
            Range data <a className="link" href={`https://www.gbif.org/species/${sp.gbifTaxonKey}`} target="_blank" rel="noreferrer">GBIF</a>. Status{' '}
            <a className="link" href={sp.status.source.url} target="_blank" rel="noreferrer">IUCN Red List</a>.
          </span>
          <span>Land outlines Natural Earth. Specimens are stipple renderings of 3D models generated with Hunyuan 3D.</span>
        </footer>
      </div>
    </section>
  );
}
