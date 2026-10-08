import { useEffect, type ReactNode } from 'react';
import { useLoaderData } from 'react-router';
import type { SpeciesRecord } from '../../data/api';
import { live, useStore } from '../../store/useStore';
import { useChapterTracking } from '../../scroll/useChapterTracking';
import { ProgressRail } from '../ui/ProgressRail';
import { MeasureOverlay } from './MeasureOverlay';
import { Hero } from './chapters/Hero';
import { About } from './chapters/About';
import { Family } from './chapters/Family';
import { Range } from './chapters/Range';
import { Population } from './chapters/Population';
import { Vulnerability } from './chapters/Vulnerability';
import { Sightings } from './chapters/Sightings';
import { Help } from './chapters/Help';
import { FooterNext } from './chapters/FooterNext';

interface Chapter {
  key: string;
  label: string;
  render: (sp: SpeciesRecord, n: number) => ReactNode;
}

const CHAPTERS: Chapter[] = [
  { key: 'hero', label: 'Specimen', render: (sp) => <Hero sp={sp} /> },
  { key: 'about', label: 'About', render: (sp, n) => <About sp={sp} n={n} /> },
  { key: 'family', label: 'Subspecies', render: (sp, n) => <Family sp={sp} n={n} /> },
  { key: 'range', label: 'Range', render: (sp, n) => <Range sp={sp} n={n} /> },
  { key: 'population', label: 'Population', render: (sp, n) => <Population sp={sp} n={n} /> },
  { key: 'status', label: 'Status', render: (sp, n) => <Vulnerability sp={sp} n={n} /> },
  { key: 'sightings', label: 'Sightings', render: (sp, n) => <Sightings sp={sp} n={n} /> },
  { key: 'help', label: 'Help', render: (sp, n) => <Help sp={sp} n={n} /> },
  { key: 'next', label: 'Next', render: (sp, n) => <FooterNext sp={sp} n={n} /> },
];

function Story({ sp }: { sp: SpeciesRecord }) {
  // a chapter appears only when the species has its data (auto pages fill in as research arrives)
  const has: Record<string, boolean> = {
    about: sp.tier === 'auto',
    family: (sp.variants?.length ?? 0) > 0,
    population: (sp.population?.points.length ?? 0) > 0,
    sightings: (sp.sightings?.places.length ?? 0) > 0,
    help: (sp.help?.actions.length ?? 0) > 0,
  };
  const chapters = CHAPTERS.filter((c) => has[c.key] ?? true);
  const keys = chapters.map((c) => c.key);

  useEffect(() => {
    live.chapterKeys = keys;
    useStore.setState({ page: 'species', slug: sp.slug, shape: sp.slug, previewShape: null, activePlace: -1, compare: false });
    document.title = `${sp.commonName} · AniDex`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  useChapterTracking('.species .chapter', [sp.slug, chapters.length]);

  return (
    <main className="species" data-page style={{ ['--status' as string]: `var(--st-${sp.status.iucn})` }}>
      <ProgressRail chapters={chapters.map((c) => c.label)} />
      <MeasureOverlay sp={sp} />
      {chapters.map((c, i) => (
        <div key={c.key} style={{ display: 'contents' }}>
          {c.render(sp, i + 1)}
        </div>
      ))}
    </main>
  );
}

export default function SpeciesPage() {
  const sp = useLoaderData() as SpeciesRecord;
  return <Story key={sp.slug} sp={sp} />;
}
