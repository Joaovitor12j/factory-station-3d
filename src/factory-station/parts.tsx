import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  SRGBColorSpace,
  type BufferAttribute,
  type Group,
  type MeshStandardMaterial,
  type Object3D,
  type PointLight,
  type Points,
} from "three";
import { Model, useModel } from "./models";

/**
 * The living parts of the workshop: the project sign, a robot arm with
 * welding sparks, a crane, a wall cog and the little robot that drives
 * around. Every one takes `animated`, so the station can respect
 * `prefers-reduced-motion`.
 */

export type SignData = {
  name: string;
  stage: string;
  stageColor: string;
  /** Colour of the band at the bottom of the sign. */
  color: string;
  /** Square image drawn on the left; without it, a monogram. */
  icon?: string;
  /** Small text next to the stage pill. */
  footnote?: string;
};

const initials = (name: string) =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

/** A sign painted on a canvas: icon (or monogram), name and stage. */
export function Sign({
  data,
  width = 3.2,
  hanging = false,
}: {
  data: SignData;
  width?: number;
  /** No legs: the panel is centred on the origin, ready for a wall. */
  hanging?: boolean;
}) {
  const material = useRef<MeshStandardMaterial>(null);
  const height = width * 0.375;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const font = getComputedStyle(document.body).fontFamily;
    let cancelled = false;

    const draw = (icon?: HTMLImageElement) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, 1024, 384);
      ctx.fillStyle = "#fffaf2";
      ctx.beginPath();
      ctx.roundRect(0, 0, 1024, 384, 44);
      ctx.fill();
      ctx.fillStyle = data.color;
      ctx.fillRect(0, 348, 1024, 36);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(44, 60, 220, 220, 44);
      ctx.clip();
      if (icon) {
        ctx.drawImage(icon, 44, 60, 220, 220);
      } else {
        ctx.fillStyle = data.color;
        ctx.fillRect(44, 60, 220, 220);
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 96px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials(data.name), 154, 174);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();

      const x = 304;
      ctx.fillStyle = "#1f2433";
      let size = 112;
      ctx.font = `700 ${size}px ${font}`;
      while (ctx.measureText(data.name).width > 1024 - x - 44 && size > 52) {
        size -= 6;
        ctx.font = `700 ${size}px ${font}`;
      }
      ctx.fillText(data.name, x, 176);

      ctx.font = `700 36px ${font}`;
      const label = data.stage.toUpperCase();
      const pill = ctx.measureText(label).width + 56;
      ctx.fillStyle = data.stageColor;
      ctx.beginPath();
      ctx.roundRect(x, 210, pill, 62, 31);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 28, 254);
      if (data.footnote) {
        ctx.fillStyle = "#59607a";
        ctx.font = `500 34px ${font}`;
        ctx.fillText(data.footnote, x + pill + 22, 254);
      }

      texture.needsUpdate = true;
      if (material.current) {
        material.current.map = texture;
        material.current.needsUpdate = true;
      }
    };

    if (data.icon) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => draw(image);
      image.onerror = () => draw();
      image.src = data.icon;
    } else {
      draw();
    }
    return () => {
      cancelled = true;
      texture.dispose();
    };
  }, [data]);

  return (
    <group>
      {!hanging &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (width / 2 - 0.25), height / 2 + 0.4, -0.08]}
            castShadow
          >
            <boxGeometry args={[0.12, height + 0.8, 0.12]} />
            <meshStandardMaterial color="#46506a" roughness={0.6} />
          </mesh>
        ))}
      <group position={[0, hanging ? 0 : height / 2 + 0.75, 0]}>
        {/* The frame sits behind the panel, never at the same depth. */}
        <mesh position={[0, 0, -0.07]} castShadow>
          <boxGeometry args={[width + 0.14, height + 0.14, 0.08]} />
          <meshStandardMaterial color="#46506a" roughness={0.6} />
        </mesh>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            ref={material}
            color="#fffaf2"
            roughness={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}

const JOINTS = [
  "element-a",
  "element-b",
  "element-d",
  "element-f",
  "claw-a",
  "claw-b",
] as const;

