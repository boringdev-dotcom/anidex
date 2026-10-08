import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { palette } from './palette';
import { specimenInfo } from './stipple/StipplePoints';
import { damp } from '../lib/math';

export const plinthUniforms = { uOpacity: { value: 0 }, uInk: palette.uInk };

/** A thin elliptical ring with tick marks under the specimen, like a museum mount. */
export function Plinth() {
  const ref = useRef<THREE.LineSegments>(null);
  useFrame((_, dt) => {
    const l = ref.current;
    if (!l) return;
    l.position.y = damp(l.position.y, specimenInfo.minY - 0.03, 4, dt);
    const s = Math.max(0.32, Math.min(0.7, specimenInfo.radius * 0.62)) / 0.62;
    l.scale.setScalar(damp(l.scale.x, s, 4, dt));
  });
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const N = 160;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      pts.push(Math.cos(a0) * 0.62, 0, Math.sin(a0) * 0.62, Math.cos(a1) * 0.62, 0, Math.sin(a1) * 0.62);
    }
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const l = i % 4 === 0 ? 0.05 : 0.022;
      pts.push(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62, Math.cos(a) * (0.62 + l), 0, Math.sin(a) * (0.62 + l));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: plinthUniforms,
        vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uInk; uniform float uOpacity; void main(){ gl_FragColor = vec4(uInk, uOpacity); 
        #include <colorspace_fragment>
        }`,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  return <lineSegments ref={ref} geometry={geometry} material={material} position={[0, -0.5, 0]} />;
}
