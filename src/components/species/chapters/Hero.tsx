import type { Species } from '../../../data/types';
import { STATUS_LABEL } from '../../../data';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';

export function Hero({ sp }: { sp: Species }) {
  const long = sp.commonName.length > 16;
  return (
    <section className="chapter ch-hero" aria-labelledby="sp-title">
      <div className="stage hero">
        <div className="hero__top">
          <Reveal split="fade" immediate delay={0.5}>
            <ChapterLabel n={1}>Specimen</ChapterLabel>
          </Reveal>
          <Reveal as="p" className="label hero__taxo" split="fade" immediate delay={0.6}>
            {sp.taxonomy.class} <span aria-hidden="true">/</span> {sp.taxonomy.order} <span aria-hidden="true">/</span> {sp.taxonomy.family}
          </Reveal>
        </div>

        <div className="hero__bottom">
          <h1 id="sp-title" className={`display mega hero__title${long ? ' hero__title--long' : ''}`}>
            <Reveal as="span" split="chars" immediate delay={0.45}>
              {sp.commonName}
            </Reveal>
          </h1>
          <div className="hero__meta">
            <Reveal as="p" className="hero__sci italic" split="fade" immediate delay={0.8}>
              {sp.scientificName}
            </Reveal>
            <Reveal as="p" className="lede" split="fade" immediate delay={0.9}>
              {sp.descriptor}
            </Reveal>
            <Reveal split="fade" immediate delay={1.0}>
              <span className="status-chip">{STATUS_LABEL[sp.status.iucn]}</span>
            </Reveal>
          </div>
        </div>
        <div className="hero__cue label" aria-hidden="true">
          <span className="scroll-cue__line" /> Scroll
        </div>
      </div>
    </section>
  );
}
