import type { SpeciesRecord } from '../../../data/api';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { ResearchStatus } from '../ResearchStatus';
import { AboutNote } from '../SideNote';

/** Wikipedia summary and photo with attribution, plus the on-demand research state on open-data pages. */
export function About({ sp, n }: { sp: SpeciesRecord; n: number }) {
  const s = sp.summary;
  const photo = sp.photo;
  return (
    <section className="chapter ch-about" aria-labelledby="about-title">
      <div className="stage about">
        <div className="about__col">
          <Reveal split="fade">
            <ChapterLabel n={n}>About</ChapterLabel>
          </Reveal>
          {photo && (
            <Reveal as="figure" className="about__photo" split="fade">
              {/* Wikimedia serves thumbnails only at standard widths (…, 500, 960, 1280, …) */}
              <img src={photo.thumb?.replace(/\/\d+px-/, '/960px-') ?? photo.url} alt={sp.commonName} loading="lazy" decoding="async" />
              <figcaption className="label">
                {photo.credit ? `Photo: ${photo.credit}` : 'Photo'}
                {photo.license ? ` · ${photo.license}` : ''}
                {photo.source && (
                  <>
                    {' · '}
                    <a className="link" href={photo.source} target="_blank" rel="noreferrer">
                      Wikimedia Commons
                    </a>
                  </>
                )}
              </figcaption>
            </Reveal>
          )}
          {s && (
            <Reveal as="p" id="about-title" className="about__text" split="fade" delay={0.1}>
              {s.text}
            </Reveal>
          )}
          {s && (
            <p className="label about__src">
              Text from{' '}
              <a className="link label--ink" href={s.url} target="_blank" rel="noreferrer">
                {s.source}
              </a>
              , {s.license}
            </p>
          )}
          <ResearchStatus sp={sp} />
        </div>
        <AboutNote sp={sp} />
      </div>
    </section>
  );
}
