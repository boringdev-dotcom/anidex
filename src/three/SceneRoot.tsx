import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { StipplePoints } from './stipple/StipplePoints';
import { Globe } from './globe/Globe';
import { Plinth } from './Plinth';
import { MeasureLines } from './MeasureLines';
import { ScaleFigure } from './ScaleFigure';
import { SceneDirector } from './SceneDirector';
import { ThemeBridge } from './ThemeBridge';
import { live } from '../store/useStore';
import { attachInteraction } from './interaction';

function Rig() {
  const root = useRef<THREE.Group>(null);
  const specimen = useRef<THREE.Group>(null);
  const globe = useRef<THREE.Group>(null);
  const figure = useRef<THREE.Group>(null);
  return (
    <>
      <ThemeBridge />
      <group ref={root}>
        <Globe ref={globe} />
        <group ref={specimen} rotation={[0.08, -0.6, 0]}>
          <StipplePoints />
          <Plinth />
          <MeasureLines />
        </group>
        <ScaleFigure ref={figure} />
      </group>
      <SceneDirector specimen={specimen} globe={globe} root={root} figure={figure} />
    </>
  );
}

export default function SceneRoot() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      live.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      live.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const detach = attachInteraction();
    return () => {
      window.removeEventListener('pointermove', onMove);
      detach();
    };
  }, []);

  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={[1, window.matchMedia('(max-width: 768px)').matches ? 2 : 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 50 }}
      >
        <Rig />
      </Canvas>
    </div>
  );
}
