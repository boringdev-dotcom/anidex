import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router';
import { getSpecies } from '../../data';
import type { Species } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useChapterTracking } from '../../scroll/useChapterTracking';
import { ProgressRail } from '../ui/ProgressRail';
import { Hero } from './chapters/Hero';
import { Range } from './chapters/Range';
import { Population } from './chapters/Population';
import { Vulnerability } from './chapters/Vulnerability';
import { Sightings } from './chapters/Sightings';
import { Help } from './chapters/Help';
import { FooterNext } from './chapters/FooterNext';

const CHAPTERS = ['Specimen', 'Range', 'Population', 'Status', 'Sightings', 'Help', 'Next'];

function Story({ sp }: { sp: Species }) {
  useEffect(() => {
    useStore.setState({ page: 'species', slug: sp.slug, shape: sp.slug, previewShape: null, activePlace: -1 });
    document.title = `${sp.commonName} · AniDex`;
  }, [sp]);
  useChapterTracking('.species .chapter', [sp.slug]);

  return (
    <main className="species" data-page style={{ ['--status' as string]: `var(--st-${sp.status.iucn})` }}>
      <ProgressRail chapters={CHAPTERS} />
      <Hero sp={sp} />
      <Range sp={sp} />
      <Population sp={sp} />
      <Vulnerability sp={sp} />
      <Sightings sp={sp} />
      <Help sp={sp} />
      <FooterNext sp={sp} />
    </main>
  );
}

export default function SpeciesPage() {
  const { slug } = useParams();
  const sp = getSpecies(slug);
  if (!sp) return <Navigate to="/" replace />;
  return <Story key={sp.slug} sp={sp} />;
}
