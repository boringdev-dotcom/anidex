import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Species } from '../../../data/types';
import { live, useStore } from '../../../store/useStore';
import { smoothstep } from '../../../lib/math';
import { fmtEstimate } from '../../../lib/format';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { Timeline } from './Timeline';
import { estimateAt, maxEstimate } from './popMath';

const CH = 2;

export function Population({ sp }: { sp: Species }) {
  const pts = sp.population.points;
  const y0 = pts[0].year;
  const y1 = pts[pts.length - 1].year;
  const max = useMemo(() => maxEstimate(pts), [pts]);
  const [year, setYear] = useState(y0);
  const override = useRef(false);
  const chapter = useStore((s) => s.chapter);

  // leaving the chapter hands control back to scroll
  useEffect(() => {
    if (chapter !== CH) override.current = false;
  }, [chapter]);

  // scroll drives the year until the reader grabs the handle
  useEffect(() => {
    const tick = () => {
      if (override.current) return;
      const t = smoothstep(0.04, 0.8, live.progress[CH]);
      const yr = Math.round(y0 + (y1 - y0) * t);
      setYear((prev) => (prev === yr ? prev : yr));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [y0, y1]);

  const est = estimateAt(pts, year);
  useEffect(() => {
    live.alive = Math.max(0.004, est / max);
  }, [est, max]);
  useEffect(
    () => () => {
      live.alive = 1;
    },
    [],
  );

  const first = pts[0].estimate;
  const change = ((est - first) / first) * 100;
  const peak = pts.reduce((a, b) => (b.estimate > a.estimate ? b : a));
  const deltaText =
    pts.length < 2
      ? `Single global estimate, ${y0}`
      : year === y0
      ? `Earliest estimate in this series`
      : `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(change > -10 && change < 10 ? 1 : 0)}% since ${y0}`;

  return (
    <section className="chapter ch-pop" aria-labelledby="pop-title">
      <div className="stage pop">
        <div className="pop__head">
          <div className="pop__intro">
            <Reveal split="fade">
              <ChapterLabel n={3}>Population over time</ChapterLabel>
            </Reveal>
            <Reveal as="h2" id="pop-title" className="display h2" split="lines">
              {sp.status.trend === 'increasing' ? 'Slowly coming back' : sp.status.trend === 'decreasing' ? 'Still slipping away' : 'Holding on, for now'}
            </Reveal>
            <p className="pop__peak label">
              Peak in series · <span className="num label--ink">{fmtEstimate(peak.estimate)}</span> in <span className="num">{peak.year}</span>
            </p>
          </div>
          <div className="pop__readout" aria-live="polite" aria-atomic="true">
            <p className="display pop__number num">
              <span className="pop__approx">≈</span>
              {fmtEstimate(est)}
            </p>
            <p className="label">
              {sp.population.unit} · in <span className="num label--ink">{year}</span>
            </p>
            <p className="pop__delta num">{deltaText}</p>
          </div>
        </div>
        {pts.length > 1 ? (
          <Timeline
            points={pts}
            year={year}
            label={sp.population.unit}
            onScrub={(y) => {
              override.current = true;
              setYear(y);
            }}
          />
        ) : (
          <div className="timeline timeline--single">
            <p className="label">
              One estimate, no time series. Nobody has counted this species consistently enough to draw a line.
            </p>
          </div>
        )}
        <p className="label pop__source">
          Source:{' '}
          <a className="link label--ink" href={sp.population.source.url} target="_blank" rel="noreferrer">
            {sp.population.source.label}
          </a>
          {sp.population.note ? <span className="pop__note"> {sp.population.note}</span> : null}
        </p>
      </div>
    </section>
  );
}
