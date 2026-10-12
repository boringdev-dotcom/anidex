import { createBrowserRouter, Outlet, redirect, ScrollRestoration, type LoaderFunctionArgs } from 'react-router';
import { lazy, Suspense } from 'react';
import Landing from './components/landing/Landing';
import SpeciesPage from './components/species/SpeciesPage';
import Explore, { type ExploreData } from './components/explore/Explore';
import ComparePage, { type CompareData } from './components/compare/ComparePage';
import OgPage, { type OgData } from './components/og/OgPage';
import DailyPage, { type DailyData } from './components/daily/DailyPage';
import TrendsPage from './components/trends/TrendsPage';
import JournalPage from './components/journal/JournalPage';
import LineupPage, { DEFAULT_LINEUP, lineupPath, MAX_ANIMALS, type LineupData } from './components/lineup/LineupPage';
import { answerPool, dailyAnswer, practiceAnswer, puzzleNumber, todayKey } from './lib/daily';
import { pairPath, parsePair } from './lib/compare';
import { Header } from './components/ui/Header';
import { Grain } from './components/ui/Grain';
import { fetchSpecies, fetchStats, fetchTrends, listSpecies, Moved, relatedSpecies } from './data';
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

/** Today's puzzle, or a practice round (?p=<seed>) that doesn't count toward the streak. */
async function dailyLoader({ request }: LoaderFunctionArgs): Promise<DailyData> {
  const seed = new URL(request.url).searchParams.get('p');
  const { items } = await listSpecies({ sort: 'popular', pageSize: 100 });
  const pool = answerPool(items);
  const day = todayKey();
  const slug = seed ? practiceAnswer(pool, seed) : dailyAnswer(pool, day);
  const answer = await fetchSpecies(slug);
  if (!answer) throw new Error(`daily answer ${slug} not found`);
  return { day, number: puzzleNumber(day), practice: seed, answer, suggestions: items.slice(0, 12) };
}

/** "/lineup/tiger,red-panda,you": up to six animals, and optionally the visitor. */
async function lineupLoader({ params }: LoaderFunctionArgs): Promise<LineupData | Response> {
  const ids = String(params.list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const you = ids.includes('you');
  const wanted = [...new Set(ids.filter((s) => s !== 'you'))].slice(0, MAX_ANIMALS);
  const found = await Promise.all(
    wanted.map((slug) =>
      fetchSpecies(slug).catch((e) => {
        if (e instanceof Moved) return fetchSpecies(e.to).catch(() => null);
        return null;
      }),
    ),
  );
  const animals = found.filter((s): s is NonNullable<typeof s> => !!s);
  if (!animals.length) return redirect(DEFAULT_LINEUP);
  // renamed or unknown animals are dropped from the address too
  const canonical = lineupPath(animals.map((a) => a.slug), you);
  if (canonical !== `/lineup/${ids.join(',')}`) return redirect(canonical);
  const suggestions = await listSpecies({ sort: 'popular', pageSize: 12 }).then((r) => r.items).catch(() => []);
  return { animals, you, suggestions };
}

async function ogLoader({ params }: LoaderFunctionArgs): Promise<OgData> {
  const [sp, stats] = await Promise.all([params.slug ? fetchSpecies(params.slug).catch(() => null) : null, fetchStats().catch(() => null)]);
  return { sp, stats };
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
      { path: '/daily', element: <DailyPage />, loader: dailyLoader },
      { path: '/journal', element: <JournalPage />, loader: () => fetchStats().catch(() => null) },
      { path: '/trends', element: <TrendsPage />, loader: () => fetchTrends() },
      { path: '/lineup', loader: () => redirect(DEFAULT_LINEUP) },
      { path: '/lineup/:list', element: <LineupPage />, loader: lineupLoader },
      { path: '/compare', loader: () => redirect(DEFAULT_PAIR) },
      { path: '/compare/:pair', element: <ComparePage />, loader: compareLoader },
      // social card renders for scripts/og.ts (not linked from the site)
      { path: '/og', element: <OgPage />, loader: ogLoader },
      { path: '/og/:slug', element: <OgPage />, loader: ogLoader },
      { path: '*', loader: () => redirect('/') },
    ],
  },
]);
