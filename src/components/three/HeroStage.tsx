import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import HeroScene from './HeroScene';

/* ============================================================
   HeroStage — safe delivery wrapper for the 3D hero.
   - Lazy-loaded by consumers via React.lazy(() => import(...))
   - Detects WebGL and renders a static fallback when unavailable
   - On mobile screens (< 768px), serves lightweight static fallback
     to avoid consuming excessive mobile GPU/battery resources
   - Mounts the canvas near the viewport; pauses when offscreen or tab hidden
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

/** Static, non-WebGL fallback — atmospheric gradient and technical grid */
const StaticFallback: React.FC<{ animate: boolean }> = ({ animate }) => (
  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      className={`absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${animate ? 'animate-pulse-subtle' : ''}`}
      style={{ background: 'radial-gradient(circle, rgba(101,221,181,0.18), transparent 65%)' }}
    />
    <div
      className={`absolute left-[38%] top-[42%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${animate ? 'animate-pulse-subtle' : ''}`}
      style={{ background: 'radial-gradient(circle, rgba(19,138,114,0.18), transparent 65%)' }}
    />
    <div className="absolute inset-0 grid-lines opacity-40" />
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
  const [isDocVisible, setIsDocVisible] = useState(
    () => typeof document === 'undefined' ? true : !document.hidden
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  // WebGL support + reduced-motion + mobile detection + tab visibility
  useEffect(() => {
    setWebglOk(supportsWebGL());

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => setAnimate(!mqMotion.matches);
    applyMotion();
    mqMotion.addEventListener('change', applyMotion);

    const mqMobile = window.matchMedia('(max-width: 767px)');
    const applyMobile = () => setIsMobile(mqMobile.matches);
    applyMobile();
    mqMobile.addEventListener('change', applyMobile);

    const handleVisibility = () => {
      setIsDocVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mqMotion.removeEventListener('change', applyMotion);
      mqMobile.removeEventListener('change', applyMobile);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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

  const fallback = <StaticFallback animate={animate && webglOk !== false} />;
  // Show static fallback if WebGL is unsupported OR if running on a mobile screen (<768px)
  const showFallback = webglOk === false || isMobile;

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
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 6.4], fov: 42 }}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: 'high-performance',
                }}
                frameloop={inView && isDocVisible ? (animate ? 'always' : 'demand') : 'never'}
                aria-hidden="true"
              >
                <HeroScene animate={animate} density="high" />
              </Canvas>
            </Suspense>
          )}
        </WebGLBoundary>
      )}
    </div>
  );
};

export default HeroStage;
