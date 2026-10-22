import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import HeroScene from './HeroScene';

/* ============================================================
   HeroStage — safe delivery wrapper for the 3D hero.
   - Lazy-loaded by consumers via React.lazy(() => import(...))
   - Detects WebGL and renders a static fallback when unavailable
   - Mounts the canvas near the viewport; pauses when offscreen
   - Honors prefers-reduced-motion (renders one static frame)
   - Canvas is pointer-events:none — never blocks UI
   ============================================================ */

const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
};

/** Static, non-WebGL fallback — atmospheric gradient, no fake-3D claims. */
const StaticFallback: React.FC<{ animate: boolean }> = ({ animate }) => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      className={`absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${animate ? 'animate-pulse-glow' : ''}`}
      style={{ background: 'radial-gradient(circle, rgba(139,92,255,0.5), transparent 65%)' }}
    />
    <div
      className={`absolute left-[38%] top-[42%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${animate ? 'animate-pulse-glow' : ''}`}
      style={{ background: 'radial-gradient(circle, rgba(53,231,255,0.45), transparent 65%)' }}
    />
    <div className="absolute inset-0 grid-lines opacity-60" />
  </div>
);

interface BoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}
/** Catches WebGL context / renderer initialization failures at runtime. */
class WebGLBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('3D hero disabled — WebGL error:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const HeroStage: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [nearView, setNearView] = useState(false);
  const [inView, setInView] = useState(false);
  const [animate, setAnimate] = useState(true);

  // WebGL support + reduced-motion preference
  useEffect(() => {
    setWebglOk(supportsWebGL());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Mount near the viewport, pause when it leaves
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNearView(true);
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setNearView(true);
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin: '240px 0px', threshold: 0.02 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Small screens get a lighter frame budget
  const density: 'high' | 'low' = useMemo(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'low' : 'high'),
    []
  );

  const fallback = <StaticFallback animate={animate && webglOk !== false} />;
  const showFallback = webglOk === false;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      role={showFallback ? 'img' : undefined}
      aria-label={
        showFallback
          ? 'Abstract illustration of a resume document connected to an AI analysis core'
          : undefined
      }
    >
      {showFallback ? (
        fallback
      ) : (
        <WebGLBoundary fallback={fallback}>
          {nearView && (
            <Suspense fallback={null}>
              <Canvas
                className="!absolute inset-0 pointer-events-none"
                style={{ pointerEvents: 'none' }}
                dpr={density === 'high' ? [1, 1.75] : [1, 1.25]}
                camera={{ position: [0, 0, 6.4], fov: 42 }}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: 'high-performance',
                }}
                frameloop={inView ? (animate ? 'always' : 'demand') : 'never'}
                aria-hidden="true"
              >
                <HeroScene animate={animate} density={density} />
              </Canvas>
            </Suspense>
          )}
        </WebGLBoundary>
      )}
    </div>
  );
};

export default HeroStage;