/** Kenney's robot arm, animated joint by joint, with optional welding sparks. */
export function RobotArm({
  animated,
  sparks = false,
  phase = 0,
}: {
  animated: boolean;
  sparks?: boolean;
  phase?: number;
}) {
  const arm = useModel("robot-arm-a");
  const joints = useRef<Partial<Record<(typeof JOINTS)[number], Object3D>>>({});
  const points = useRef<Points>(null);
  const light = useRef<PointLight>(null);
  const positions = useMemo(() => new Float32Array(24 * 3), []);

  useEffect(() => {
    for (const name of JOINTS) {
      joints.current[name] = arm.getObjectByName(name) ?? undefined;
    }
  }, [arm]);

  useFrame(({ clock }) => {
    const t = animated ? clock.elapsedTime + phase : phase;
    const cycle = (Math.sin(t * 0.9) + 1) / 2;
    const j = joints.current;
    if (j["element-a"]) j["element-a"].rotation.y = -0.4 + cycle * 1.9;
    if (j["element-b"])
      j["element-b"].rotation.x = 0.35 + Math.sin(t * 1.8) * 0.15;
    if (j["element-d"])
      j["element-d"].rotation.x = 0.75 + Math.sin(t * 1.8 + 1) * 0.2;
    if (j["element-f"]) j["element-f"].rotation.y = t * 1.2;
    const open = 0.06 + (Math.sin(t * 3.6) + 1) * 0.04;
    if (j["claw-a"]) j["claw-a"].position.x = 0.12 + open;
    if (j["claw-b"]) j["claw-b"].position.x = -0.12 - open;

    if (!sparks) return;
    const burst = animated && Math.sin(t * 2.3) > 0.55;
    if (points.current) {
      points.current.visible = burst;
      const attribute = points.current.geometry.getAttribute(
        "position",
      ) as BufferAttribute;
      for (let i = 0; i < 24; i++) {
        const f = (t * 2.5 + i / 24) % 1;
        const a = i * 2.4;
        attribute.setXYZ(
          i,
          Math.cos(a) * f * 0.7,
          f * 0.5 - f * f * 0.9,
          Math.sin(a) * f * 0.7,
        );
      }
      attribute.needsUpdate = true;
    }
    if (light.current) {
      light.current.intensity = burst ? 6 + Math.random() * 6 : 0;
    }
  });

  return (
    <group>
      <primitive object={arm} />
      {sparks && (
        <group position={[-0.9, 0.75, 1.3]}>
          <points ref={points} visible={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial color="#ffd27a" size={0.09} sizeAttenuation />
          </points>
          <pointLight ref={light} color="#ffb347" distance={4} intensity={0} />
        </group>
      )}
    </group>
  );
}

export function Crane({
  animated,
  phase = 0,
}: {
  animated: boolean;
  phase?: number;
}) {
  const crane = useModel("crane");
  const boom = useRef<Object3D | null>(null);
  useEffect(() => {
    boom.current = crane.getObjectByName("arm") ?? null;
  }, [crane]);
  useFrame(({ clock }) => {
    if (!boom.current) return;
    const t = animated ? clock.elapsedTime : 0;
    boom.current.rotation.y = Math.sin(t * 0.35 + phase) * 0.9 + 0.4;
  });
  return <primitive object={crane} />;
}

/** A cog on the wall, facing +z. */
export function Cog({
  animated,
  direction = 1,
}: {
  animated: boolean;
  direction?: number;
}) {
  const spin = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin.current && animated) spin.current.rotation.y += dt * 0.6 * direction;
  });
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <group ref={spin}>
        <Model name="cog-a" />
      </group>
    </group>
  );
}

/** The little robot that drives back and forth along x. */
export function Oopi({
  z,
  range,
  speed,
  phase,
  animated,
}: {
  z: number;
  range: [number, number];
  speed: number;
  phase: number;
  animated: boolean;
}) {
  const robot = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = robot.current;
    if (!g) return;
    const t = (animated ? clock.elapsedTime : 0) * speed + phase;
    const [a, b] = range;
    g.position.set(
      (a + b) / 2 + Math.sin(t) * ((b - a) / 2),
      animated ? Math.abs(Math.sin(t * 9)) * 0.05 : 0,
      z,
    );
    g.rotation.y = Math.cos(t) >= 0 ? Math.PI / 2 : -Math.PI / 2;
  });
  return (
    <group ref={robot}>
      {/* The model comes off-centre; the group puts it back. */}
      <Model name="oopi" position={[0.51, 0, -0.5]} scale={1.4} />
    </group>
  );
}
