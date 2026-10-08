import { createBrowserRouter, Outlet, redirect, ScrollRestoration, type LoaderFunctionArgs } from 'react-router';
import { lazy, Suspense } from 'react';
import Landing from './components/landing/Landing';
import SpeciesPage from './components/species/SpeciesPage';
import Explore, { type ExploreData } from './components/explore/Explore';
import ComparePage, { type CompareData } from './components/compare/ComparePage';
import { pairPath, parsePair } from './lib/compare';
import { Header } from './components/ui/Header';
import { Grain } from './components/ui/Grain';
import { fetchSpecies, fetchStats, listSpecies, Moved, relatedSpecies } from './data';
import type { ListResponse, Stats } from './data/api';

const SceneRoot = lazy(() => import('./three/SceneRoot'));

function Root() {
  return (
    <>
      <Suspense fallback={null}>
        <SceneRoot />
      </Suspense>
      <Header />
      <Outlet />
      <Grain />
      <ScrollRestoration getKey={(l) => l.pathname} />
    </>
  );
}

export interface LandingData {
  stats: Stats | null;
  featured: ListResponse['items'];
}

async function landingLoader(): Promise<LandingData> {
  const [stats, featured] = await Promise.all([
    fetchStats().catch(() => null),
    listSpecies({ pageSize: 30, sort: 'popular' }).catch(() => null),
  ]);
  return { stats, featured: featured?.items ?? [] };
}

async function exploreLoader({ request }: LoaderFunctionArgs): Promise<ExploreData> {
  const p = Object.fromEntries(new URL(request.url).searchParams);
  const [list, stats] = await Promise.all([listSpecies({ ...p, pageSize: 40 }), fetchStats().catch(() => null)]);
  return { list, stats };
}

async function speciesLoader({ params }: LoaderFunctionArgs) {
  try {
    const sp = await fetchSpecies(String(params.slug));
    if (!sp) return redirect('/');
    return sp;
  } catch (e) {
    if (e instanceof Moved) return redirect(`/species/${e.to}`);
    throw e;
  }
}

const DEFAULT_PAIR = pairPath('lion', 'tiger');

async function compareLoader({ params }: LoaderFunctionArgs): Promise<CompareData | Response> {
  const pair = parsePair(String(params.pair));
  if (!pair) return redirect(DEFAULT_PAIR);
  const load = (slug: string) =>
    fetchSpecies(slug).catch((e) => {
      if (e instanceof Moved) return e.to;
      throw e;
    });
  const [a, b] = await Promise.all(pair.map(load));
  // a renamed species (bengal-tiger -> tiger) keeps the matchup under its new name
  if (typeof a === 'string' || typeof b === 'string') {
    return redirect(pairPath(typeof a === 'string' ? a : pair[0], typeof b === 'string' ? b : pair[1]));
  }
  if (!a || !b) return redirect(DEFAULT_PAIR);
  const [relA, relB] = await Promise.all([relatedSpecies(a.slug, 6).catch(() => []), relatedSpecies(b.slug, 6).catch(() => [])]);
  return { a, b, relA, relB };
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    // the first page's data loads before it renders; the canvas, header and grain still show meanwhile
    hydrateFallbackElement: <div className="boot" aria-busy="true" />,
    children: [
      { path: '/', element: <Landing />, loader: landingLoader },
      { path: '/species/:slug', element: <SpeciesPage />, loader: speciesLoader },
      { path: '/explore', element: <Explore />, loader: exploreLoader },
      { path: '/compare', loader: () => redirect(DEFAULT_PAIR) },
      { path: '/compare/:pair', element: <ComparePage />, loader: compareLoader },
      { path: '*', loader: () => redirect('/') },
    ],
  },
]);
