import type { Species } from '../../../data/types';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';

/** The strip runs from the start of the Triassic to today, in millions of years ago. */
const START = 252;
const PERIODS = [
  { name: 'Triassic', from: 252, to: 201 },
  { name: 'Jurassic', from: 201, to: 145 },
  { name: 'Cretaceous', from: 145, to: 66 },
  { name: 'Age of mammals', from: 66, to: 0 },
];
/** Oldest Homo sapiens fossils, in millions of years. */
const HUMANS_MYA = 0.3;

const pct = (mya: number) => ((START - mya) / START) * 100;

/** Fossil animals, in place of the population chapter: when it lived, on a strip of deep time. */
export function Era({ sp, n }: { sp: Species; n: number }) {
  const f = sp.fossil!;
  const [from, to] = f.mya;
  const span = from - to;
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
          <p className="display era__number num">
            {from} <span className="era__to">to</span> {to}
          </p>
          <p className="label">million years ago</p>
          <p className="era__delta num">
            In the rock record for about {span} million {span === 1 ? 'year' : 'years'} · gone {Math.round(to - HUMANS_MYA)} million years before the first humans
          </p>
        </Reveal>

        <Reveal as="p" className="lede era__story" split="fade" delay={0.15}>
          {f.story}
        </Reveal>

        <Reveal className="era__scale" split="fade" delay={0.2}>
          <div
            className="era__strip"
            role="img"
            aria-label={`Timescale from ${START} million years ago to today. ${sp.commonName} lived from ${from} to ${to} million years ago, in the ${f.period}.`}
          >
            {PERIODS.map((p) => (
              <span key={p.name} className="era__period" style={{ width: `${pct(p.to) - pct(p.from)}%` }}>
                <span className="era__period-name label">{p.name}</span>
                <span className="era__period-from label num">{p.from}</span>
              </span>
            ))}
            <span className={`era__band${pct(from) > 55 ? ' era__band--end' : ''}`} style={{ left: `${pct(from)}%`, width: `${pct(to) - pct(from)}%` }}>
              <span className="era__band-name label label--ink">{sp.commonName}</span>
            </span>
            <span className="era__today label num">Today</span>
          </div>
          <p className="label era__note">All of human history fits inside the line at the far right: our species is about {HUMANS_MYA} million years old.</p>
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
