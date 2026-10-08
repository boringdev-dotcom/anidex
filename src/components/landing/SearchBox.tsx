import { useId, useMemo, useRef, useState } from 'react';
import { allSpecies } from '../../data';
import { searchSpecies } from '../../lib/fuzzy';
import { useStore } from '../../store/useStore';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';

const SUGGEST = ['tiger', 'panda', 'whale', 'axolotl', 'wolf'];

export function SearchBox() {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const go = useTransitionNavigate();
  const results = useMemo(() => searchSpecies(allSpecies, q), [q]);
  const showList = open && q.trim().length > 0;

  const preview = (slug: string | null) => useStore.setState({ previewShape: slug });
  const choose = (slug: string) => go(`/species/${slug}`, slug);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const n = Math.min(results.length - 1, active + 1);
      setActive(n);
      if (results[n]) preview(results[n].slug);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.max(0, active - 1);
      setActive(n);
      if (results[n]) preview(results[n].slug);
    } else if (e.key === 'Enter') {
      const r = results[active] ?? results[0];
      if (r) choose(r.slug);
    } else if (e.key === 'Escape') {
      setQ('');
      preview(null);
    }
  };

  return (
    <div className="search" role="search">
      <label htmlFor="species-search" className="visually-hidden">
        Search a species
      </label>
      <div className="search__field">
        <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <input
          ref={inputRef}
          id="species-search"
          className="search__input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search an animal"
          value={q}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[active] ? `${listId}-${results[active].slug}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
            const r = searchSpecies(allSpecies, e.target.value)[0];
            preview(r ? r.slug : null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
        />
        <span className="search__hint label" aria-hidden="true">
          {q ? 'Enter ↵' : '⌕'}
        </span>
      </div>

      {showList ? (
        <ul id={listId} role="listbox" className="search__results" onMouseLeave={() => preview(results[active]?.slug ?? null)}>
          {results.length === 0 && <li className="search__empty label">Not in the index yet</li>}
          {results.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-${s.slug}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => {
                setActive(i);
                preview(s.slug);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s.slug);
              }}
            >
              <span className="search__name">{s.commonName}</span>
              <span className="search__sci italic">{s.scientificName}</span>
              <span className="status-chip" style={{ ['--status' as string]: `var(--st-${s.status.iucn})` }}>
                {s.status.iucn}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="search__suggest label">
          Try{' '}
          {SUGGEST.map((w, i) => (
            <span key={w}>
              <button
                className="label label--ink search__chip"
                onClick={() => {
                  setQ(w);
                  setOpen(true);
                  inputRef.current?.focus();
                  const r = searchSpecies(allSpecies, w)[0];
                  preview(r ? r.slug : null);
                }}
              >
                {w}
              </button>
              {i < SUGGEST.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
