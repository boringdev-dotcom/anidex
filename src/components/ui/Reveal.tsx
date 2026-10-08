import { createElement, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from '../../hooks/useMediaQuery';

interface Props {
  as?: string;
  children: ReactNode;
  className?: string;
  /** 'lines' masks and slides each line up, 'chars' does it per character, 'fade' lifts the block. */
  split?: 'lines' | 'chars' | 'fade';
  delay?: number;
  /** Play on mount rather than when the chapter scrolls into view. */
  immediate?: boolean;
  id?: string;
}

export function Reveal({ as: Tag = 'div', children, className, split = 'lines', delay = 0, immediate = false, id }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const trigger = (el.closest('.chapter') as HTMLElement) ?? el;
      const st = immediate ? undefined : { trigger, start: 'top 62%', toggleActions: 'play none none reverse' };

      if (split === 'fade') {
        gsap.from(el, { opacity: 0, y: 28, duration: 1.2, ease: 'expo.out', delay, scrollTrigger: st });
        return;
      }
      SplitText.create(el, {
        type: split === 'chars' ? 'lines,chars' : 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit(self) {
          return gsap.from(split === 'chars' ? self.chars : self.lines, {
            yPercent: 115,
            rotate: split === 'chars' ? 4 : 0,
            duration: split === 'chars' ? 1.3 : 1.15,
            ease: 'expo.out',
            stagger: split === 'chars' ? 0.028 : 0.09,
            delay,
            scrollTrigger: st,
          });
        },
      });
    },
    { scope: ref },
  );

  return createElement(Tag, { ref, className, id }, children);
}
