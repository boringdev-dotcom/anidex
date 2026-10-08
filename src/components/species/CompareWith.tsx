import { useState } from 'react';
import type { SpeciesSummary } from '../../data/api';
import type { Species } from '../../data/types';
import { prefetchSpecies, relatedSpecies } from '../../data';
import { useStore } from '../../store/useStore';
import { pairPath, pairShapeKey } from '../../lib/compare';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';
import { SpeciesPicker } from '../compare/SpeciesPicker';

/** "Compare with…": pick another animal and open the head-to-head page. */
export function CompareWith({ sp }: { sp: Species }) {
  const [open, setOpen] = useState(false);
  const [related, setRelated] = useState<SpeciesSummary[]>([]);
  const go = useTransitionNavigate();
  const toggle = () => {
    if (!open && !related.length) relatedSpecies(sp.slug, 6).then(setRelated).catch(() => {});
    setOpen(!open);
    if (open) useStore.setState({ previewShape: null });
  };
  return (
    <div className="compare-with">
      <button className={`compare-btn${open ? ' is-on' : ''}`} aria-expanded={open} onClick={toggle}>
        <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M3 14h6M3 14l2.5-2.5M3 14l2.5 2.5M17 6h-6M17 6l-2.5-2.5M17 6l-2.5 2.5" />
        </svg>
        {open ? 'Close' : 'Compare with another animal'}
      </button>
      {open && (
        <div className="compare-with__panel">
          <SpeciesPicker
            label={`${sp.commonName} vs`}
            suggestions={related}
            exclude={[sp.slug]}
            autoFocus
            onPick={(s) => go(pairPath(sp.slug, s.slug), pairShapeKey(sp.slug, s.slug))}
            onHover={(s) => {
              if (s) prefetchSpecies(s.slug);
              useStore.setState({ previewShape: s ? pairShapeKey(sp.slug, s.slug) : null });
            }}
            onClose={toggle}
          />
        </div>
      )}
    </div>
  );
}
