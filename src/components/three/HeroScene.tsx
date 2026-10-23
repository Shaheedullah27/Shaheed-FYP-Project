import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';

/* ============================================================
   Holographic Resume Intelligence Instrument
   Architectural 3D Analysis Engine:
   - Left: Floating Holographic Resume Panel
   - Right: Floating Job Description Specification Panel
   - Center: Rotating Wireframe Analysis Core
   - Intermediary: Glowing Skill Nodes & Connecting Flow Lines
   - Orbital Rings with Satellites & Atmospheric Particle Field
   ============================================================ */

const MINT = '#65DDB5';
const CYAN = '#4FC9A4';
const VIOLET = '#D8B76A';
const DARK_PANEL = '#142F2A';
const SLATE_BORDER = '#1C443C';

interface SceneProps {
  animate: boolean;
  density: 'high' | 'low';
}

/** Floating Document Panel (Resume on left, Job Description on right) */
const DocumentPanel: React.FC<{
  type: 'resume' | 'job';
  innerRef: React.Ref<THREE.Group>;
}> = ({ type, innerRef }) => {
  const isResume = type === 'resume';
  const accentColor = isResume ? MINT : CYAN;

  const rows = useMemo(() => {
    return isResume
      ? [
          { w: 0.92, y: 0.58 },
          { w: 0.72, y: 0.38 },
          { w: 0.84, y: 0.2 },
          { w: 0.65, y: 0.02 },
          { w: 0.78, y: -0.16 },
          { w: 0.52, y: -0.34 },
          { w: 0.7, y: -0.52 },
        ]
      : [
          { w: 0.88, y: 0.58 },
          { w: 0.68, y: 0.4 },
          { w: 0.82, y: 0.22 },
          { w: 0.74, y: 0.04 },
          { w: 0.58, y: -0.14 },
          { w: 0.85, y: -0.32 },
          { w: 0.64, y: -0.5 },
        ];
  }, [isResume]);

  return (
    <group ref={innerRef}>
      {/* Background card with glass-like transparency */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.35, 1.85, 0.025]} />
        <meshStandardMaterial
          color={DARK_PANEL}
          emissive={accentColor}
          emissiveIntensity={0.06}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Hairline glowing outer border */}
      <lineSegments position={[0, 0, 0.016]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.35, 1.85, 0.025)]} />
        <lineBasicMaterial color={accentColor} transparent opacity={0.5} />
      </lineSegments>

      {/* Header identity bar */}
      <group position={[0, 0, 0.022]}>
        <mesh position={[-0.15, 0.74, 0]}>
          <boxGeometry args={[0.9, 0.08, 0.005]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[0.42, 0.74, 0]}>
          <boxGeometry args={[0.2, 0.08, 0.005]} />
          <meshStandardMaterial color={VIOLET} emissive={VIOLET} emissiveIntensity={0.8} />
        </mesh>

        {/* Text line representations */}
        {rows.map((r, i) => (
          <mesh key={i} position={[-0.6 + r.w / 2, r.y, 0]}>
            <boxGeometry args={[r.w, 0.038, 0.004]} />
            <meshStandardMaterial
              color="#F1EBDD"
              emissive={i % 2 === 0 ? accentColor : '#A3B5AB'}
              emissiveIntensity={i % 2 === 0 ? 0.6 : 0.2}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}

        {/* Skill tag indicators at the bottom */}
        {[0, 1, 2].map((i) => (
          <mesh key={`tag-${i}`} position={[-0.38 + i * 0.38, -0.72, 0]}>
            <boxGeometry args={[0.3, 0.09, 0.004]} />
            <meshStandardMaterial
              color={SLATE_BORDER}
              emissive={i === 1 ? MINT : CYAN}
              emissiveIntensity={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Central Rotating Wireframe Analysis Core */
const AnalysisCore: React.FC<{ innerRef: React.Ref<THREE.Group> }> = ({ innerRef }) => {
  return (
    <group ref={innerRef}>
      {/* Inner solid faceted core */}
      <mesh>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial
          color="#142F2A"
          emissive={MINT}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Primary wireframe outer cage */}
      <mesh scale={1.42}>
        <icosahedronGeometry args={[0.38, 1]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.5} />
      </mesh>

      {/* Secondary octagonal gyro ring */}
      <mesh scale={1.85} rotation={[0.4, 0.5, 0]}>
        <octahedronGeometry args={[0.38, 0]} />
        <meshBasicMaterial color={VIOLET} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Atmospheric core glow */}
      <mesh scale={2.4}>
        <sphereGeometry args={[0.38, 20, 20]} />
        <meshBasicMaterial
          color={MINT}
          transparent
          opacity={0.045}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle particle bursts from the core */}
      <Sparkles count={24} scale={2.2} size={2.2} speed={0.3} opacity={0.7} color={MINT} />
    </group>
  );
};

/** Floating Glowing Skill Nodes Situated Between Panels & Core */
const SkillNodes: React.FC<{ animate: boolean }> = ({ animate }) => {
  const nodesRef = useRef<THREE.Group>(null);

  const nodePositions: Array<{ pos: [number, number, number]; color: string; size: number }> = [
    { pos: [-0.95, 0.55, 0.2], color: MINT, size: 0.06 },
    { pos: [-0.85, -0.45, -0.1], color: CYAN, size: 0.05 },
    { pos: [0.95, 0.48, -0.15], color: CYAN, size: 0.055 },
    { pos: [0.85, -0.52, 0.2], color: MINT, size: 0.06 },
    { pos: [0, 0.95, 0.1], color: VIOLET, size: 0.05 },
    { pos: [0, -0.92, -0.1], color: MINT, size: 0.05 },
  ];

  useFrame((state) => {
    if (!animate || !nodesRef.current) return;
    const t = state.clock.elapsedTime;
    nodesRef.current.children.forEach((child, i) => {
      child.position.y += Math.sin(t * 1.2 + i) * 0.001;
    });
  });

  return (
    <group ref={nodesRef}>
      {nodePositions.map((n, i) => (
        <group key={i} position={n.pos}>
          {/* Node core */}
          <mesh>
            <sphereGeometry args={[n.size, 16, 16]} />
            <meshStandardMaterial
              color="#F1EBDD"
              emissive={n.color}
              emissiveIntensity={2.5}
            />
          </mesh>
          {/* Subtle halo ring */}
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[n.size * 1.7, 0.005, 8, 32]} />
            <meshBasicMaterial color={n.color} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Orbital Torus Rings around the Central Engine */
const OrbitRings: React.FC<{ innerRef: React.Ref<THREE.Group> }> = ({ innerRef }) => {
  const satellites = useRef<Array<THREE.Mesh | null>>([null, null, null]);
  const angles = useRef([0, 2.2, 4.4]);
  const radii = [1.2, 1.55, 1.9];

  const ringConfigs = [
    { rot: [1.3, 0.2, 0.4] as [number, number, number], color: MINT, opacity: 0.45 },
    { rot: [1.1, -0.6, -0.3] as [number, number, number], color: CYAN, opacity: 0.38 },
    { rot: [1.5, 0.8, 0.1] as [number, number, number], color: VIOLET, opacity: 0.28 },
  ];

  useFrame((_, delta) => {
    for (let i = 0; i < 3; i++) {
      angles.current[i] += delta * (0.32 + i * 0.14);
      const sat = satellites.current[i];
      if (sat) {
        const a = angles.current[i];
        const r = radii[i];
        sat.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      }
    }
  });

  return (
    <group ref={innerRef}>
      {ringConfigs.map((cfg, i) => (
        <group key={i} rotation={cfg.rot}>
          <mesh>
            <torusGeometry args={[radii[i], 0.006, 6, 120]} />
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
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color={cfg.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Connecting Flow Paths with Travelling Data Packets */
const ConnectingPaths: React.FC<{ animate: boolean }> = ({ animate }) => {
  const pulses = useRef<Array<THREE.Mesh | null>>([null, null, null, null]);

  const { curves, lines } = useMemo(() => {
    // Resume to Core (Top & Bottom)
    const c1 = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.4, 0.4, 0),
      new THREE.Vector3(-0.7, 0.6, 0.2),
      new THREE.Vector3(0, 0.1, 0)
    );
    const c2 = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.4, -0.4, 0),
      new THREE.Vector3(-0.7, -0.5, -0.2),
      new THREE.Vector3(0, -0.1, 0)
    );
    // Core to Job Description (Top & Bottom)
    const c3 = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0.7, 0.6, 0.2),
      new THREE.Vector3(1.4, 0.4, 0)
    );
    const c4 = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, -0.1, 0),
      new THREE.Vector3(0.7, -0.5, -0.2),
      new THREE.Vector3(1.4, -0.4, 0)
    );

    const mat = new THREE.LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const curveList = [c1, c2, c3, c4];
    const lineObjs = curveList.map(
      (c) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)), mat)
    );

    return { curves: curveList, lines: lineObjs };
  }, []);

  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    curves.forEach((c, i) => {
      const mesh = pulses.current[i];
      if (!mesh) return;
      const progress = (t * 0.35 + i * 0.25) % 1;
      mesh.position.copy(c.getPoint(progress));
    });
  });

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`pulse-${i}`}
          ref={(el) => {
            pulses.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.038, 10, 10]} />
          <meshBasicMaterial color={i % 2 === 0 ? MINT : CYAN} />
        </mesh>
      ))}
    </group>
  );
};

