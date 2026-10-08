import { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router';
import type { SpecimenState, SpeciesRecord } from '../../data/api';
import { fetchSpecies, forgetSpecies, specimenStatus } from '../../data';
import { useStore } from '../../store/useStore';

/**
 * Species without a 3D model: on first visit, ask the server to sculpt one and show progress while
 * the procedural sketch stands in. When it lands, the point cloud re-forms into the real animal.
 */
export function SpecimenStatus({ sp }: { sp: SpeciesRecord }) {
  const revalidator = useRevalidator();
  const hasModel = !!sp.specimen.model;
  const [state, setState] = useState<SpecimenState | null>(null);
  const [position, setPosition] = useState<number | undefined>();

  useEffect(() => {
    if (hasModel) return;
    let stop = false;
    let timer: number | undefined;
    const poll = async (start: boolean) => {
      try {
        const r = await specimenStatus(sp.slug, start);
        if (stop) return;
        setState(r.state);
        setPosition(r.position);
        if (r.state === 'ready') {
          forgetSpecies(sp.slug);
          await fetchSpecies(sp.slug);
          if (stop) return;
          useStore.setState((s) => ({ modelRev: s.modelRev + 1 }));
          revalidator.revalidate();
          return;
        }
        if (r.state === 'queued' || r.state === 'generating') timer = window.setTimeout(() => poll(false), 8000);
      } catch {
        if (!stop) timer = window.setTimeout(() => poll(false), 20000);
      }
    };
    poll(true);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.slug, hasModel]);

  if (hasModel || (state !== 'queued' && state !== 'generating')) return null;
  return (
    <p className="label specimen-status" role="status" aria-live="polite">
      <span className="research__pulse" aria-hidden="true" />
      {state === 'queued' && position ? `3D specimen in line · ${position} ahead` : 'Sculpting the 3D specimen · about 4 min'}
    </p>
  );
}
