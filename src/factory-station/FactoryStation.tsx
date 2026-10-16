import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Vector3, type Group } from "three";
import { Microphone } from "./Microphone";
import { Model, ModelsPathContext, preloadModels } from "./models";
import { Cog, Crane, Oopi, RobotArm, Sign, type SignData } from "./parts";

export type StationProject = {
  /** Shown big on the sign. */
  name: string;
  /** Shown in the pill under the name, e.g. "Building". */
  stage: string;
  /** Main colour: the pedestal, the sign band and the default piece. */
  color: string;
  /** Square image for the sign (png, jpg, webp or svg with width/height). */
  icon?: string;
  /** Small text next to the stage pill, e.g. "Open source". */
  footnote?: string;
};

export type FactoryStationProps = {
  project: StationProject;
  /** Colour of the stage: the floor stripe under the belt and the pill. */
  stageColor?: string;
  /**
   * What spins on top of the machine. Defaults to a microphone in the
   * project colour. Anything about 1.3 units tall with its base at y = 0
   * fits.
   */
  piece?: ReactNode;
  /** Defaults to on, unless the visitor prefers reduced motion. */
  animated?: boolean;
  /** Slow orbit when nobody is dragging. Defaults to `animated`. */
  autoRotate?: boolean;
  /** URL of the folder with the `.glb` models. Defaults to "/models/". */
  modelsPath?: string;
  className?: string;
  style?: CSSProperties;
};

function subscribeMotion(notify: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * A complete factory station as a small diorama: the project's piece
 * spinning on a machine, a sign with its icon, a robot arm welding next to
 * a conveyor belt, and a cut-away workshop around it (walls, pipes, cogs,
 * a crane and a little robot).
 */
export function FactoryStation({
  project,
  stageColor = "#f0a23a",
  piece,
  animated,
  autoRotate,
  modelsPath = "/models/",
  className,
  style,
}: FactoryStationProps) {
  const reduced = usePrefersReducedMotion();
  const alive = animated ?? !reduced;
  useMemo(() => preloadModels(modelsPath), [modelsPath]);

  return (
    <ModelsPathContext.Provider value={modelsPath}>
      <Canvas
        className={className}
        style={style}
        shadows
        flat
        dpr={[1, 2]}
        frameloop={alive ? "always" : "demand"}
        camera={{ fov: 30, position: [12, 9.5, 14], near: 0.5, far: 200 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.1} />
        <hemisphereLight args={["#ffffff", "#d6c3a0", 1]} />
        <directionalLight
          position={[8, 14, 6]}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
          shadow-bias={-0.0002}
          shadow-normalBias={0.04}
        />
        <Suspense fallback={null}>
          <Workshop stageColor={stageColor} animated={alive} />
          <Belt animated={alive} />
          <Station
            project={project}
            stageColor={stageColor}
            piece={piece}
            animated={alive}
          />
          <Oopi z={3.7} range={[-3, 3]} speed={0.3} phase={0} animated={alive} />
        </Suspense>
        <FitCamera />
        <OrbitControls
          target={[0, 1.4, 0]}
          autoRotate={autoRotate ?? alive}
          autoRotateSpeed={0.35}
          enablePan={false}
          minDistance={9}
          maxDistance={48}
          maxPolarAngle={1.35}
        />
      </Canvas>
    </ModelsPathContext.Provider>
  );
}

const CAMERA_START = new Vector3(12, 8.1, 14);
const TARGET = new Vector3(0, 1.4, 0);

/** On narrow screens, step back so the whole diorama fits the width. */
function FitCamera() {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    const distance = Math.max(1, 1.05 / aspect);
    camera.position.copy(TARGET).addScaledVector(CAMERA_START, distance);
  }, [aspect, camera]);
  return null;
}

const WALL_X = [-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5];