/** Deep Atmospheric Particle Field */
const ParticleField: React.FC<{ count: number; animate: boolean }> = ({ count, animate }) => {
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const mint = new THREE.Color(MINT);
    const cyan = new THREE.Color(CYAN);
    const violet = new THREE.Color(VIOLET);

    for (let i = 0; i < count; i++) {
      const r = 2.2 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.75;

      const rand = Math.random();
      const col = rand > 0.6 ? mint : rand > 0.3 ? cyan : violet;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, delta) => {
    if (animate && groupRef.current) groupRef.current.rotation.y += delta * 0.015;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
    </group>
  );
};

export const HeroScene: React.FC<SceneProps> = ({ animate, density }) => {
  const { camera } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const resumeRef = useRef<THREE.Group>(null);
  const jdRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const entrance = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  const particleCount = density === 'high' ? 420 : 180;
  const frameScale = density === 'high' ? 1 : 0.8;

  // Window pointer listener for parallax without blocking DOM interactions
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

    entrance.current = animate ? Math.min(1, entrance.current + dt / 1.1) : 1;
    const eased = 1 - Math.pow(1 - entrance.current, 3);

    if (rootRef.current) {
      rootRef.current.scale.setScalar((0.65 + 0.35 * eased) * frameScale);
      rootRef.current.position.y = -0.4 * (1 - eased);

      const targetX = animate ? pointer.current.y * 0.08 : 0;
      const targetY = animate ? pointer.current.x * 0.18 : 0;
      const k = Math.min(1, dt * 2.2);
      rootRef.current.rotation.x += (targetX - rootRef.current.rotation.x) * k;
      rootRef.current.rotation.y += (targetY - rootRef.current.rotation.y) * k;
    }

    if (!animate) return;
    const t = state.clock.elapsedTime;

    // Gentle floating oscillations for panels
    if (resumeRef.current) {
      resumeRef.current.rotation.y = -0.22 + Math.sin(t * 0.32) * 0.15;
      resumeRef.current.rotation.x = Math.sin(t * 0.25) * 0.04;
      resumeRef.current.position.y = Math.sin(t * 0.55) * 0.06;
    }
    if (jdRef.current) {
      jdRef.current.rotation.y = 0.22 - Math.sin(t * 0.32) * 0.15;
      jdRef.current.rotation.x = Math.cos(t * 0.25) * 0.04;
      jdRef.current.position.y = Math.cos(t * 0.55) * 0.06;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += dt * 0.28;
      coreRef.current.rotation.x += dt * 0.12;
      coreRef.current.position.y = Math.sin(t * 0.7) * 0.04;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.y += dt * 0.06;
    }

    camera.position.x += (pointer.current.x * 0.15 - camera.position.x) * Math.min(1, dt * 1.5);
    camera.position.y += (-pointer.current.y * 0.1 - camera.position.y) * Math.min(1, dt * 1.5);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={rootRef}>
      {/* Editorial lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={60} color={MINT} decay={2} />
      <pointLight position={[-3, -2, 3]} intensity={50} color={CYAN} decay={2} />
      <pointLight position={[0, 4, -2]} intensity={35} color={VIOLET} decay={2} />
      <directionalLight position={[0, 5, 4]} intensity={0.4} color="#F1EBDD" />

      {/* Left: Floating Resume Panel */}
      <group position={[-1.85, 0, 0]}>
        <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.4} enabled={animate}>
          <DocumentPanel type="resume" innerRef={resumeRef} />
        </Float>
      </group>

      {/* Right: Floating Job Description Panel */}
      <group position={[1.85, 0, 0]}>
        <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.4} enabled={animate}>
          <DocumentPanel type="job" innerRef={jdRef} />
        </Float>
      </group>

      {/* Center: Analysis Core */}
      <group position={[0, 0, 0]}>
        <AnalysisCore innerRef={coreRef} />
      </group>

      {/* Floating Skill Nodes & Orbital Rings */}
      <SkillNodes animate={animate} />
      <OrbitRings innerRef={ringsRef} />

      {/* Spline Connecting Paths */}
      <ConnectingPaths animate={animate} />

      {/* Ambient Particle Field */}
      <ParticleField count={particleCount} animate={animate} />
    </group>
  );
};

export default HeroScene;
