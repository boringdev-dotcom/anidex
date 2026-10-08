import { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router';
import type { ResearchState, SpeciesRecord } from '../../data/api';
import { forgetSpecies, researchStatus } from '../../data';

const MESSAGE: Partial<Record<ResearchState, string>> = {
  queued: 'Researching this species: threats, where to see it, how to help, and its measurements. This takes a minute or two.',
  running: 'Researching this species: threats, where to see it, how to help, and its measurements. This takes a minute or two.',
  failed: 'Research for this species did not finish. It will be retried on a later visit.',
  capped: 'Deeper research for new species is paused for today. Check back tomorrow.',
};

/**
 * Auto pages: on first visit, ask the server to research the species, show progress, and reload the
 * page's data when the research lands (new chapters appear). Researched pages show a review note.
 */
export function ResearchStatus({ sp }: { sp: SpeciesRecord }) {
  const revalidator = useRevalidator();
  const [state, setState] = useState<ResearchState | null>(sp.tier === 'deep' || sp.research ? 'done' : null);
  const [position, setPosition] = useState<number | undefined>();

  useEffect(() => {
    if (sp.tier === 'deep' || sp.research) return;
    let stop = false;
    let timer: number | undefined;
    const poll = async (start: boolean) => {
      try {
        const r = await researchStatus(sp.slug, start);
        if (stop) return;
        setState(r.state);
        setPosition(r.position);
        if (r.state === 'done') {
          forgetSpecies(sp.slug);
          revalidator.revalidate();
          return;
        }
        if (r.state === 'queued' || r.state === 'running') timer = window.setTimeout(() => poll(false), 6000);
      } catch {
        if (!stop) timer = window.setTimeout(() => poll(false), 15000);
      }
    };
    poll(true);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.slug, sp.research]);

  if (sp.tier === 'deep') return null;

  if (sp.research) {
    return (
      <div className="research research--done">
        <p className="label">
          <span className="research__dot" aria-hidden="true" /> AI-researched with web sources · may contain mistakes
        </p>
        {sp.sources && sp.sources.length > 0 && (
          <details className="research__sources">
            <summary className="label">Sources ({sp.sources.length})</summary>
            <ol>
              {sp.sources.map((s) => (
                <li key={s.url}>
                  <a className="link" href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    );
  }

  const msg = state ? MESSAGE[state] : null;
  if (!msg) return null;
  const busy = state === 'queued' || state === 'running';
  return (
    <div className={`research${busy ? ' is-busy' : ''}`} role="status" aria-live="polite">
      <p className="label">
        {busy && <span className="research__pulse" aria-hidden="true" />}
        {busy ? (state === 'queued' && position ? `In line · ${position} ahead` : 'Researching') : 'Research'}
      </p>
      <p className="research__msg">{msg}</p>
    </div>
  );
}
