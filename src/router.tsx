import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { lazy, Suspense } from 'react';
import Landing from './components/landing/Landing';
import SpeciesPage from './components/species/SpeciesPage';
import { Header } from './components/ui/Header';
import { Grain } from './components/ui/Grain';

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

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/species/:slug', element: <SpeciesPage /> },
      { path: '*', element: <Landing /> },
    ],
  },
]);
