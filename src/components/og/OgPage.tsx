import { useEffect } from 'react';
import { useLoaderData } from 'react-router';
import gsap from 'gsap';
import type { SpeciesRecord, Stats } from '../../data/api';
import { STATUS_LABEL } from '../../data';
import { live, useStore } from '../../store/useStore';
import { fmtEstimate } from '../../lib/format';
import { latestCount } from '../../lib/compare';
import { specimenInfo, stippleUniforms } from '../../three/stipple/StipplePoints';

export interface OgData {
  sp: SpeciesRecord | null;
  stats: Stats | null;
}

/**
 * A 1200x630 social card drawn by the live scene (scripts/og.ts screenshots it). Not linked anywhere.
 * Species: the stipple specimen with its name and status. Without a slug: the stipple Earth.
 */
export default function OgPage() {
  const { sp, stats } = useLoaderData() as OgData;
  const shape = sp?.slug ?? 'ambient';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    useStore.getState().setTheme('dark');
    live.chapterKeys = [sp ? 'og' : 'og-earth'];
    useStore.setState({ page: 'og', slug: sp?.slug ?? null, pair: null, shape, previewShape: null, compare: false });
    // tell the screenshot script once the points have settled into the animal
    let since = 0;
    const tick = () => {
      const formed = stippleUniforms.uMorph.value > 0.999 && stippleUniforms.uOpacity.value > 0.97 && (shape === 'ambient' || specimenInfo.key === shape);
      since = formed ? since || performance.now() : 0;
      if (since && performance.now() - since > 900) document.documentElement.dataset.ogReady = '1';
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      delete document.documentElement.dataset.ogReady;
    };
  }, [sp, shape]);

  const count = sp ? latestCount(sp) : null;
  const unit = sp?.population?.unit.replace(/\s*\([^)]*\)/g, '').trim();
  return (
    <main className="og-card" data-page style={sp ? { ['--status' as string]: `var(--st-${sp.status.iucn})` } : undefined}>
      <div className="og-card__top">
        <span className="wordmark">
          <span className="wordmark__dot" aria-hidden="true" />
          AniDex
        </span>
        <span className="label">{sp ? sp.taxonomy.class : 'A field guide to the animals we might lose'}</span>
      </div>
      {sp ? (
        <div className="og-card__body">
          <h1 className={`display og-card__name${sp.commonName.length > 14 ? ' is-long' : ''}`}>{sp.commonName}</h1>
          <p className="italic og-card__sci">{sp.scientificName}</p>
          <p className="og-card__meta">
            <span className="status-chip">{STATUS_LABEL[sp.status.iucn]}</span>
            {count && (
              <span className="label">
                ≈ {fmtEstimate(count.estimate)} {unit}
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="og-card__body">
          <h1 className="display og-card__name og-card__name--home">
            Search the <span className="italic">living planet</span>
          </h1>
          <p className="label og-card__stat">
            {stats ? `${stats.total} species · ${stats.threatened} threatened · ` : ''}anidex.fyi
          </p>
        </div>
      )}
    </main>
  );
}
