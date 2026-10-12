import { useEffect, useMemo, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import gsap from 'gsap';
import { prefetchSpecies } from '../../data';
import type { SpeciesRecord, SpeciesSummary } from '../../data/api';
import { realSize, type RealSize } from '../../lib/compare';
import { fmtLength } from '../../lib/format';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { live, useStore } from '../../store/useStore';
import { SpeciesPicker } from '../compare/SpeciesPicker';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';

export const MAX_ANIMALS = 6;
export const DEFAULT_LINEUP = '/lineup/african-savanna-elephant,polar-bear,tiger,giant-panda,red-panda,you';

export interface LineupData {
  animals: SpeciesRecord[];
  you: boolean;
  suggestions: SpeciesSummary[];
}

export const lineupPath = (slugs: string[], you: boolean) => `/lineup/${[...slugs, ...(you ? ['you'] : [])].join(',')}`;

interface Member {
  id: string;
  name: string;
  size: RealSize;
  sp?: SpeciesRecord;
}

/** Several animals (and the visitor) side by side at true scale. */
export default function LineupPage() {
  const { animals, you, suggestions } = useLoaderData() as LineupData;
  const navigate = useNavigate();
  const go = useTransitionNavigate();
  const units = useStore((s) => s.units);
  const heightM = useStore((s) => s.userHeightM);
  const phone = useMediaQuery('(max-width: 768px)');
  const [adding, setAdding] = useState(false);
  const tags = useRef<(HTMLElement | null)[]>([]);

  // smallest to largest, left to right, like a size chart
  const members = useMemo<Member[]>(() => {
    const list: Member[] = animals.map((sp) => ({ id: sp.slug, name: sp.commonName, size: realSize(sp), sp }));
    if (you) list.push({ id: `you@${heightM.toFixed(2)}`, name: 'You', size: { metres: heightM, by: 'height', standing: false, approx: false } });
    return list.sort((a, b) => a.size.metres - b.size.metres);
  }, [animals, you, heightM]);
  const shapeKey = `lineup:${members.map((m) => m.id).join('|')}`;

  useEffect(() => {
    live.chapterKeys = ['lineup'];
    live.pos = 0;
    document.title = 'Line-up · AniDex';
  }, []);
  useEffect(() => {
    useStore.setState({ page: 'lineup', slug: null, shape: shapeKey, previewShape: null, activePlace: -1 });
  }, [shapeKey]);

  // names follow the animals; neighbours too close together are staggered
  useEffect(() => {
    const tick = () => {
      const ll = live.lineupLabels;
      let prevX = -Infinity;
      let lift = false;
      tags.current.forEach((el, i) => {
        const a = ll.items[i];
        if (!el || !a) return;
        const show = a.on && ll.opacity > 0.02;
        el.style.opacity = show ? String(ll.opacity) : '0';
        if (!show) return;
        lift = a.x - prevX < 130 ? !lift : false;
        prevX = a.x;
        // keep the whole name on screen (tags are 10rem wide, centred on the animal)
        const half = Math.min(80, el.offsetWidth / 2);
        const x = Math.min(window.innerWidth - half, Math.max(half, a.x));
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${(a.y - (lift ? 34 : 0)).toFixed(1)}px, 0)`;
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const slugs = animals.map((a) => a.slug);
  const update = (next: string[], withYou = you) => navigate(lineupPath(next, withYou), { replace: true, preventScrollReset: true });
  const biggest = members.at(-1);
  const smallest = members[0];
  const ratio = biggest && smallest && members.length > 1 ? biggest.size.metres / smallest.size.metres : 1;
  const fmtRatio = ratio >= 10 ? Math.round(ratio).toLocaleString('en-US') : ratio.toFixed(1).replace(/\.0$/, '');

  const sizeText = (s: RealSize) => `${s.approx ? '≈ ' : ''}${fmtLength([s.metres, s.metres], units)} ${s.by === 'height' ? 'tall' : 'long'}`;

  return (
    <main className="lineup" data-page>
      <section className="chapter lineup__stage">
        <div className="lineup__head">
          <p className="label label--dot">Line-up · true scale</p>
          <h1 className="display lineup__title">
            Side by <em>side</em>
          </h1>
          {members.length > 1 && biggest && smallest && (
            <p className="lineup__fact">
              {biggest.sp ? `The ${biggest.name} is` : 'You are'} about <span className="num">{fmtRatio}×</span> the size of{' '}
              {smallest.sp ? `the ${smallest.name}` : 'you'}.
            </p>
          )}
        </div>

        <div className="pair-tags lineup-tags" aria-hidden="true">
          {members.map((m, i) => (
            <div key={m.id} ref={(el) => void (tags.current[i] = el)} className="pair-tag lineup-tag">
              <span className="pair-tag__name">{m.name}</span>
              <span className="pair-tag__k num">{sizeText(m.size)}</span>
            </div>
          ))}
        </div>

        <div className="lineup__bar">
          <ul className="lineup__chips" aria-label="In the line-up">
            {members.map((m) => (
              <li key={m.id} className="lineup-chip">
                {m.sp ? (
                  <a
                    href={`/species/${m.sp.slug}`}
                    className="lineup-chip__name"
                    onMouseEnter={() => prefetchSpecies(m.sp!.slug)}
                    onClick={(e) => {
                      e.preventDefault();
                      go(`/species/${m.sp!.slug}`, m.sp!.slug);
                    }}
                  >
                    {m.name}
                  </a>
                ) : (
                  <span className="lineup-chip__name">You</span>
                )}
                <span className="lineup-chip__size label num">{sizeText(m.size)}</span>
                {members.length > 1 && (
                  <button
                    className="lineup-chip__x"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => (m.sp ? update(slugs.filter((s) => s !== m.sp!.slug)) : update(slugs, false))}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="lineup__actions">
            {!you && (
              <button className="compare-btn" onClick={() => update(slugs, true)}>
                Add you
              </button>
            )}
            {animals.length < MAX_ANIMALS && (
              <div className="compare-with">
                <button className={`compare-btn${adding ? ' is-on' : ''}`} aria-expanded={adding} onClick={() => setAdding(!adding)}>
                  {adding ? 'Close' : '+ Add an animal'}
                </button>
                {adding && (
                  <div className="compare-with__panel lineup__picker">
                    <SpeciesPicker
                      label="Add to the line-up"
                      suggestions={suggestions}
                      exclude={slugs}
                      autoFocus
                      onPick={(s) => {
                        setAdding(false);
                        update([...slugs, s.slug]);
                      }}
                      onHover={(s) => s && prefetchSpecies(s.slug)}
                      onClose={phone ? () => setAdding(false) : undefined}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
