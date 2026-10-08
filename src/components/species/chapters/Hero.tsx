import type { Species } from '../../../data/types';
import { STATUS_LABEL } from '../../../data';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { RotateIcon, StageSlot } from '../../ui/StageSlot';
import { Vitals } from '../Vitals';
import { SpecimenStatus } from '../SpecimenStatus';
import { CompareWith } from '../CompareWith';
import type { SpeciesRecord } from '../../../data/api';
import { useStore } from '../../../store/useStore';

export function Hero({ sp }: { sp: Species | SpeciesRecord }) {
  const long = sp.commonName.length > 16;
  const comparing = useStore((s) => s.compare);
  return (
    <section className="chapter ch-hero" aria-labelledby="sp-title">
      <div className={`stage hero${comparing ? ' is-comparing' : ''}`}>
        <StageSlot kind="specimen" chapter="hero" className="m-slot--hero" reserve={30}>
          <span className="slot-tag">
            <RotateIcon /> Drag to spin
          </span>
          <span className="slot-tag">{sp.taxonomy.class}</span>
        </StageSlot>
        <div className="hero__top">
          <Reveal split="fade" immediate delay={0.5}>
            <ChapterLabel n={1}>Specimen</ChapterLabel>
          </Reveal>
          <div className="hero__aside">
            <Reveal as="p" className="label hero__taxo" split="fade" immediate delay={0.6}>
              {[sp.taxonomy.class, sp.taxonomy.order, sp.taxonomy.family].filter(Boolean).join(' / ')}
            </Reveal>
            {'tier' in sp && <SpecimenStatus sp={sp} />}
          </div>
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
            <Reveal split="fade" immediate delay={1.15}>
              <Vitals sp={sp} />
            </Reveal>
            <Reveal split="fade" immediate delay={1.25}>
              <CompareWith sp={sp} />
            </Reveal>
          </div>
        </div>
        <div className="hero__cue label" aria-hidden="true">
          <span className="scroll-cue__line" /> Scroll
          <span className="hero__cue-drag">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
              <path d="M12.2 1.6v2.7H9.5" />
            </svg>
            Drag to rotate
          </span>
        </div>
      </div>
    </section>
  );
}
