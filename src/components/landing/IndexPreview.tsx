import { STATUS_SHORT } from '../../data';
import type { SpeciesSummary } from '../../data/api';
import { useStore } from '../../store/useStore';

/** Desktop only: names the hovered row's specimen, which sits in the space kept clear right of the list. */
export function IndexPreview({ items }: { items: SpeciesSummary[] }) {
  const slug = useStore((s) => s.previewShape);
  const s = slug ? items.find((it) => it.slug === slug) : null;
  return (
    <div className={`index-preview${s ? ' is-on' : ''}`} aria-hidden="true">
      {s && (
        <>
          <p className="index-preview__name display">{s.commonName}</p>
          <p className="index-preview__sci italic muted">{s.scientificName}</p>
          <p className="label index-preview__tax">{[s.class, s.order, s.family].filter(Boolean).join(' · ')}</p>
          {s.iucn && (
            <span className="status-chip" style={{ ['--status' as string]: `var(--st-${s.iucn})` }}>
              {STATUS_SHORT[s.iucn]}
            </span>
          )}
        </>
      )}
    </div>
  );
}
