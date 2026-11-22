import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Float } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { heroProgress } from "../lib/heroProgress";

const METALS = {
  bronze: { color: "#b07a45", metalness: 1, roughness: 0.28 },
  black: { color: "#1b1a19", metalness: 0.9, roughness: 0.38 },
  chrome: { color: "#d9d6d0", metalness: 1, roughness: 0.12 },
};
const VENEERS = ["#b88a5a", "#6b4429", "#e9e3d9", "#2a2826", "#8ea392", "#c9a27a"];

type Kind = "handle" | "hinge" | "swatch" | "profile" | "knob";

function Handle({ metal }: { metal: keyof typeof METALS }) {
  const m = METALS[metal];
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 48]} />
        <meshStandardMaterial {...m} />
      </mesh>
      <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 24]} />
        <meshStandardMaterial {...m} />
      </mesh>
      <RoundedBox args={[1.1, 0.12, 0.12]} radius={0.05} position={[0.5, 0, 0.42]}>
        <meshStandardMaterial {...m} />
      </RoundedBox>
    </group>
  );
}

function Hinge() {
  const m = METALS.chrome;
  return (
    <group>
      <RoundedBox args={[0.32, 1, 0.03]} radius={0.012} position={[-0.18, 0, 0]}>
        <meshStandardMaterial {...m} />
      </RoundedBox>
      <RoundedBox args={[0.32, 1, 0.03]} radius={0.012} position={[0.18, 0, 0]} rotation={[0, 0.6, 0]}>
        <meshStandardMaterial {...m} />
      </RoundedBox>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 1.04, 24]} />
        <meshStandardMaterial {...METALS.bronze} />
      </mesh>
    </group>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <RoundedBox args={[0.9, 1.3, 0.06]} radius={0.03} smoothness={4}>
      <meshPhysicalMaterial color={color} roughness={0.55} clearcoat={0.6} clearcoatRoughness={0.25} />
    </RoundedBox>
  );
}

function Profile() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.08, 2.2, 0.3]} />
        <meshStandardMaterial color="#a9a8a4" metalness={1} roughness={0.35} />
      </mesh>
      <mesh position={[0.12, 0, -0.13]}>
        <boxGeometry args={[0.24, 2.2, 0.04]} />
        <meshStandardMaterial color="#a9a8a4" metalness={1} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Knob() {
  return (
    <mesh>
      <sphereGeometry args={[0.24, 48, 48]} />
      <meshStandardMaterial {...METALS.bronze} />
    </mesh>
  );
}

type Item = { kind: Kind; pos: THREE.Vector3; rot: THREE.Euler; scale: number; spin: number; color: string; metal: keyof typeof METALS };

function Piece({ item }: { item: Item }) {
  const ref = useRef<THREE.Group>(null!);
  const [hot, setHot] = useState(false);
  const speed = useRef(item.spin);
  useFrame((_, dt) => {
    const p = heroProgress.value;
    speed.current = THREE.MathUtils.lerp(speed.current, hot ? item.spin * 9 : item.spin, 0.08);
    ref.current.rotation.y += dt * speed.current;
    ref.current.rotation.x += dt * speed.current * 0.4;
    // As the door opens, objects get pushed outward and toward the camera.
    const spread = 1 + p * 1.6;
    ref.current.position.set(item.pos.x * spread, item.pos.y * spread, item.pos.z + p * 6);
    const s = item.scale * (hot ? 1.25 : 1);
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
  });
  return (
    <group
      ref={ref}
      rotation={item.rot}
      onPointerOver={(e) => { e.stopPropagation(); setHot(true); document.body.dataset.cursor = "spin"; }}
      onPointerOut={() => { setHot(false); delete document.body.dataset.cursor; }}
    >
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
        {item.kind === "handle" && <Handle metal={item.metal} />}
        {item.kind === "hinge" && <Hinge />}
        {item.kind === "swatch" && <Swatch color={item.color} />}
        {item.kind === "profile" && <Profile />}
        {item.kind === "knob" && <Knob />}
      </Float>
    </group>
  );
}

function Scene({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null!);
  const vw = useThree((s) => s.viewport.width);
  const narrow = vw < 8;
  const items = useMemo<Item[]>(() => {
    const kinds: Kind[] = ["handle", "swatch", "hinge", "swatch", "profile", "knob", "handle", "swatch"];
    const metals = Object.keys(METALS) as (keyof typeof METALS)[];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, (_, i) => {
      // Keep a clear zone in the centre where the door sits.
      const side = i % 2 === 0 ? -1 : 1;
      // On narrow screens objects sit above/below the door instead of beside it.
      const x = narrow ? (rnd() - 0.5) * vw * 1.1 : side * (2.6 + rnd() * 4.2);
      const y = narrow ? side * (2.6 + rnd() * 2.2) : (rnd() - 0.5) * 7;
      const z = -rnd() * 5;
      return {
        kind: kinds[i % kinds.length],
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI),
        scale: 0.6 + rnd() * 0.7,
        spin: (rnd() - 0.5) * 0.6,
        color: VENEERS[i % VENEERS.length],
        metal: metals[i % metals.length],
      };
    });
  }, [count, narrow]);

  useFrame((state) => {
    // Mouse parallax on the whole cloud.
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.pointer.x * 0.18, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -state.pointer.y * 0.12, 0.05);
  });

  return (
    <group ref={group}>
      {items.map((it, i) => <Piece key={i} item={it} />)}
    </group>
  );
}

export default function FloatingObjects() {
  const count = typeof window !== "undefined" && window.innerWidth < 768 ? 10 : 22;
  return (
    <Canvas className="hero-canvas" dpr={[1, 1.75]} camera={{ position: [0, 0, 9], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} color="#ffe6c7" />
      <pointLight position={[0, 0, 2]} intensity={12} color="#ffcf8a" distance={10} />
      <Scene count={count} />
      {/* Custom studio light rig — no external HDR download needed. */}
      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 4, -6]} scale={[10, 2, 1]} color="#fff1dd" />
        <Lightformer intensity={2} position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#ffd9a8" />
        <Lightformer intensity={1.2} position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#cfd8ff" />
        <Lightformer form="ring" intensity={4} position={[0, 0, 6]} scale={3} color="#ffffff" />
      </Environment>
    </Canvas>
  );
}
