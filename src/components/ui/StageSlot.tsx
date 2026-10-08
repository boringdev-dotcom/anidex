import { useEffect, useRef, type ReactNode } from 'react';
import { registerSlot, type SlotKind } from '../../three/slots';

interface Props {
  kind: SlotKind;
  chapter: string;
  className?: string;
  /** small overlay content (labels, hints) shown under the 3D */
  children?: ReactNode;
  /** px kept clear at the bottom for the overlay */
  reserve?: number;
}

/** A phone-only placeholder where the 3D specimen or globe is drawn. Hidden on desktop. */
export function StageSlot({ kind, chapter, className = '', children, reserve = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return registerSlot({ el: ref.current, kind, chapter, reserve });
  }, [kind, chapter, reserve]);
  return (
    <div ref={ref} className={`m-slot m-slot--${kind} ${className}`} data-chapter={chapter} aria-hidden="true">
      {children && <div className="m-slot__overlay">{children}</div>}
    </div>
  );
}

export function RotateIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M12.2 1.6v2.7H9.5" />
    </svg>
  );
}
