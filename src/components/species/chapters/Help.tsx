import type { Species } from '../../../data/types';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';

export function Help({ sp, n }: { sp: Species; n: number }) {
  const { actions, orgs } = sp.help!;
  return (
    <section className="chapter ch-help" aria-labelledby="help-title">
      <div className="stage help">
        <div className="help__head">
          <Reveal split="fade">
            <ChapterLabel n={n}>How you can help</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="help-title" className="display h2" split="lines">
            Small acts, <em>multiplied.</em>
          </Reveal>
        </div>
        <ol className="actions">
          {actions.map((a, i) => (
            <Reveal as="li" key={a.title} split="fade" delay={0.08 * i}>
              <span className="label num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="h3">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noreferrer" className="action__link">
                      {a.title} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    a.title
                  )}
                </h3>
                <p className="muted">{a.detail}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <Reveal className="orgs" split="fade" delay={0.3}>
          <p className="label">Support the people doing the work</p>
          <ul>
            {orgs.map((o) => (
              <li key={o.url}>
                <a href={o.url} target="_blank" rel="noreferrer" className="org">
                  <span className="link">{o.name}</span> <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
