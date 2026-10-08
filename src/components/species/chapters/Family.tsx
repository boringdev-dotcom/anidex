import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Species } from '../../../data/types';
import { variantKey } from '../../../data';
import { live, useStore } from '../../../store/useStore';
import { fmt } from '../../../lib/format';
import { smoothstep } from '../../../lib/math';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { StageSlot } from '../../ui/StageSlot';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const GROUP: Record<string, string> = { mainland: 'Mainland · P. t. tigris', sunda: 'Sunda Islands · P. t. sondaica' };

const range = ([a, b]: [number, number], unit: string, digits = 0) =>
  a === b ? `${a.toFixed(digits)} ${unit}` : `${a.toFixed(digits)} to ${b.toFixed(digits)} ${unit}`;

export function Family({ sp, n }: { sp: Species; n: number }) {
  const variants = useMemo(() => sp.variants ?? [], [sp]);
  const maxLen = useMemo(() => Math.max(...variants.map((v) => v.lengthM[1])), [variants]);
  const [sel, setSel] = useState(0);
  const override = useRef(false);
  const chapter = useStore((s) => s.chapter);
  const CH = n - 1;
  const active = chapter === CH;

  // scroll steps through the subspecies until the reader picks one
  useEffect(() => {
    const tick = () => {
      if (override.current || !variants.length) return;
      const t = smoothstep(0.02, 0.92, live.progress[CH]);
      const i = Math.min(variants.length - 1, Math.floor(t * variants.length));
      setSel((prev) => (prev === i ? prev : i));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [variants, CH]);

  useEffect(() => {
    if (!active) override.current = false;
  }, [active]);

  // drive the specimen: morph to the selected subspecies while this chapter is on screen
  const v = variants[sel];
  useEffect(() => {
    if (!v) return;
    live.variantScale = v.lengthM[1] / maxLen;
    live.variantGhost = v.alive ? 0 : 1;
    const { shape, transitioning } = useStore.getState();
    if (transitioning) return;
    if (active) {
      const key = variantKey(sp, v);
      if (shape !== key) useStore.setState({ shape: key });
    } else if (shape.startsWith(`${sp.slug}--`)) {
      useStore.setState({ shape: sp.slug });
    }
  }, [active, v, sp, maxLen]);

  if (!variants.length || !v) return null;
  const living = variants.filter((x) => x.alive).length;
  const plural = `${sp.commonName.toLowerCase()}s`;
  const pick = (i: number) => {
    override.current = true;
    setSel(i);
  };

  return (
    <section className="chapter ch-family" aria-labelledby="family-title">
      <div className="stage family">
        <StageSlot kind="specimen" chapter="family" className="m-slot--family" reserve={58}>
          <div>
            <p className="slot-title">{v.name}</p>
            <p className={`slot-sub${v.alive ? '' : ' is-extinct'}`}>
              {v.lengthM[1].toFixed(1)} m ·{' '}
              {v.alive ? (v.wild?.estimate ? `≈ ${fmt(v.wild.estimate)} wild` : v.wild?.estimate === 0 ? 'none in the wild' : 'numbers unknown') : `gone by ${v.extinctBy ?? '?'}`}
            </p>
          </div>
          <span className="slot-tag num">
            {String(sel + 1).padStart(2, '0')} / {String(variants.length).padStart(2, '0')}
          </span>
        </StageSlot>
        <div className="family__head">
          <Reveal split="fade">
            <ChapterLabel n={n}>Subspecies</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="family-title" className="display h2" split="lines">
            {`One species, ${WORDS[variants.length] ?? variants.length} ${plural}`}
          </Reveal>
          {sp.taxonomyNote && (
            <Reveal as="p" className="family__note" split="fade" delay={0.1}>
              {sp.taxonomyNote}
            </Reveal>
          )}
          <p className="label family__count">
            <span className="label--ink num">{living}</span> still living · <span className="label--ink num">{variants.length - living}</span> extinct ·
            bar shows body length
          </p>
        </div>

        <ol className="family__list">
          {variants.map((x, i) => (
            <li key={x.slug}>
              <button
                className={`variant${i === sel ? ' is-active' : ''}${x.alive ? '' : ' is-extinct'}`}
                aria-pressed={i === sel}
                onMouseEnter={() => pick(i)}
                onFocus={() => pick(i)}
                onClick={() => pick(i)}
              >
                <span className="variant__name">
                  {x.name}
                  {!x.alive && <sup aria-label="extinct">†</sup>}
                </span>
                <span className="variant__bar" aria-hidden="true">
                  <i style={{ width: `${(x.lengthM[1] / maxLen) * 100}%` }} />
                </span>
                <span className="variant__pop label num">
                  {x.alive ? (x.wild?.estimate ? `≈ ${fmt(x.wild.estimate)}` : x.wild?.estimate === 0 ? 'None wild' : 'Unknown') : `Gone by ${x.extinctBy ?? '?'}`}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <aside className="variant-card" key={v.slug} aria-live="polite">
          <p className="label">{v.group ? GROUP[v.group] ?? v.group : v.trinomial}</p>
          <h3 className="variant-card__name">{v.name}</h3>
          <p className="variant-card__tri italic">{v.trinomial}</p>
          <p className="variant-card__coat">{v.coat}</p>
          <dl className="variant-card__facts">
            <div>
              <dt className="label">Status</dt>
              <dd className={v.alive ? '' : 'is-extinct'}>{v.status}</dd>
            </div>
            <div>
              <dt className="label">In the wild</dt>
              <dd className="num">
                {v.alive ? (v.wild?.estimate ? `≈ ${fmt(v.wild.estimate)}` : v.wild?.estimate === 0 ? 'None' : 'Unknown') : 'None'}
              </dd>
            </div>
            <div>
              <dt className="label">Length (male)</dt>
              <dd className="num">{range(v.lengthM, 'm', 1)}</dd>
            </div>
            <div>
              <dt className="label">Weight (male)</dt>
              <dd className="num">{range(v.weightKg, 'kg')}</dd>
            </div>
          </dl>
          <p className="variant-card__range muted">
            {v.range}
            {v.alive && v.wild?.label ? ` ${v.wild.label[0].toUpperCase()}${v.wild.label.slice(1)}.` : ''}
          </p>
          {!v.alive && <p className="label variant-card__ghost">Shown as a reconstruction</p>}
        </aside>
      </div>
    </section>
  );
}
