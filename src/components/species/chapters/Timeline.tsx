import { useEffect, useMemo, useRef, useState } from 'react';
import { area, curveMonotoneX, line } from 'd3-shape';
import type { PopulationPoint } from '../../../data/types';
import { estimateAt } from './popMath';
import { fmt, fmtCompact } from '../../../lib/format';

interface Props {
  points: PopulationPoint[];
  year: number;
  onScrub: (year: number) => void;
  label: string;
}

const M = { t: 46, r: 10, b: 34, l: 10 };

export function Timeline({ points, year, onScrub, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [touched, setTouched] = useState(false);
  const dragging = useRef(false);
  const h = w < 600 ? 170 : 230;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const y0 = points[0].year;
  const y1 = points[points.length - 1].year;
  const max = Math.max(...points.map((p) => p.high ?? p.estimate)) * 1.08;
  const x = (yr: number) => M.l + ((yr - y0) / (y1 - y0 || 1)) * (w - M.l - M.r);
  const y = (v: number) => M.t + (1 - v / max) * (h - M.t - M.b);
  const xToYear = (px: number) => Math.round(y0 + ((px - M.l) / (w - M.l - M.r)) * (y1 - y0));

  const paths = useMemo(() => {
    const ln = line<PopulationPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.estimate))
      .curve(curveMonotoneX);
    const ar = area<PopulationPoint>()
      .x((d) => x(d.year))
      .y0(h - M.b)
      .y1((d) => y(d.estimate))
      .curve(curveMonotoneX);
    const banded = points.filter((p) => p.low != null && p.high != null);
    const band =
      banded.length > 1
        ? area<PopulationPoint>()
            .x((d) => x(d.year))
            .y0((d) => y(d.low!))
            .y1((d) => y(d.high!))
            .curve(curveMonotoneX)(banded)
        : null;
    return { line: ln(points) ?? '', area: ar(points) ?? '', band };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, w, h]);

  const est = estimateAt(points, year);
  const hx = x(year);
  const hy = y(est);

  // year labels that don't collide
  const ticks: number[] = [];
  let lastX = -Infinity;
  for (const p of points) {
    const px = x(p.year);
    if (px - lastX > (w < 600 ? 34 : 42) || p === points[points.length - 1]) {
      if (p === points[points.length - 1] && px - lastX < 34) ticks.pop();
      ticks.push(p.year);
      lastX = px;
    }
  }

  const fromEvent = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    return Math.min(y1, Math.max(y0, xToYear(e.clientX - r.left)));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    let n = year;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n -= step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n += step;
    else if (e.key === 'PageDown') n -= 25;
    else if (e.key === 'PageUp') n += 25;
    else if (e.key === 'Home') n = y0;
    else if (e.key === 'End') n = y1;
    else return;
    e.preventDefault();
    setTouched(true);
    onScrub(Math.min(y1, Math.max(y0, n)));
  };

  return (
    <div className="timeline" ref={wrap}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="timeline__svg"
        onPointerDown={(e) => {
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          dragging.current = true;
          setTouched(true);
          onScrub(fromEvent(e));
        }}
        onPointerMove={(e) => dragging.current && onScrub(fromEvent(e))}
        onPointerUp={(e) => {
          dragging.current = false;
          (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => (dragging.current = false)}
      >
        <line x1={M.l} x2={w - M.r} y1={h - M.b} y2={h - M.b} className="tl-axis" />
        <text x={M.l} y={M.t - 14} className="tl-ylabel">
          {fmtCompact(max / 1.08)}
        </text>
        <line x1={M.l} x2={w - M.r} y1={y(max / 1.08)} y2={y(max / 1.08)} className="tl-grid" />
        {paths.band && <path d={paths.band} className="tl-band" />}
        <path d={paths.area} className="tl-area" />
        <path d={paths.line} className="tl-line" />
        {/* past segment emphasised up to the handle */}
        <clipPath id="tl-past">
          <rect x={0} y={0} width={hx} height={h} />
        </clipPath>
        <path d={paths.line} className="tl-line tl-line--past" clipPath="url(#tl-past)" />
        {points.map((p) => (
          <circle key={p.year} cx={x(p.year)} cy={y(p.estimate)} r={p.year <= year ? 3 : 2.2} className={p.year <= year ? 'tl-pt is-past' : 'tl-pt'} />
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={h - M.b + 20} className="tl-tick" textAnchor="middle">
            {t}
          </text>
        ))}

        <g
          className="tl-handle"
          role="slider"
          tabIndex={0}
          aria-label={`Year, ${label}`}
          aria-valuemin={y0}
          aria-valuemax={y1}
          aria-valuenow={year}
          aria-valuetext={`${year}, about ${fmt(est)}`}
          onKeyDown={onKey}
          transform={`translate(${hx},0)`}
        >
          <rect x={-22} y={0} width={44} height={h} fill="transparent" />
          <line x1={0} x2={0} y1={M.t - 6} y2={h - M.b} className="tl-handle__rule" />
          <circle cx={0} cy={hy} r={9} className="tl-handle__ring" />
          <circle cx={0} cy={hy} r={3.5} className="tl-handle__dot" />
          <text x={0} y={M.t - 12} textAnchor="middle" className="tl-handle__year">
            {year}
          </text>
          {!touched && hx > M.l + 30 && hx < w - M.r - 30 && (
            <text x={0} y={M.t - 30} textAnchor="middle" className="tl-handle__hint">
              ‹ drag ›
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
