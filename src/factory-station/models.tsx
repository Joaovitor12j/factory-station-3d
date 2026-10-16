import { useGLTF } from "@react-three/drei";
import {
  createContext,
  useContext,
  useMemo,
  type ComponentProps,
} from "react";
import type { Object3D } from "three";

/**
 * Models from Kenney's Factory Kit 3.0 (CC0). Their palette lives in a
 * single texture, `Textures/colormap.png`, next to the `.glb` files; the one
 * shipped here was lightened to cream and slate.
 */
export const MODEL_NAMES = [
  "box-large",
  "box-small",
  "box-wide",
  "cog-a",
  "cone",
  "conveyor-long-stripe-sides",
  "crane",
  "floor-large",
  "hopper-round",
  "indicator-special-lines",
  "lever-double",
  "machine-window",
  "oopi",
  "pipe-large-long",
  "robot-arm-a",
  "scanner-high",
  "structure-corner-outer",
  "structure-wall",
  "structure-window",
  "structure-yellow-tall",
] as const;
export type ModelName = (typeof MODEL_NAMES)[number];

/** Folder (URL) that holds the `.glb` files and `Textures/colormap.png`. */
export const ModelsPathContext = createContext("/models/");

const urlOf = (base: string, name: ModelName) =>
  `${base.endsWith("/") ? base : `${base}/`}${name}.glb`;

/** A private copy of a model, with shadows on. */
export function useModel(name: ModelName): Object3D {
  const base = useContext(ModelsPathContext);
  const { scene } = useGLTF(urlOf(base, name));
  return useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    return copy;
  }, [scene]);
}

export function Model({
  name,
  ...props
}: { name: ModelName } & Omit<ComponentProps<"group">, "children">) {
  const object = useModel(name);
  return (
    <group {...props}>
      <primitive object={object} />
    </group>
  );
}

/** Starts downloading every model before the station mounts. */
export function preloadModels(base = "/models/") {
  for (const name of MODEL_NAMES) useGLTF.preload(urlOf(base, name));
}
