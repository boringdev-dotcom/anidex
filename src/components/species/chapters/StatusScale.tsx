import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { IUCNStatus } from '../../../data/types';
import { STATUS_ORDER, STATUS_SHORT } from '../../../data';
import { prefersReducedMotion } from '../../../hooks/useMediaQuery';

export function StatusScale({ status }: { status: IUCNStatus }) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = STATUS_ORDER.indexOf(status);
  const n = STATUS_ORDER.length;
  const pct = ((idx + 0.5) / n) * 100;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ref.current!.closest('.chapter'), start: 'top 55%', toggleActions: 'play none none reverse' },
      });
      tl.from('.scale__fill', { scaleX: 0, duration: 1.6, ease: 'expo.inOut' })
        .from('.scale__marker', { left: `${(0.5 / n) * 100}%`, duration: 1.6, ease: 'expo.inOut' }, 0)
        .from('.scale__cell', { opacity: 0, y: 10, stagger: 0.06, duration: 0.8, ease: 'expo.out' }, 0.1);
    },
    { scope: ref },
  );

  return (
    <div className="scale" ref={ref} role="img" aria-label={`IUCN Red List category: ${STATUS_SHORT[status]}, ${idx + 1} of ${n} on the scale from least concern to extinct`}>
      <div className="scale__track">
        <span className="scale__fill" style={{ width: `${pct}%` }} />
        <span className="scale__marker" style={{ left: `${pct}%` }}>
          <span className="scale__marker-dot" />
        </span>
      </div>
      <ol className="scale__cells">
        {STATUS_ORDER.map((s, i) => (
          <li key={s} className={`scale__cell${i === idx ? ' is-current' : ''}${i < idx ? ' is-past' : ''}`} style={{ ['--c' as string]: `var(--st-${s})` }}>
            <span className="scale__code num">{s}</span>
            <span className="scale__name">{STATUS_SHORT[s]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
