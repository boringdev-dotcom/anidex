import { useEffect, useId, useRef, useState } from 'react';
import { searchSpecies } from '../../data';
import type { SpeciesSummary } from '../../data/api';

interface Props {
  /** label for the input, e.g. "Compare with" */
  label: string;
  /** shown before the reader types */
  suggestions?: SpeciesSummary[];
  /** slugs that can't be picked (the other side of the pair) */
  exclude?: string[];
  onPick: (s: SpeciesSummary) => void;
  onHover?: (s: SpeciesSummary | null) => void;
  onClose?: () => void;
  autoFocus?: boolean;
}

/** A small search-as-you-type picker, used to choose the other animal of a comparison. */
export function SpeciesPicker({ label, suggestions = [], exclude = [], onPick, onHover, onClose, autoFocus }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SpeciesSummary[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchSpecies(term, ctrl.signal)
        .then((items) => {
          setResults(items);
          setActive(0);
        })
        .catch(() => {});
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const list = (q.trim() ? results : suggestions).filter((s) => !exclude.includes(s.slug)).slice(0, 7);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const n = Math.min(list.length - 1, active + 1);
      setActive(n);
      onHover?.(list[n] ?? null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.max(0, active - 1);
      setActive(n);
      onHover?.(list[n] ?? null);
    } else if (e.key === 'Enter') {
      const s = list[active];
      if (s) onPick(s);
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  return (
    <div className="picker">
      <label className="label picker__label" htmlFor={`${listId}-in`}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={`${listId}-in`}
        className="picker__input"
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search any animal"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={list.length > 0}
        aria-controls={listId}
        aria-activedescendant={list[active] ? `${listId}-${list[active].slug}` : undefined}
      />
      {list.length > 0 && (
        <ul id={listId} className="picker__list" role="listbox" onMouseLeave={() => onHover?.(null)}>
          {!q.trim() && <li className="label picker__hint" role="presentation">Suggested</li>}
          {list.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-${s.slug}`}
              role="option"
              aria-selected={i === active}
              className={`picker__opt${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => {
                setActive(i);
                onHover?.(s);
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(s)}
            >
              <span className="picker__name">{s.commonName}</span>
              <span className="picker__sci italic muted">{s.scientificName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