function Workshop({
  stageColor,
  animated,
}: {
  stageColor: string;
  animated: boolean;
}) {
  return (
    <group>
      {/* Base slab, just below the floor tiles so they never z-fight. */}
      <mesh position={[0, -0.33, 0]} receiveShadow>
        <boxGeometry args={[10.6, 0.6, 10.6]} />
        <meshStandardMaterial color="#e9dcc4" roughness={0.9} />
      </mesh>
      {[-4, -2, 0, 2, 4].flatMap((x) =>
        [-4, -2, 0, 2, 4].map((z) => (
          <Model key={`${x}:${z}`} name="floor-large" position={[x, 0, z]} />
        )),
      )}

      <mesh
        position={[0, 0.012, 2.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 2.6]} />
        <meshStandardMaterial color={stageColor} transparent opacity={0.28} />
      </mesh>
      <Model name="indicator-special-lines" position={[3.6, 0.01, -1.6]} />
      <Model name="indicator-special-lines" position={[-3.6, 0.01, 3.9]} />

      {/* Back and side walls, cut away like a dollhouse. */}
      {WALL_X.map((x, i) => (
        <Model
          key={x}
          name={i % 3 === 1 ? "structure-window" : "structure-wall"}
          position={[x, 0, -5]}
        />
      ))}
      {WALL_X.slice(1).map((z, i) => (
        <Model
          key={z}
          name={i % 3 === 1 ? "structure-window" : "structure-wall"}
          position={[-5, 0, -z]}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}
      <Model name="structure-corner-outer" position={[-5, 0, -5]} />

      {[-3, -1, 1, 3].map((x) => (
        <Model
          key={x}
          name="pipe-large-long"
          position={[x, 3.0, -4.1]}
          scale={0.55}
        />
      ))}
      <group position={[-2.9, 1.7, -3.45]} scale={1.1}>
        <Cog animated={animated} direction={1} />
      </group>
      <group position={[-2.05, 1.25, -3.45]} scale={0.75}>
        <Cog animated={animated} direction={-1.5} />
      </group>

      <group position={[-2.3, 0, -2.6]} scale={0.9}>
        <Crane animated={animated} />
      </group>
      <Model name="box-large" position={[-3.7, 0, -2.4]} />
      <Model name="box-wide" position={[-3.6, 0, -1.3]} rotation={[0, 0.3, 0]} />
      <Model
        name="box-small"
        position={[-3.7, 0.86, -2.4]}
        rotation={[0, 0.6, 0]}
      />
      <Model name="cone" position={[2.6, 0, 3.6]} />
      <Model name="cone" position={[3.3, 0, 3.4]} />
      <Model name="hopper-round" position={[3.6, 0, -3.3]} />
      <Model name="lever-double" position={[1.2, 0, -2.4]} />
      <Model name="structure-yellow-tall" position={[-4.2, 0, 1.0]} />
      <Model name="structure-yellow-tall" position={[-4.2, 0, 3.2]} />
    </group>
  );
}

const BOXES = 7;

function Belt({ animated }: { animated: boolean }) {
  const boxes = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const time = animated ? clock.elapsedTime : 0;
    boxes.current.forEach((box, i) => {
      if (!box) return;
      const t = (time * 0.09 + i / BOXES) % 1;
      box.position.set(-5 + t * 10, 0.4, 2.1);
      // Fade in and out at the ends of the belt instead of popping.
      box.scale.setScalar(Math.min(1, Math.min(t, 1 - t) * 20) * 0.8);
    });
  });

  return (
    <group>
      {[-4, -2, 0, 2, 4].map((x) => (
        <Model key={x} name="conveyor-long-stripe-sides" position={[x, 0, 2.1]} />
      ))}
      {Array.from({ length: BOXES }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            boxes.current[i] = g;
          }}
        >
          <Model
            name={i % 3 === 0 ? "box-wide" : "box-small"}
            rotation={[0, i * 0.7, 0]}
          />
        </group>
      ))}
      {/* The stage gate: a scanner straddling the belt. */}
      <Model name="scanner-high" position={[-3, 0, 2.1]} />
    </group>
  );
}

function Station({
  project,
  stageColor,
  piece,
  animated,
}: {
  project: StationProject;
  stageColor: string;
  piece?: ReactNode;
  animated: boolean;
}) {
  const sign = useMemo<SignData>(
    () => ({
      name: project.name,
      stage: project.stage,
      stageColor,
      color: project.color,
      icon: project.icon,
      footnote: project.footnote,
    }),
    [project, stageColor],
  );
  const spinner = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spinner.current && animated) spinner.current.rotation.y += dt * 0.5;
  });

  return (
    <group>
      <Model name="machine-window" position={[0, 0, -0.6]} scale={1.3} />
      <mesh position={[0, 1.75, -0.6]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.8, 0.12, 40]} />
        <meshStandardMaterial color={project.color} roughness={0.5} />
      </mesh>
      <group ref={spinner} position={[0, 1.81, -0.6]} scale={1.75}>
        {piece ?? <Microphone color={project.color} animated={animated} />}
      </group>
      <group position={[1.75, 0, 0.7]} scale={0.95}>
        <RobotArm animated={animated} sparks />
      </group>
      <group position={[0.4, 2.55, -3.4]}>
        <Sign data={sign} width={3.36} hanging />
      </group>
    </group>
  );
}
