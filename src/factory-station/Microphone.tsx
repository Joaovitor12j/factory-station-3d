import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type Group, type Mesh, type MeshStandardMaterial } from "three";

const SILVER = "#e9e4da";
const SLATE = "#46506a";

/**
 * The default piece: a microphone capsule with a grille, a stand and sound
 * waves leaving both sides. `color` paints the grille bands and the waves.
 * About 1.3 units tall, base at y = 0.
 */
export function Microphone({
  color,
  animated = true,
}: {
  color: string;
  animated?: boolean;
}) {
  const light = useMemo(
    () =>
      "#" + new Color(color).lerp(new Color("#ffffff"), 0.35).getHexString(),
    [color],
  );
  const head = useRef<Group>(null);
  const waves = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (head.current && animated) {
      head.current.rotation.z = Math.sin(t * 1.3) * 0.06;
    }
    waves.current.forEach((wave, i) => {
      if (!wave) return;
      // Each wave is born next to the capsule, grows and fades; three in a row.
      const phase = animated ? (t * 0.55 + (i % 3) / 3) % 1 : (i % 3) / 3;
      wave.scale.setScalar(0.7 + phase * 1.1);
      (wave.material as MeshStandardMaterial).opacity =
        Math.sin(phase * Math.PI) * 0.9;
    });
  });

  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.08, 32]} />
        <meshStandardMaterial color={SLATE} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.55, 12]} />
        <meshStandardMaterial color={SILVER} metalness={0.3} roughness={0.35} />
      </mesh>

      <group ref={head} position={[0, 0.98, 0]}>
        {/* Yoke holding the capsule. */}
        <mesh rotation={[0, 0, Math.PI]} position={[0, -0.02, 0]} castShadow>
          <torusGeometry args={[0.3, 0.035, 10, 32, Math.PI]} />
          <meshStandardMaterial color={SLATE} roughness={0.45} />
        </mesh>

        <mesh castShadow>
          <capsuleGeometry args={[0.22, 0.28, 10, 28]} />
          <meshStandardMaterial
            color={SILVER}
            metalness={0.35}
            roughness={0.3}
          />
        </mesh>
        {[-0.2, -0.1, 0, 0.1, 0.2].map((y) => (
          <mesh
            key={y}
            position={[0, y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.225 - Math.abs(y) * 0.12, 0.018, 8, 32]} />
            <meshStandardMaterial color={y === 0 ? color : light} />
          </mesh>
        ))}
        <mesh position={[0, -0.33, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.08, 0.14, 20]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>

        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              waves.current[i] = m;
            }}
            rotation={[0, i < 3 ? 0 : Math.PI, -Math.PI * 0.275]}
          >
            <torusGeometry args={[0.45, 0.022, 6, 32, Math.PI * 0.55]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.35}
              transparent
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
