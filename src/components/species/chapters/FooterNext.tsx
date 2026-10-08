import type { Species } from '../../../data/types';
import { STATUS_LABEL, nextSpecies } from '../../../data';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { useTransitionNavigate } from '../../ui/useTransitionNavigate';
import { useStore } from '../../../store/useStore';

export function FooterNext({ sp, n }: { sp: Species; n: number }) {
  const next = nextSpecies(sp);
  const go = useTransitionNavigate();
  return (
    <section className="chapter ch-next" aria-labelledby="next-title">
      <div className="stage next">
        <Reveal split="fade">
          <ChapterLabel n={n}>Next specimen</ChapterLabel>
        </Reveal>
        <a
          href={`/species/${next.slug}`}
          className="next__link"
          style={{ ['--status' as string]: `var(--st-${next.status.iucn})` }}
          onClick={(e) => {
            e.preventDefault();
            go(`/species/${next.slug}`, next.slug);
          }}
          onMouseEnter={() => useStore.setState({ previewShape: next.slug })}
          onMouseLeave={() => useStore.setState({ previewShape: null })}
          onFocus={() => useStore.setState({ previewShape: next.slug })}
          onBlur={() => useStore.setState({ previewShape: null })}
        >
          <Reveal as="span" id="next-title" className="display mega next__name" split="chars">
            {next.commonName}
          </Reveal>
          <span className="next__meta">
            <span className="italic">{next.scientificName}</span>
            <span className="status-chip">{STATUS_LABEL[next.status.iucn]}</span>
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
