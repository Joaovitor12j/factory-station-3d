import { useState } from "react";
import { FactoryStation, type StationProject } from "./factory-station";

const STAGES = [
  { label: "Idea", color: "#e46aa3" },
  { label: "Validating", color: "#4f8be6" },
  { label: "Building", color: "#ef9d34" },
  { label: "Live", color: "#26ab7c" },
  { label: "Paused", color: "#8a91a6" },
];

/** Demo page: a fictional project you can edit live. */
export function App() {
  const [name, setName] = useState("Echo");
  const [color, setColor] = useState("#f86858");
  const [stage, setStage] = useState(2);
  const [withIcon, setWithIcon] = useState(true);

  const project: StationProject = {
    name: name || "Untitled",
    stage: STAGES[stage].label,
    color,
    icon: withIcon ? `${import.meta.env.BASE_URL}demo-icon.svg` : undefined,
    footnote: "Open source",
  };

  return (
    <main className="demo">
      <FactoryStation
        className="demo-canvas"
        project={project}
        stageColor={STAGES[stage].color}
        modelsPath={`${import.meta.env.BASE_URL}models/`}
      />

      <section className="demo-panel" aria-labelledby="demo-title">
        <p className="demo-eyebrow">React Three Fiber · Kenney Factory Kit</p>
        <h1 id="demo-title">Factory Station 3D</h1>
        <p>
          A living factory station for your project: its piece spinning on a
          machine, a sign with its icon, a robot arm welding by the belt.
          Drag to look around.
        </p>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Stage
          <select
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
          >
            {STAGES.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="demo-row">
          Colour
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label className="demo-row">
          <input
            type="checkbox"
            checked={withIcon}
            onChange={(e) => setWithIcon(e.target.checked)}
          />
          Icon on the sign (off shows a monogram)
        </label>
      </section>
    </main>
  );
}
