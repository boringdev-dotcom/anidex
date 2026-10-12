import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useStore } from '../../store/useStore';
import { getSpecies } from '../../data';
import { useJournal } from '../../lib/journal';
import { ThemeToggle } from './ThemeToggle';
import { useTransitionNavigate } from './useTransitionNavigate';

const LINKS = [
  { to: '/daily', label: 'Daily', primary: true },
  { to: '/explore', label: 'Explore', primary: true },
  { to: '/compare', label: 'Compare' },
  { to: '/lineup', label: 'Line-up' },
  { to: '/trends', label: 'Then & now' },
  { to: '/journal', label: 'Journal' },
] as const;

export function Header() {
  const slug = useStore((s) => s.slug);
  const page = useStore((s) => s.page);
  const go = useTransitionNavigate();
  const loc = useLocation();
  const sp = getSpecies(slug);
  const seen = Object.keys(useJournal()).length;
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // the menu closes on navigation and on any press outside it
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const home = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loc.pathname === '/') return;
    go('/', 'ambient');
  };

  const label = (l: (typeof LINKS)[number]) => (
    <>
      {l.label}
      {l.to === '/journal' && seen > 0 && <sup className="header-link__n num">{seen}</sup>}
    </>
  );
  const current = (to: string) => (loc.pathname.startsWith(to) ? 'page' : undefined);

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
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className={`label label--ink header-link${'primary' in l ? '' : ' header-link--wide'}`} aria-current={current(l.to)}>
            {label(l)}
          </Link>
        ))}
        <div className="header-menu" ref={menuRef}>
          <button className="label label--ink header-link header-menu__btn" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {menu ? 'Close' : 'Menu'}
          </button>
          {menu && (
            <ul className="header-menu__list">
              {LINKS.filter((l) => !('primary' in l)).map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="header-menu__item" aria-current={current(l.to)}>
                    {label(l)}
                  </Link>
                </li>
              ))}
              {page === 'species' && (
                <li>
                  <a href="/" className="header-menu__item" onClick={home}>
                    Search
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
        {page === 'species' && (
          <a href="/" className="label label--ink header-link header-link--wide" onClick={home}>
            Search
          </a>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
