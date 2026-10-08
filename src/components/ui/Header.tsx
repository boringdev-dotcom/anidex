import { Link, useLocation } from 'react-router';
import { useStore } from '../../store/useStore';
import { getSpecies } from '../../data';
import { ThemeToggle } from './ThemeToggle';
import { useTransitionNavigate } from './useTransitionNavigate';

export function Header() {
  const slug = useStore((s) => s.slug);
  const page = useStore((s) => s.page);
  const go = useTransitionNavigate();
  const loc = useLocation();
  const sp = getSpecies(slug);

  const home = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loc.pathname === '/') return;
    go('/', 'ambient');
  };

  return (
    <header className="site-header">
      <Link to="/" className="wordmark" onClick={home} aria-label="AniDex, home">
        <span className="wordmark__dot" aria-hidden="true" />
        AniDex
      </Link>
      <div className="site-header__mid label" aria-hidden={page !== 'species'}>
        {page === 'species' && sp && (
          <span>
            {sp.taxonomy.class} <span className="muted">· {sp.taxonomy.family}</span>
          </span>
        )}
      </div>
      <nav className="site-header__right" aria-label="Site">
        <Link to="/explore" className="label label--ink header-link">
          Explore
        </Link>
        {page === 'species' && (
          <a href="/" className="label label--ink header-link" onClick={home}>
            Search
          </a>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
