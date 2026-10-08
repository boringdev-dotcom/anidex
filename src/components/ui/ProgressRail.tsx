import { useStore } from '../../store/useStore';
import { scrollToY } from '../../scroll/smoothScroll';

interface Props {
  chapters: string[];
}

export function ProgressRail({ chapters }: Props) {
  const active = useStore((s) => s.chapter);
  const jump = (i: number) => {
    const el = document.querySelectorAll<HTMLElement>('.species .chapter')[i];
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY + 2);
  };
  return (
    <nav className="rail" aria-label="Chapters">
      <ol>
        {chapters.map((name, i) => (
          <li key={name} className={i === active ? 'is-active' : i < active ? 'is-past' : ''}>
            <button onClick={() => jump(i)} aria-current={i === active ? 'step' : undefined}>
              <span className="rail__num num">{String(i + 1).padStart(2, '0')}</span>
              <span className="rail__name">{name}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="rail__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${(active + 1) / chapters.length})` }} />
      </div>
    </nav>
  );
}
