import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Species } from '../../../data/types';
import { live, useStore } from '../../../store/useStore';
import { smoothstep } from '../../../lib/math';
import { fmtEstimate } from '../../../lib/format';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { Timeline } from './Timeline';
import { estimateAt, rangeCounts, rangeEvents, type RangeEvent } from './popMath';

export function Population({ sp, n }: { sp: Species; n: number }) {
  const pts = sp.population.points;
  const events = useMemo(() => rangeEvents(sp), [sp]);
  const single = pts.length < 2;
  // the scrubber starts at the first count and runs to the later of the last count or the last range event
  const lastCount = pts[pts.length - 1].year;
  const y0 = pts[0].year;
  const y1 = Math.max(lastCount, events[events.length - 1]?.year ?? -Infinity);
  const [year, setYear] = useState(single ? y1 : y0);
  const override = useRef(false);
  const chapter = useStore((s) => s.chapter);
  // this chapter's index among the page's chapters (it moves when a species has extra chapters)
  const CH = n - 1;

  useEffect(() => {
    if (chapter !== CH) override.current = false;
  }, [chapter, CH]);

  useEffect(() => {
    if (single) return;
    const tick = () => {
      if (override.current) return;
      const t = smoothstep(0.04, 0.82, live.progress[CH]);
      const yr = Math.round(y0 + (y1 - y0) * t);
      setYear((prev) => (prev === yr ? prev : yr));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [y0, y1, single, CH]);

  // latest range event at or before the scrubbed year drives the globe focus and the caption
  const current: RangeEvent | null = useMemo(() => {
    let e: RangeEvent | null = null;
    for (const ev of events) if (ev.year <= year) e = ev;
    return e;
  }, [events, year]);

  useEffect(() => {
    live.year = year;
    live.historyFocus = current ? current.region : -1;
  }, [year, current]);
  useEffect(
    () => () => {
      live.year = null;
      live.historyFocus = -1;
    },
    [],
  );

  const est = estimateAt(pts, year);
  const first = pts[0].estimate;
  const change = ((est - first) / first) * 100;
  const deltaText = single
    ? `Single global estimate, ${pts[0].year}`
    : year <= pts[0].year
      ? 'Earliest estimate in this series'
      : change >= 300
        ? `${(est / first).toFixed(est / first < 10 ? 1 : 0)}× since ${pts[0].year}`
        : `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(change > -10 && change < 10 ? 1 : 0)}% since ${pts[0].year}`;
  const counts = rangeCounts(sp, year);
  // headline follows the chart's own recent direction (IUCN's trend label can lag the latest counts)
  const peakEst = Math.max(...pts.map((p) => p.estimate));
  const lastPt = pts[pts.length - 1].estimate;
  const prevPt = pts.length > 1 ? pts[pts.length - 2].estimate : lastPt;
  const headline =
    pts.length < 2
      ? sp.status.trend === 'increasing'
        ? 'Slowly coming back'
        : sp.status.trend === 'decreasing'
          ? 'Still slipping away'
          : 'Holding on, for now'
      : lastPt > prevPt * 1.05
        ? lastPt < peakEst * 0.6
          ? 'Slowly coming back'
          : 'Coming back'
        : lastPt < prevPt * 0.95
          ? 'Still slipping away'
          : 'Holding on, for now';
  const hasHistory = events.length > 0 || (sp.rangeHistory?.regions.length ?? 0) > 0;

  return (
    <section className="chapter ch-pop" aria-labelledby="pop-title">
      <div className="stage pop">
        <div className="pop__head">
          <Reveal split="fade">
            <ChapterLabel n={n}>Population over time</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="pop-title" className="display h2 pop__title" split="lines">
            {headline}
          </Reveal>
          <div className="pop__readout" aria-live="polite" aria-atomic="true">
            <p className="display pop__number num">
              <span className="pop__approx">≈</span>
              {fmtEstimate(est)}
            </p>
            <p className="label">
              {sp.population.unit} · in <span className="num label--ink">{Math.min(year, lastCount)}</span>
              {year > lastCount ? ' · latest count' : ''}
            </p>
            <p className="pop__delta num">{deltaText}</p>
          </div>

          {hasHistory && (
            <div className="history">
              {current ? (
                <div className="event" key={`${current.region}-${current.kind}`} data-kind={current.kind}>
                  <p className="label event__meta">
                    <span className="event__kind">{current.kind === 'lost' ? 'Lost' : 'Returned'}</span>
                    <span className="num">{current.year}</span>
                  </p>
                  <p className="event__place">{current.name}</p>
                  <p className="event__note">{current.note}</p>
                </div>
              ) : (
                <div className="event event--idle">
                  <p className="label">Drag through time to see where they vanished and where they came back</p>
                </div>
              )}
              <ul className="legend label" aria-label="Map legend">
                <li>
                  <i className="lg lg--present" aria-hidden="true" />
                  Present <span className="num label--ink">{counts.present}</span>
                </li>
                <li>
                  <i className="lg lg--lost" aria-hidden="true" />
                  Lost <span className="num label--ink">{counts.lost}</span>
                </li>
                {events.some((e) => e.kind === 'gained') && (
                  <li>
                    <i className="lg lg--new" aria-hidden="true" />
                    Returned
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {!single ? (
          <Timeline
            points={pts}
            year={year}
            domain={[y0, y1]}
            events={events}
            label={sp.population.unit}
            onScrub={(y) => {
              override.current = true;
              setYear(y);
            }}
          />
        ) : (
          <div className="timeline timeline--single">
            <p className="label">One estimate, no time series. Nobody has counted this species consistently enough to draw a line.</p>
          </div>
        )}
        <p className="label pop__source">
          Population:{' '}
          <a className="link label--ink" href={sp.population.source.url} target="_blank" rel="noreferrer">
            {sp.population.source.label}
          </a>
          {sp.population.note ? <span className="pop__note"> {sp.population.note}</span> : null}
          {sp.rangeHistory && (
            <>
              {' '}
              Range history:{' '}
              <a className="link label--ink" href={sp.rangeHistory.source.url} target="_blank" rel="noreferrer">
                {sp.rangeHistory.source.label}
              </a>
              {sp.rangeHistory.note ? <span className="pop__note"> {sp.rangeHistory.note}</span> : null}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
