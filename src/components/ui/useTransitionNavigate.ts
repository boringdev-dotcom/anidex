import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { useStore } from '../../store/useStore';
import { resetScroll, stopScroll } from '../../scroll/smoothScroll';
import { prefersReducedMotion } from '../../hooks/useMediaQuery';

/**
 * Page transitions: fade the current page out while the point cloud morphs to the next shape,
 * then swap routes. The canvas never unmounts, so the morph carries across the navigation.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to: string, shape: string) => {
      const st = useStore.getState();
      if (st.transitioning) return;
      useStore.setState({ transitioning: true, shape, previewShape: null });
      stopScroll(true);
      const page = document.querySelector('[data-page]');
      gsap.to(page, {
        opacity: 0,
        y: -20,
        duration: prefersReducedMotion() ? 0 : 0.5,
        ease: 'power2.in',
        onComplete: () => {
          resetScroll();
          navigate(to);
          stopScroll(false);
          requestAnimationFrame(() => useStore.setState({ transitioning: false }));
        },
      });
    },
    [navigate],
  );
}
