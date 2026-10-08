import { MONTHS, MONTHS_SHORT, monthRanges } from '../../../lib/format';

const R = 62;
const C = 80;

function arc(i: number, r: number) {
  const gap = 0.045;
  const a0 = (i / 12) * Math.PI * 2 - Math.PI / 2 + gap;
  const a1 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2 - gap;
  return `M ${C + Math.cos(a0) * r} ${C + Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${C + Math.cos(a1) * r} ${C + Math.sin(a1) * r}`;
}

export function MonthRing({ months }: { months: number[] }) {
  const set = new Set(months);
  const now = new Date().getMonth();
  const label = monthRanges(months);
  return (
    <figure className="month-ring">
      <svg viewBox="0 0 160 160" role="img" aria-label={`Best months to visit: ${months.map((m) => MONTHS[m - 1]).join(', ')}`}>
        {MONTHS_SHORT.map((m, i) => {
          const on = set.has(i + 1);
          const a = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
          return (
            <g key={m}>
              <path d={arc(i, R)} className={on ? 'mr-arc is-on' : 'mr-arc'} />
              <text x={C + Math.cos(a) * (R + 12)} y={C + Math.sin(a) * (R + 12) + 3} textAnchor="middle" className={i === now ? 'mr-month is-now' : 'mr-month'}>
                {m[0]}
              </text>
            </g>
          );
        })}
        {(() => {
          const a = ((now + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
          return <circle cx={C + Math.cos(a) * (R - 10)} cy={C + Math.sin(a) * (R - 10)} r={2} className="mr-now" />;
        })()}
        <text x={C} y={C - 2} textAnchor="middle" className="mr-center">
          {set.size}
        </text>
        <text x={C} y={C + 13} textAnchor="middle" className="mr-center-sub">
          GOOD MONTHS
        </text>
      </svg>
      <figcaption className="label">
        Best · <span className="label--ink">{label}</span>
        <br />
        <span className="muted">Dot marks this month</span>
      </figcaption>
    </figure>
  );
}
