import type { Species } from '../../../data/types';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { fmtAgo, fmtCompact } from '../../../lib/format';

interface Scale {
  /** left edge of the strip, in millions of years ago */
  start: number;
  periods: { name: string; from: number; to: number; bare?: boolean }[];
}
/** Dinosaurs and other deep-time animals: the start of the Triassic to today. */
const DEEP: Scale = {
  start: 252,
  periods: [
    { name: 'Triassic', from: 252, to: 201 },
    { name: 'Jurassic', from: 201, to: 145 },
    { name: 'Cretaceous', from: 145, to: 66 },
    { name: 'Age of mammals', from: 66, to: 0 },
  ],
};
/** Ice Age animals: the Pleistocene to today. The last slice is too narrow for its own start year. */
const ICE: Scale = {
  start: 2.58,
  periods: [
    { name: 'Early Pleistocene', from: 2.58, to: 0.774 },
    { name: 'Middle', from: 0.774, to: 0.129 },
    { name: 'Late', from: 0.129, to: 0, bare: true },
  ],
};
/** Oldest Homo sapiens fossils, in millions of years. */
const HUMANS_MYA = 0.3;

/** Fossil animals, in place of the population chapter: when it lived, on a strip of deep time. */
export function Era({ sp, n }: { sp: Species; n: number }) {
  const f = sp.fossil!;
  const [from, to] = f.mya;
  const scale = from <= ICE.start ? ICE : DEEP;
  const pct = (mya: number) => ((scale.start - Math.min(mya, scale.start)) / scale.start) * 100;
  // whole millions read best as "68 to 66 million years ago"; recent animals are given in years
  const inMillions = to >= 1;
  return (
    <section className="chapter ch-era" aria-labelledby="era-title">
      <div className="stage era">
        <div className="era__head">
          <Reveal split="fade">
            <ChapterLabel n={n}>When it lived</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="era-title" className="display h2" split="lines">
            {f.period}
          </Reveal>
        </div>

        <Reveal className="era__readout" split="fade" delay={0.1}>
          <p className={`display era__number num${inMillions ? '' : ' era__number--years'}`}>
            {inMillions ? from : fmtAgo(from)} <span className="era__to">to</span> {inMillions ? to : fmtAgo(to)}
          </p>
          <p className="label">{inMillions ? 'million years ago' : 'years ago'}</p>
          <p className="era__delta num">
            In the fossil record for about {fmtAgo(from - to)} years ·{' '}
            {to < HUMANS_MYA ? 'still alive when our species appeared, about 300,000 years ago' : `gone ${fmtAgo(to - HUMANS_MYA)} years before the first humans`}
          </p>
        </Reveal>

        <Reveal as="p" className="lede era__story" split="fade" delay={0.15}>
          {f.story}
        </Reveal>

        <Reveal className="era__scale" split="fade" delay={0.2}>
          <div
            className="era__strip"
            role="img"
            aria-label={`Timescale from ${fmtAgo(scale.start)} years ago to today. ${sp.commonName} lived from ${fmtAgo(from)} to ${fmtAgo(to)} years ago, in the ${f.period}.`}
          >
            {scale.periods.map((p) => (
              <span key={p.name} className={`era__period${p.bare ? ' era__period--bare' : ''}`} style={{ width: `${pct(p.to) - pct(p.from)}%` }}>
                <span className="era__period-name label">{p.name}</span>
                {!p.bare && <span className="era__period-from label num">{fmtCompact(p.from * 1e6)}</span>}
              </span>
            ))}
            <span className={`era__band${pct(from) > 55 ? ' era__band--end' : ''}`} style={{ left: `${pct(from)}%`, width: `${pct(to) - pct(from)}%` }}>
              <span className="era__band-name label label--ink">{sp.commonName}</span>
            </span>
            <span className="era__today label num">Today</span>
          </div>
          <p className="label era__note">
            {scale === ICE
              ? 'Start years are years ago. Our species is about 300,000 years old: it appears in the last eighth of this strip.'
              : 'Start years are years ago. All of human history fits inside the line at the far right: our species is about 300,000 years old.'}
          </p>
        </Reveal>

        <p className="label caption">
          Dating:{' '}
          <a className="link label--ink" href={f.source.url} target="_blank" rel="noreferrer">
            {f.source.label}
          </a>
        </p>
      </div>
    </section>
  );
}
