import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';

/* ============================================================
   Holographic Resume Intelligence Engine
   A fully procedural scene — no external models or textures.
   ============================================================ */

const CYAN = '#35E7FF';
const VIOLET = '#8B5CFF';

/** Shared once — the resume sheet is tiny geometry, one instance only. */
const SHEET_GEOMETRY = new THREE.BoxGeometry(1.5, 2.0, 0.02);
const SHEET_EDGES = new THREE.EdgesGeometry(SHEET_GEOMETRY);

interface SceneProps {
  /** false = reduced-motion: single static frame, no loops. */
  animate: boolean;
  /** 'low' = mobile / small screens: fewer particles, tighter framing. */
  density: 'high' | 'low';
}

/** Floating holographic resume built from layered geometry. */
const ResumeDocument: React.FC<{ innerRef: React.Ref<THREE.Group> }> = ({ innerRef }) => {
  const rows = useMemo(
    () => [
      { w: 0.95, y: 0.62 },
      { w: 0.7, y: 0.34 },
      { w: 0.86, y: 0.18 },
      { w: 0.6, y: -0.06 },
      { w: 0.8, y: -0.22 },
      { w: 0.5, y: -0.46 },
      { w: 0.72, y: -0.62 },
    ],
    []
  );

  return (
    <group ref={innerRef}>
      {/* Layered sheets */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0, -0.055 * i]}>
          <boxGeometry args={[1.5, 2.0, 0.02]} />
          <meshStandardMaterial
            color="#0D1526"
            emissive={CYAN}
            emissiveIntensity={0.045 + i * 0.015}
            transparent
            opacity={0.9 - i * 0.22}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Luminous sheet edges */}
      {[0, 1].map((i) => (
        <lineSegments key={`e${i}`} position={[0, 0, 0.012 - 0.055 * i]}>
          <primitive object={SHEET_EDGES} attach="geometry" />
          <lineBasicMaterial color={CYAN} transparent opacity={i === 0 ? 0.65 : 0.25} />
        </lineSegments>
      ))}

      {/* Holographic content rows */}
      <group position={[0, 0, 0.026]}>
        {/* Header block */}
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[1.1, 0.1, 0.005]} />
          <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.6} />
        </mesh>
        {rows.map((r, i) => (
          <mesh key={i} position={[-0.75 + r.w / 2, r.y, 0]}>
            <boxGeometry args={[r.w, 0.045, 0.004]} />
            <meshStandardMaterial
              color="#BFEFFF"
              emissive={i % 3 === 2 ? VIOLET : CYAN}
              emissiveIntensity={0.9}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
        {/* Skill chips row */}
        {[0, 1, 2].map((i) => (
          <mesh key={`c${i}`} position={[-0.5 + i * 0.5, -0.86, 0]}>
            <boxGeometry args={[0.34, 0.12, 0.004]} />
            <meshStandardMaterial
              color="#13233D"
              emissive={VIOLET}
              emissiveIntensity={0.7}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Central luminous geometric AI analysis core. */
const AnalysisCore: React.FC<{ innerRef: React.Ref<THREE.Group> }> = ({ innerRef }) => (
  <group ref={innerRef}>
    <mesh>
      <icosahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial
        color="#241A4E"
        emissive={VIOLET}
        emissiveIntensity={1.7}
        roughness={0.25}
        metalness={0.35}
      />
    </mesh>
    <mesh scale={1.45}>
      <icosahedronGeometry args={[0.42, 1]} />
      <meshBasicMaterial color={VIOLET} wireframe transparent opacity={0.4} />
    </mesh>
    {/* Soft additive halo (no textures) */}
    <mesh scale={2.6}>
      <sphereGeometry args={[0.42, 24, 24]} />
      <meshBasicMaterial
        color={VIOLET}
        transparent
        opacity={0.05}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
    <Sparkles count={26} scale={2.4} size={2.4} speed={0.35} opacity={0.7} color={CYAN} />
  </group>
);

/** Orbital paths with small travelling satellites (information flow). */
const OrbitRings: React.FC<{ innerRef: React.Ref<THREE.Group> }> = ({ innerRef }) => {
  const satellites = useRef<Array<THREE.Mesh | null>>([null, null, null]);
  const angles = useRef([0, 2.1, 4.2]);
  const radii = [1.35, 1.7, 1.05];
  const configs = [
    { rot: [1.25, 0.15, 0.3] as [number, number, number], color: CYAN, opacity: 0.5 },
    { rot: [1.05, -0.5, -0.4] as [number, number, number], color: VIOLET, opacity: 0.42 },
    { rot: [1.5, 0.9, 0.1] as [number, number, number], color: CYAN, opacity: 0.3 },
  ];

  useFrame((_, delta) => {
    for (let i = 0; i < 3; i++) {
      angles.current[i] += delta * (0.35 + i * 0.16);
      const sat = satellites.current[i];
      if (sat) {
        const a = angles.current[i];
        const r = radii[i];
        // Orbit inside the ring's local XY plane
        sat.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      }
    }
  });

  return (
    <group ref={innerRef}>
      {configs.map((cfg, i) => (
        <group key={i} rotation={cfg.rot}>
          <mesh>
            <torusGeometry args={[radii[i], 0.007, 6, 128]} />
            <meshBasicMaterial
              color={cfg.color}
              transparent
              opacity={cfg.opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh
            ref={(el) => {
              satellites.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshBasicMaterial color={cfg.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Particle field representing information flow around the engine. */
const ParticleField: React.FC<{ count: number; animate: boolean }> = ({ count, animate }) => {
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color(CYAN);
    const violet = new THREE.Color(VIOLET);
    for (let i = 0; i < count; i++) {
      // Flattened shell distribution
      const r = 2.4 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.7;
      const c = Math.random() > 0.5 ? cyan : violet;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  // Dispose GPU resources when the scene unmounts
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, delta) => {
    if (animate && groupRef.current) groupRef.current.rotation.y += delta * 0.02;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
    </group>
  );
};

/** Energy lines + travelling pulses between the document and the core. */
const EnergyLink: React.FC<{ animate: boolean }> = ({ animate }) => {
  const pulses = useRef<Array<THREE.Mesh | null>>([null, null]);

  const { curves, lines, material } = useMemo(() => {
    const make = (yOff: number) =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.7, yOff, 0),
        new THREE.Vector3(0, yOff + 0.55, 0.35),
        new THREE.Vector3(0.85, yOff * 0.4, 0)
      );
    const c1 = make(0.45);
    const c2 = make(-0.5);
    const mat = new THREE.LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineObjs = [c1, c2].map(
      (c) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(48)), mat)
    );
    return { curves: [c1, c2], lines: lineObjs, material: mat };
  }, []);

  useEffect(
    () => () => {
      lines.forEach((l) => l.geometry.dispose());
      material.dispose();
    },
    [lines, material]
  );

  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    curves.forEach((c, i) => {
      const mesh = pulses.current[i];
      if (!mesh) return;
      const p = ((t * 0.32 + i * 0.5) % 1);
      const pos = c.getPoint(p);
      mesh.position.copy(pos);
    });
  });

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      {[0, 1].map((i) => (
        <mesh
          key={`p${i}`}
          ref={(el) => {
            pulses.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshBasicMaterial color={i === 0 ? CYAN : '#B79CFF'} />
        </mesh>
      ))}
    </group>
  );
};

export const HeroScene: React.FC<SceneProps> = ({ animate, density }) => {
  const { camera } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const docRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const entrance = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  const particleCount = density === 'high' ? 460 : 200;
  const frameScale = density === 'high' ? 1 : 0.82;

  // Pointer parallax — listens on the window so the canvas itself can stay
  // pointer-events:none and never blocks buttons, forms, or scrolling.
  useEffect(() => {
    if (!animate) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [animate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    // Entrance animation (instant when motion is reduced)
    entrance.current = animate
      ? Math.min(1, entrance.current + dt / 1.2)
      : 1;
    const eased = 1 - Math.pow(1 - entrance.current, 3);

    if (rootRef.current) {
      rootRef.current.scale.setScalar((0.6 + 0.4 * eased) * frameScale);
      rootRef.current.position.y = -0.6 * (1 - eased);

      const targetX = animate ? pointer.current.y * 0.1 : 0;
      const targetY = animate ? pointer.current.x * 0.22 : 0;
      const k = Math.min(1, dt * 2.5);
      rootRef.current.rotation.x += (targetX - rootRef.current.rotation.x) * k;
      rootRef.current.rotation.y += (targetY - rootRef.current.rotation.y) * k;
    }

    if (!animate) return;
    const t = state.clock.elapsedTime;

    if (docRef.current) {
      docRef.current.rotation.y = -0.28 + Math.sin(t * 0.28) * 0.3;
      docRef.current.rotation.x = Math.sin(t * 0.22) * 0.06;
      docRef.current.position.y = Math.sin(t * 0.6) * 0.07;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += dt * 0.3;
      coreRef.current.rotation.x += dt * 0.1;
      coreRef.current.position.y = Math.cos(t * 0.7) * 0.05;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.y += dt * 0.05;
    }

    // Gentle camera drift for depth
    camera.position.x += (pointer.current.x * 0.18 - camera.position.x) * Math.min(1, dt * 1.6);
    camera.position.y += (-pointer.current.y * 0.12 - camera.position.y) * Math.min(1, dt * 1.6);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={rootRef}>
      {/* Cinematic lighting */}
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 3, 4]} intensity={70} color={CYAN} decay={2} />
      <pointLight position={[-4, -2, 3]} intensity={55} color={VIOLET} decay={2} />
      <pointLight position={[0, 4, -3]} intensity={30} color="#7DD3FC" decay={2} />
      <directionalLight position={[0, 6, 5]} intensity={0.5} color="#DCE7FF" />

      <group position={[-1.25, 0, 0]}>
        <Float speed={1.6} rotationIntensity={0.12} floatIntensity={0.5} enabled={animate}>
          <ResumeDocument innerRef={docRef} />
        </Float>
      </group>

      <group position={[1.3, 0, 0]}>
        <AnalysisCore innerRef={coreRef} />
      </group>

      <OrbitRings innerRef={ringsRef} />
      <EnergyLink animate={animate} />
      <ParticleField count={particleCount} animate={animate} />
    </group>
  );
};

export default HeroScene;
