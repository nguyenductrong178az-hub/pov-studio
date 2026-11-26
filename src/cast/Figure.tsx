import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { G, makeOutline, makeToon, setLowPoly, type Kind } from "../character/materials";
import type { JunoStyle } from "../juno/styles";
import type { FigureDef, HandProp } from "./types";

type V3 = [number, number, number];
const Ctx = createContext<{ style: JunoStyle; outlineMul: number } | null>(null);
const useS = () => useContext(Ctx)!;

type PartProps = {
  geo: THREE.BufferGeometry; color: string; kind?: Kind; position?: V3; rotation?: V3; scale?: V3 | number;
  outline?: number; unlit?: boolean; doubleSide?: boolean; opacity?: number;
};
const Part: React.FC<PartProps> = ({ geo, color, kind = "other", position, rotation, scale, outline = 1, unlit, doubleSide, opacity }) => {
  const { style, outlineMul } = useS();
  const mat = useMemo(
    () =>
      unlit
        ? new THREE.MeshBasicMaterial({ color, transparent: opacity !== undefined, opacity: opacity ?? 1, depthWrite: opacity === undefined, side: THREE.DoubleSide })
        : makeToon(style, color, doubleSide, kind),
    [style, color, unlit, doubleSide, opacity, kind],
  );
  const w = style.outline.width * outline * outlineMul;
  const oMat = useMemo(() => (w > 0 && !unlit ? makeOutline(style, color, w) : null), [style, color, w, unlit]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} material={mat} />
      {oMat && <mesh geometry={geo} material={oMat} />}
    </group>
  );
};

const mix = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const surf = (r: number, yaw: number, pitch: number): V3 => [r * Math.cos(pitch) * Math.sin(yaw), r * Math.sin(pitch), r * Math.cos(pitch) * Math.cos(yaw)];

const Hand: React.FC<{ skin: string; curl: number; spread?: number }> = ({ skin, curl, spread = 0.07 }) => {
  const r = 0.05;
  return (
    <group>
      <Part geo={G.sphere(r)} color={skin} kind="skin" scale={[0.9, 1.1, 0.6]} />
      {[-1.5, -0.5, 0.5, 1.5].map((i) => (
        <group key={i} position={[i * r * 0.36, -r * 0.9, 0]} rotation={[curl, 0, i * spread]}>
          <Part geo={G.capsule(0.012, i === 1.5 ? 0.04 : 0.052)} color={skin} kind="skin" position={[0, -0.03, 0]} />
        </group>
      ))}
      <group position={[r * 0.75, -r * 0.15, r * 0.2]} rotation={[curl * 0.5, 0, 0.85]}>
        <Part geo={G.capsule(0.013, 0.036)} color={skin} kind="skin" position={[0, -0.022, 0]} />
      </group>
    </group>
  );
};

const Prop: React.FC<{ type: HandProp; caseColor: string; accent: string }> = ({ type, caseColor, accent }) => {
  if (type === "phone")
    return (
      <group position={[0.01, -0.03, 0.05]} rotation={[1.05, 0.1, 0]}>
        <Part geo={G.box(0.075, 0.15, 0.012)} color={caseColor} />
        <Part geo={G.box(0.066, 0.135, 0.002)} color="#bfe3ff" unlit position={[0, 0, 0.0075]} />
      </group>
    );
  if (type === "mug")
    return (
      <group position={[0.0, -0.05, 0.06]}>
        <Part geo={G.cyl(0.045, 0.1)} color="#efe6d6" />
        <Part geo={G.torus(0.025, 0.007, Math.PI * 2)} color="#efe6d6" position={[0.05, 0, 0]} rotation={[Math.PI / 2, Math.PI / 2, 0]} />
        <Part geo={G.cyl(0.04, 0.004)} color="#5a3a24" position={[0, 0.048, 0]} />
        <Part geo={G.cyl(0.0455, 0.025)} color={accent} position={[0, 0.0, 0]} />
      </group>
    );
  if (type === "radio")
    return (
      <group position={[0.0, -0.04, 0.04]} rotation={[0.2, 0, 0]}>
        <Part geo={G.box(0.055, 0.13, 0.03)} color="#2a2b30" />
        <Part geo={G.capsule(0.007, 0.07)} color="#1d1d20" position={[0.015, 0.1, 0]} outline={0} />
        <Part geo={G.box(0.035, 0.03, 0.002)} color="#9fd27a" unlit position={[0, 0.035, 0.016]} />
        <Part geo={G.sphere(0.008)} color="#ff7a2a" unlit position={[-0.016, 0.07, 0.006]} />
      </group>
    );
  if (type === "boltcutter")
    return (
      <group position={[0.0, -0.02, 0.05]} rotation={[0.25, 0, 0]}>
        {[-1, 1].map((sd) => (
          <group key={sd} rotation={[0, 0, sd * 0.06]}>
            <Part geo={G.capsule(0.014, 0.34)} color="#b52330" position={[sd * 0.012, -0.12, 0]} />
            <Part geo={G.capsule(0.01, 0.12)} color="#8d9298" position={[sd * 0.01, 0.16, 0]} />
          </group>
        ))}
        <Part geo={G.box(0.05, 0.07, 0.025)} color="#8d9298" position={[0, 0.25, 0]} />
      </group>
    );
  if (type === "marker")
    return (
      <group position={[0.0, -0.03, 0.03]} rotation={[0.9, 0, 0.3]}>
        <Part geo={G.capsule(0.012, 0.12)} color="#f2f2f2" />
        <Part geo={G.cyl(0.0135, 0.04)} color="#2a3a8a" position={[0, 0.07, 0]} />
      </group>
    );
  return null;
};

export const figureRig = (f: FigureDef) => {
  const h = f.body.hip, R = f.body.headR;
  const headY = h + 0.95;
  const extra = f.hair.style === "bun" ? R * 1.5 : f.hair.style === "afro" ? R * 1.55 : f.hair.style === "puffs" ? R * 1.4 : R * 1.25;
  return { headY, R, top: headY + extra };
};

// Figuren-Einheiten → Meter (Juno ≈ 2,5 Einheiten ≈ 1,60 m)
export const FIG_TO_M = 0.64;
// Sitzhöhe in Figuren-Einheiten (0,48 m Stuhlsitz)
const SEAT = 0.48 / FIG_TO_M;

export const Figure: React.FC<{
  f: FigureDef; style: JunoStyle; rotationY?: number; position?: V3; scale?: number;
  pose?: "stand" | "sit"; walk?: number; headYaw?: number; lift?: number; torsoYaw?: number;
  /** 0…1 – miệng mở theo âm lượng của file giọng (khớp môi) */
  talk?: number;
}> = ({ f, style, rotationY = 0, position = [0, 0, 0], scale = 1, pose = "stand", walk = 0, headYaw = 0, lift = 0, torsoYaw = 0, talk = 0 }) => {
  const sit = pose === "sit";
  setLowPoly(!!style.texture.facet);
  const h = f.body.hip, b = f.body.build, R = f.body.headR;
  const { headY } = figureRig(f);
  const s = h / 1.15;
  const upL = 0.3 * (0.6 + 0.4 * s), foL = 0.28 * (0.6 + 0.4 * s), sleeveR = 0.085 * b;
  const shoulderY = h + 0.52, shoulderX = 0.27 * b;
  const sleeves = f.top.sleeves ?? f.top.color;
  const cheek = "#e8907a";
  const ear = mix(f.skin, cheek, 0.3);
  const ew = 0.062 * f.eyes.size * (R / 0.26), eh = ew * 1.13, fz = ew * 0.73;
  const ex = f.extras;

  const Arm = ({ side, sh, el, hand }: { side: 1 | -1; sh: V3; el: V3; hand: React.ReactNode }) => (
    <group position={[side * shoulderX, shoulderY, 0]} rotation={sh}>
      <Part geo={G.capsule(sleeveR, upL)} color={sleeves} kind="cloth" position={[0, -upL / 2, 0]} />
      <group position={[0, -upL, 0]} rotation={el}>
        <Part geo={G.cylT(sleeveR * 0.98, sleeveR * 1.05, foL)} color={sleeves} kind="cloth" position={[0, -foL / 2, 0]} />
        <Part geo={G.cyl(sleeveR * 0.9, 0.06)} color={sleeves} kind="cloth" position={[0, -foL - 0.02, 0]} />
        {side === 1 && ex.includes("watch") && <Part geo={G.torus(0.045, 0.012, Math.PI * 2)} color="#2a2a2e" position={[0, -foL - 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} />}
        {side === 1 && ex.includes("scrunchie") && <Part geo={G.torus(0.046, 0.016, Math.PI * 2)} color={f.accent} kind="cloth" position={[0, -foL - 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} />}
        <group position={[0, -foL - 0.085, 0]}>{hand}</group>
      </group>
    </group>
  );
  const rightProp = f.hands.right;
  const leftProp = f.hands.left;

  // ---------- Haare ----------
  const topCap = <Part geo={G.cap(R * 1.08, Math.PI * 0.45)} color={f.hair.color} kind="hair" rotation={[-0.35, 0, 0]} doubleSide />;
  const backCap = (theta: number) => <Part geo={G.cap(R * 1.07, Math.PI * theta)} color={f.hair.color} kind="hair" rotation={[-0.9, 0, 0]} doubleSide />;
  const strand = (key: string, pos: V3, yaw: number, rotX: number, len: number, w = 0.045, rotZ = 0) => (
    <group key={key} position={pos} rotation={[0, yaw, 0]}>
      <Part geo={G.cone(w, len)} color={f.hair.color} kind="hair" rotation={[rotX, 0, rotZ]} scale={[1, 1, 0.45]} />
    </group>
  );
  const fringe = (yaws: number[], pitch: number, len: number, sweep: number) =>
    yaws.map((yaw, i) => strand(`fr${i}`, surf(R * 1.0, yaw, pitch), yaw, Math.PI - 0.5, len + rnd(i + 3) * 0.04, 0.045, sweep + (rnd(i + 9) - 0.5) * 0.3));

  let hair: React.ReactNode = null;
  switch (f.hair.style) {
    case "bob":
      hair = <>{topCap}{backCap(0.7)}{fringe([-0.42, -0.2, 0.02, 0.24, 0.44], 0.42, 0.12, -0.2)}</>;
      break;
    case "bun":
      hair = (
        <>
          {topCap}
          {backCap(0.58)}
          <Part geo={G.sphere(R * 0.42)} color={f.hair.color} kind="hair" position={[0, R * 0.98, -R * 0.42]} />
          <Part geo={G.torus(R * 0.3, 0.014, Math.PI * 2)} color={mix(f.hair.color, "#000", 0.4)} position={[0, R * 0.78, -R * 0.33]} rotation={[Math.PI / 2 - 0.6, 0, 0]} />
          {[-1, 1].map((sd) => strand(`t${sd}`, surf(R * 1.02, sd * 0.95, 0.15), sd * 0.95, Math.PI - 0.15, 0.2, 0.025))}
        </>
      );
      break;
    case "long":
      hair = (
        <>
          {topCap}
          {backCap(0.72)}
          <Part geo={G.capsule(R * 0.82, 0.42)} color={f.hair.color} kind="hair" position={[0, -R * 0.95, -R * 0.5]} scale={[1.2, 1, 0.55]} />
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.capsule(0.055, 0.34)} color={f.hair.color} kind="hair" position={[sd * R * 0.86, -R * 0.8, R * 0.05]} rotation={[0.05, 0, sd * 0.06]} scale={[1, 1, 0.7]} />
          ))}
          {fringe([-0.5, -0.3, -0.1, 0.12], 0.46, 0.13, 0.45)}
        </>
      );
      break;
    case "afro":
      hair = (
        <group position={[0, R * 0.15, -R * 0.15]} rotation={[-0.5, 0, 0]}>
          <Part geo={G.cap(R * 1.38, Math.PI * 0.55)} color={f.hair.color} kind="hair" doubleSide />
          {Array.from({ length: 46 }).map((_, i) => {
            const t = rnd(i + 200) * Math.PI * 0.52, ph = rnd(i + 300) * Math.PI * 2;
            const rr = R * 1.38;
            return <Part key={i} geo={G.sphere(0.055 + rnd(i + 400) * 0.03)} color={f.hair.color} kind="hair" position={[rr * Math.sin(t) * Math.cos(ph), rr * Math.cos(t), rr * Math.sin(t) * Math.sin(ph)]} />;
          })}
        </group>
      );
      break;
    case "puffs":
      hair = (
        <>
          {topCap}
          {backCap(0.6)}
          {[-1, 1].map((sd) => (
            <group key={sd}>
              <Part geo={G.sphere(R * 0.52)} color={f.hair.color} kind="hair" position={[sd * R * 0.74, R * 0.8, -R * 0.12]} />
              <Part geo={G.torus(R * 0.33, 0.02, Math.PI * 2)} color={f.accent} kind="cloth" position={[sd * R * 0.6, R * 0.6, -R * 0.1]} rotation={[Math.PI / 2, 0, sd * 0.75]} />
            </group>
          ))}
          {fringe([-0.3, -0.1, 0.1, 0.3], 0.5, 0.08, 0)}
        </>
      );
      break;
    case "short":
      // unter Mütze/Schiebermütze nur Haar an den Seiten und hinten unten (sonst sticht die Schale durch)
      hair = f.headwear.type !== "none" ? (
        <>
          <Part geo={G.cap(R * 1.06, Math.PI * 0.3)} color={f.hair.color} kind="hair" rotation={[-2.1, 0, 0]} doubleSide />
          {[-1, 1].map((sd) => strand(`s${sd}`, surf(R * 1.02, sd * 1.3, 0.05), sd * 1.3, Math.PI - 0.25, 0.09))}
        </>
      ) : (
        <>
          {backCap(0.56)}
          {[-1, 1].map((sd) => strand(`s${sd}`, surf(R * 1.02, sd * 1.25, 0.2), sd * 1.25, Math.PI - 0.3, 0.1))}
          {fringe([-0.25, 0.0, 0.25], 0.42, 0.09, -0.1)}
        </>
      );
      break;
    case "tousled":
      // zerzaustes Kurzhaar: Büschel über den Scheitel verteilt, Spitzen ragen über die Haarschale hinaus
      hair = (
        <>
          {/* flach sitzende Haarschale: Stirnkante knapp über den Brauen, keine schräge Naht in der Seitenansicht */}
          <Part geo={G.cap(R * 1.08, Math.PI * 0.42)} color={f.hair.color} kind="hair" rotation={[-0.1, 0, 0]} doubleSide />
          {backCap(0.6)}
          {[[-0.9, 0.75], [-0.45, 0.95], [0, 1.1], [0.45, 0.95], [0.9, 0.75], [-0.6, 1.25], [0.6, 1.25], [Math.PI, 1.0], [2.4, 0.8], [-2.4, 0.8]].map(([yaw, pitch], i) =>
            strand(`tu${i}`, surf(R * 1.04, yaw, pitch), yaw, 0.8 + rnd(i) * 0.4, 0.1 + rnd(i + 5) * 0.04, 0.08, (rnd(i + 11) - 0.5) * 0.6))}
          {[-1, 1].map((sd) => strand(`s${sd}`, surf(R * 1.02, sd * 1.25, 0.2), sd * 1.25, Math.PI - 0.3, 0.1))}
          {fringe([-0.3, -0.05, 0.2], 0.5, 0.1, 0.35)}
        </>
      );
      break;
    case "braids":
      // zwei Zöpfe hinter den Ohren, fallen vor die Schultern; Haargummi in Akzentfarbe
      hair = (
        <>
          {topCap}
          {backCap(0.62)}
          {fringe([-0.32, -0.11, 0.11, 0.32], 0.46, 0.1, 0)}
          {[-1, 1].map((sd) => (
            <group key={`br${sd}`}>
              {Array.from({ length: 7 }).map((_, i) => {
                const r0 = 0.05 - i * 0.003;
                return <Part key={i} geo={G.sphere(r0)} color={f.hair.color} kind="hair" position={[sd * (R * 0.92 + i * 0.006), -R * 0.35 - i * 0.075, -R * 0.1 + i * 0.03]} scale={[1, 1.25, 0.9]} />;
              })}
              <Part geo={G.torus(0.03, 0.012, Math.PI * 2)} color={f.accent} kind="cloth" position={[sd * (R * 0.92 + 0.042), -R * 0.35 - 0.52, -R * 0.1 + 0.2]} rotation={[Math.PI / 2, 0, 0]} />
              <Part geo={G.cone(0.035, 0.08)} color={f.hair.color} kind="hair" position={[sd * (R * 0.92 + 0.045), -R * 0.35 - 0.58, -R * 0.1 + 0.21]} rotation={[Math.PI, 0, 0]} />
            </group>
          ))}
        </>
      );
      break;
    case "fringe":
      // unter einer Kapuze nur der Pony – sonst stechen die Haarschalen durch
      hair = f.headwear.type === "hood"
        ? <>{fringe([-0.5, -0.32, -0.14, 0.04, 0.22], 0.42, 0.2, 0.25)}</>
        : (
          <>
            {topCap}
            {backCap(0.66)}
            {/* langer, schräger Pony über dem rechten Auge */}
            {[-0.6, -0.42, -0.26, -0.1, 0.06, 0.22].map((yaw, i) => {
              const len = 0.17 + (i < 3 ? 0.06 : 0) + rnd(i) * 0.03;
              return (
                <group key={`fx${i}`} position={surf(R * 1.0, yaw, 0.55)} rotation={[0, yaw, 0]}>
                  {/* am Ansatz verankert: Kegel-Basis im Haaransatz, Spitze fällt übers Auge */}
                  <group rotation={[Math.PI - 0.38, 0, 0.32 + (rnd(i + 9) - 0.5) * 0.2]}>
                    <Part geo={G.cone(0.05, len)} color={f.hair.color} kind="hair" position={[0, len / 2 - 0.02, 0]} scale={[1, 1, 0.45]} />
                  </group>
                </group>
              );
            })}
          </>
        );
      break;
  }

  // ---------- Kopfbedeckung ----------
  let headwear: React.ReactNode = null;
  const hw = f.headwear;
  if (hw.type === "headband")
    headwear = <Part geo={G.torus(R * 1.1, 0.022, Math.PI)} color={hw.color} kind="cloth" rotation={[-0.38, 0, 0]} />;
  if (hw.type === "capBack")
    headwear = (
      <group position={[0, R * 0.08, 0]} rotation={[-0.12, 0, 0]}>
        <Part geo={G.cap(R * 1.12, Math.PI * 0.5)} color={hw.color} kind="cloth" doubleSide />
        <Part geo={G.cyl(R * 1.12, 0.03)} color={hw.color} kind="cloth" position={[0, 0.012, 0]} />
        <Part geo={G.sphere(1)} color={hw.color} kind="cloth" position={[0, 0.0, -R * 1.25]} rotation={[0.18, 0, 0]} scale={[R * 0.72, 0.016, R * 0.5]} />
        <Part geo={G.sphere(0.018)} color={hw.color} kind="cloth" position={[0, R * 1.12, 0]} />
        <Part geo={G.box(0.07, 0.03, 0.01)} color={hw.accent ?? "#fff"} position={[0, R * 0.25, R * 1.08]} rotation={[-0.25, 0, 0]} />
      </group>
    );
  if (hw.type === "beanie")
    headwear = (
      <group rotation={[-0.22, 0, 0]}>
        <Part geo={G.cap(R * 1.13, Math.PI * 0.5)} color={hw.color} kind="cloth" position={[0, R * 0.05, 0]} scale={[1, 1.12, 1]} doubleSide />
        <Part geo={G.torus(R * 1.1, 0.04, Math.PI * 2)} color={mix(hw.color, "#ffffff", 0.06)} kind="cloth" position={[0, R * 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {f.extras.includes("snow") && [[-0.3, 0.9], [0.25, 1.05], [0, 1.18]].map(([x, y], i) => (
          <Part key={i} geo={G.sphere(1)} color="#f4f7fa" position={[x * R, y * R, 0.1 * R]} scale={[R * 0.32, R * 0.1, R * 0.28]} />
        ))}
      </group>
    );
  if (hw.type === "flatcap")
    headwear = (
      <group position={[0, R * 0.56, R * 0.04]} rotation={[0.22, 0, 0]}>
        <Part geo={G.sphere(1)} color={hw.color} kind="cloth" scale={[R * 1.15, R * 0.56, R * 1.2]} />
        <Part geo={G.sphere(1)} color={mix(hw.color, "#000", 0.12)} kind="cloth" position={[0, -R * 0.2, R * 1.0]} scale={[R * 0.72, 0.016, R * 0.42]} />
        <Part geo={G.sphere(0.016)} color={hw.accent ?? mix(hw.color, "#000", 0.2)} position={[0, R * 0.55, 0]} />
      </group>
    );
  if (hw.type === "headscarf")
    // khăn trùm buộc nút trên đỉnh trán, mép trước lộ ba ống lô cuốn tóc (màu accent của khăn)
    headwear = (
      <group position={[0, R * 0.3, -R * 0.05]} rotation={[-0.32, 0, 0]}>
        <Part geo={G.cap(R * 1.12, Math.PI * 0.5)} color={hw.color} kind="cloth" scale={[1.03, 1.0, 1.05]} doubleSide />
        <Part geo={G.torus(R * 1.12, 0.028, Math.PI * 2)} color={mix(hw.color, "#000", 0.1)} kind="cloth" position={[0, R * 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.03, 1.05, 1]} />
        <Part geo={G.sphere(1)} color={hw.color} kind="cloth" position={[0, R * 0.95, R * 0.38]} scale={[R * 0.3, R * 0.2, R * 0.24]} />
        {[-0.5, 0, 0.5].map((yaw, i) => (
          <Part key={i} geo={G.cyl(R * 0.12, R * 0.36)} color={hw.accent ?? "#e8a0b4"} kind="cloth" position={surf(R * 1.06, yaw, -0.02)} rotation={[0, yaw, Math.PI / 2]} />
        ))}
      </group>
    );
  if (hw.type === "hood")
    headwear = (
      <>
        <group scale={[1.02, 0.86, 1.12]} position={[0, -R * 0.02, -R * 0.06]}>
          <Part geo={G.cap(R * 1.28, Math.PI * 0.62)} color={hw.color} kind="cloth" position={[0, R * 0.05, -R * 0.12]} rotation={[-0.55, 0, 0]} doubleSide />
          {/* Stoffrand um die Gesichtsöffnung */}
          <Part geo={G.torus(R * 1.18, R * 0.09, Math.PI * 2)} color={mix(hw.color, "#000", 0.12)} kind="cloth" position={[0, -R * 0.35, R * 0.13]} rotation={[Math.PI + 1.02, 0, 0]} />
        </group>
        {/* Kapuze fällt hinten bis auf die Schultern */}
        <Part geo={G.sphere(1)} color={hw.color} kind="cloth" position={[0, -R * 0.75, -R * 0.75]} scale={[R * 1.05, R * 0.75, R * 0.6]} />
      </>
    );

  // ---------- Mund ----------
  let mouth: React.ReactNode;
  const mp = surf(R * 0.985, 0.03, -0.36);
  if (talk > 0.04)
    // khớp môi: miệng mở thành hình bầu dục, độ mở theo âm lượng của chính file giọng
    mouth = (
      <group position={mp} rotation={[0.36, 0.03, 0]}>
        <Part geo={G.sphere(1)} color="#5a2a28" unlit scale={[0.026 - 0.004 * talk, 0.006 + 0.022 * talk, 0.008]} outline={0} />
        <Part geo={G.sphere(1)} color="#c86a6a" unlit position={[0, -0.004 - 0.008 * talk, 0.002]} scale={[0.014, 0.004 + 0.006 * talk, 0.006]} outline={0} />
      </group>
    );
  else if (f.mouth === "flat") mouth = <group position={mp} rotation={[0.36, 0.03, 0.04]}><Part geo={G.capsule(0.0055, 0.03)} color="#a4524b" unlit rotation={[0, 0, Math.PI / 2]} /></group>;
  else if (f.mouth === "grin")
    mouth = (
      <group position={mp} rotation={[0.36, 0.03, 0]}>
        <Part geo={G.circle(0.038)} color="#6b2a2a" unlit position={[0, -0.004, -0.001]} scale={[1, 0.55, 1]} />
        <Part geo={G.box(0.05, 0.012, 0.001)} color="#f8f4ee" unlit position={[0, 0.008, 0.0005]} />
        <Part geo={G.torus(0.04, 0.006, Math.PI)} color="#a4524b" unlit rotation={[0, 0, Math.PI]} position={[0, 0.012, 0.001]} scale={[1, 0.6, 1]} />
      </group>
    );
  else if (f.mouth === "smirk")
    mouth = <group position={mp} rotation={[0.36, 0.03, 0.22]}><Part geo={G.torus(0.03, 0.0055, Math.PI * 0.55)} color="#a4524b" unlit rotation={[0, 0, Math.PI + Math.PI * 0.32]} /></group>;
  else mouth = <group position={mp} rotation={[0.36, 0.04, 0.1]}><Part geo={G.torus(0.028, 0.0055, Math.PI * 0.7)} color="#a4524b" unlit rotation={[0, 0, Math.PI + Math.PI * 0.15]} /></group>;

  const legX = 0.12 * b;
  return (
    <Ctx.Provider value={{ style, outlineMul: 1 }}>
      <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {/* ---------- Beine / Unterteil ---------- */}
        {sit ? (
          [-1, 1].map((sd) => (
            <group key={sd} position={[sd * legX, 0, 0]}>
              {/* Oberschenkel waagerecht nach vorn, Unterschenkel senkrecht */}
              <Part geo={G.capsule(0.108, 0.5)} color={f.bottom.color} kind="cloth" position={[0, SEAT, 0.27]} rotation={[Math.PI / 2, 0, 0]} />
              <Part geo={G.cylT(0.1, 0.095, SEAT - 0.3)} color={f.bottom.color} kind="cloth" position={[0, (SEAT + 0.3) / 2, 0.56]} />
              <Part geo={G.cylT(0.058, 0.062, 0.12)} color={f.socks ?? "#f2ede4"} kind="cloth" position={[0, 0.25, 0.56]} />
              <Part geo={G.cyl(0.075, 0.12)} color={f.shoes.color} position={[0, 0.17, 0.55]} />
              <Part geo={G.sphere(1)} color={f.shoes.color} position={[0, 0.09, 0.62]} scale={[0.095, 0.08, 0.175]} />
              <Part geo={G.sphere(1)} color={f.shoes.sole} position={[0, 0.035, 0.62]} scale={[0.104, 0.04, 0.188]} />
            </group>
          ))
        ) : f.bottom.type === "skirt" ? (
          <>
            <Part geo={G.cylT(0.2 * b, 0.3 * b, h + 0.05 - 0.42)} color={f.bottom.color} kind="cloth" position={[0, (h + 0.05 + 0.42) / 2, 0]} />
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.09, 0, 0]}>
                <Part geo={G.cylT(0.045, 0.04, 0.4)} color={mix(f.skin, "#3a393f", 0.55)} kind="skin" position={[0, 0.28, 0]} />
                <Part geo={G.sphere(1)} color={f.shoes.color} position={[0, 0.05, 0.04]} scale={[0.07, 0.05, 0.15]} />
                <Part geo={G.sphere(1)} color={f.shoes.sole} position={[0, 0.02, 0.04]} scale={[0.075, 0.022, 0.155]} />
              </group>
            ))}
          </>
        ) : (
          [-1, 1].map((sd) => (
            <group key={sd} position={[sd * legX, h, 0]} rotation={[Math.sin(walk) * 0.5 * sd, 0, 0]}><group position={[0, -h, 0]}>
              {f.bottom.type === "cargo" && (
                <>
                  <Part geo={G.cylT(0.11, 0.12, h - 0.3)} color={f.bottom.color} kind="cloth" position={[0, (h + 0.3) / 2, 0]} />
                  <Part geo={G.cyl(0.126, 0.055)} color={f.bottom.color} kind="cloth" position={[0, 0.32, 0]} />
                  <Part geo={G.box(0.03, 0.16, 0.13)} color={f.bottom.color} kind="cloth" position={[sd * 0.115, 0.3 + (h - 0.3) * 0.5, 0]} />
                </>
              )}
              {f.bottom.type === "jeans" && <Part geo={G.cylT(0.1, 0.105, h - 0.3)} color={f.bottom.color} kind="cloth" position={[0, (h + 0.3) / 2, 0]} />}
              {f.bottom.type === "joggers" && (
                <>
                  <Part geo={G.cylT(0.105, 0.088, h - 0.33)} color={f.bottom.color} kind="cloth" position={[0, (h + 0.33) / 2, 0]} />
                  <Part geo={G.cyl(0.075, 0.06)} color={f.bottom.color} kind="cloth" position={[0, 0.33, 0]} />
                </>
              )}
              <Part geo={G.cylT(0.058, 0.062, 0.12)} color={f.socks ?? "#f2ede4"} kind="cloth" position={[0, 0.25, 0]} />
              <Part geo={G.cyl(0.075, 0.12)} color={f.shoes.color} position={[0, 0.17, -0.01]} />
              <Part geo={G.sphere(1)} color={f.shoes.color} position={[0, 0.09, 0.045]} scale={[0.095, 0.08, 0.175]} />
              <Part geo={G.sphere(1)} color={f.shoes.sole} position={[0, 0.1, 0.17]} scale={[0.075, 0.05, 0.055]} />
              <Part geo={G.sphere(1)} color={f.shoes.sole} position={[0, 0.035, 0.045]} scale={[0.104, 0.04, 0.188]} />
              {f.shoes.tab && <Part geo={G.circle(0.022)} color={f.shoes.tab} unlit position={[sd * 0.078, 0.17, -0.01]} rotation={[0, sd * Math.PI / 2, 0]} />}
            </group></group>
          ))
        )}
        {/* Oberkörper dreht sich um die Hüfte – Beine bleiben, wo sie sind (nie durch den Tisch) */}
        <group position={[0, (sit ? SEAT - h : 0) + Math.abs(Math.sin(walk)) * 0.03 + lift, 0]} rotation={[0, torsoYaw, 0]}>
        {f.bottom.type !== "skirt" && <Part geo={G.sphere(1)} color={f.bottom.color} kind="cloth" position={[0, h, 0]} scale={[0.23 * b, 0.12, 0.17 * b]} />}

        {/* ---------- Oberteil ---------- */}
        <Part geo={G.capsule(0.23 * b, 0.26)} color={f.top.color} kind="cloth" position={[0, h + 0.3, 0]} scale={[1.15, 1, 0.85]} />
        <Part geo={G.cyl(0.245 * b, 0.1)} color={f.top.type === "open" ? f.top.color : f.top.color} kind="cloth" position={[0, h - 0.02, 0]} scale={[1.15, 1, 0.85]} />
        {(f.top.type === "open" || f.top.type === "coat" || f.top.type === "robe") && (
          <Part geo={G.sphere(1)} color={f.top.inner ?? "#f1efea"} kind="cloth" position={[0, h + 0.3, 0.17 * b]} scale={[0.1 * b, 0.36, 0.05]} />
        )}
        {f.top.type === "robe" && !sit && (
          <Part geo={G.cylT(0.255 * b, 0.31 * b, 0.62)} color={f.top.color} kind="cloth" position={[0, h - 0.3, 0]} scale={[1.15, 1, 0.85]} />
        )}
        {f.top.type === "robe" && (
          <Part geo={G.torus(0.25 * b, 0.026, Math.PI * 2)} color={f.accent} kind="cloth" position={[0, h + 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.17, 0.87, 1]} />
        )}
        {f.top.type === "robe" && [-1, 1].map((sd) => (
          <Part key={`r${sd}`} geo={G.box(0.1, 0.34, 0.02)} color={mix(f.top.color, "#ffffff", 0.12)} kind="cloth" position={[sd * 0.1 * b, h + 0.46, 0.19 * b]} rotation={[-0.2, 0, sd * 0.38]} />
        ))}
        {f.top.type === "coat" && !sit && (
          <Part geo={G.cylT(0.255 * b, 0.29 * b, 0.42)} color={f.top.color} kind="cloth" position={[0, h - 0.2, 0]} scale={[1.15, 1, 0.85]} />
        )}
        {f.top.type === "coat" && [-1, 1].map((sd) => (
          <Part key={sd} geo={G.box(0.12, 0.3, 0.02)} color={mix(f.top.color, "#000", 0.08)} kind="cloth" position={[sd * 0.11 * b, h + 0.5, 0.19 * b]} rotation={[-0.2, 0, sd * 0.35]} />
        ))}
        {f.top.type === "puffer" && [0.02, 0.2, 0.38, 0.56].map((y, i) => (
          <Part key={i} geo={G.torus(0.25 * b, 0.022, Math.PI * 2)} color={mix(f.top.color, "#000", 0.1)} kind="cloth" outline={0} position={[0, h + y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.17, 0.87, 1]} />
        ))}
        {f.top.type === "puffer" && <Part geo={G.cylT(0.11, 0.14, 0.12)} color={f.top.color} kind="cloth" position={[0, h + 0.66, 0.0]} />}
        {ex.includes("reflect") && [0.12, 0.34].map((y, i) => (
          <Part key={i} geo={G.cyl(0.25 * b, 0.035)} color="#dfe5e7" kind="cloth" position={[0, h + y, 0]} scale={[1.16, 1, 0.86]} />
        ))}
        {ex.includes("badge") && <Part geo={G.box(0.07, 0.04, 0.01)} color={f.accent} position={[0.12 * b, h + 0.42, 0.2 * b]} />}
        {ex.includes("snow") && [-1, 1].map((sd) => (
          <Part key={sd} geo={G.sphere(1)} color="#f4f7fa" position={[sd * 0.2 * b, h + 0.6, 0]} scale={[0.1, 0.03, 0.12]} />
        ))}
        {f.top.type === "hoodie" && hw.type !== "hood" && (
          <Part geo={G.torus(0.15, 0.065, Math.PI)} color={f.top.color} kind="cloth" position={[0, h + 0.62, -0.03]} rotation={[-Math.PI / 2 + 0.35, 0, 0]} />
        )}
        {f.top.type === "hoodie" &&
          [-1, 1].map((sd) => <Part key={sd} geo={G.capsule(0.008, 0.18)} color="#f2ede4" position={[sd * 0.055, h + 0.5, 0.2 * b]} rotation={[0.1, 0, 0]} />)}
        {f.top.type === "hoodie" && <Part geo={G.sphere(1)} color={f.top.color} kind="cloth" position={[0, h + 0.15, 0.18 * b]} scale={[0.17 * b, 0.08, 0.025]} />}
        <Part geo={G.torus(0.075, 0.025, Math.PI * 2)} color={f.top.type === "open" ? f.top.inner ?? f.top.color : f.top.color} kind="cloth" position={[0, h + 0.64, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} />
        <Part geo={G.cyl(0.045, 0.2)} color={f.skin} kind="skin" position={[0, h + 0.68, 0]} />

        {/* ---------- Extras am Körper ---------- */}
        {ex.includes("scarf") && (
          <>
            <Part geo={G.torus(0.09, 0.042, Math.PI * 2)} color={f.accent} kind="cloth" position={[0, h + 0.63, 0.01]} rotation={[Math.PI / 2 - 0.2, 0, 0]} />
            <Part geo={G.capsule(0.04, 0.28)} color={f.accent} kind="cloth" position={[0.06, h + 0.43, 0.17]} rotation={[0.15, 0, 0.08]} scale={[1, 1, 0.5]} />
          </>
        )}
        {ex.includes("chain") && (
          <>
            <Part geo={G.torus(0.1, 0.006, Math.PI * 2)} color="#cfd4dc" position={[0, h + 0.58, 0.05]} rotation={[Math.PI / 2 - 0.55, 0, 0]} />
            <Part geo={G.sphere(0.018)} color="#cfd4dc" position={[0, h + 0.5, 0.17]} />
          </>
        )}
        {ex.includes("wiredBuds") &&
          [-1, 1].map((sd) => <Part key={sd} geo={G.capsule(0.005, 0.32)} color={f.accent} position={[sd * 0.04, h + 0.48, 0.2 * b]} rotation={[0.1, 0, -sd * 0.12]} />)}

        {/* ---------- Arme ---------- */}
        <Arm
          side={-1}
          sh={[-0.42, 0, -0.08]}
          el={[-1.55, 0.45, 0]}
          hand={<group><Hand skin={f.skin} curl={-1.2} /><Prop type={rightProp} caseColor={f.hands.phoneCase ?? "#1f1f23"} accent={f.accent} /></group>}
        />
        {leftProp === "mug" ? (
          <Arm side={1} sh={[-0.3, 0, 0.1]} el={[-1.35, -0.4, 0]} hand={<group><Hand skin={f.skin} curl={-1.2} /><Prop type="mug" caseColor="" accent={f.accent} /></group>} />
        ) : (
          <Arm side={1} sh={[0.04, 0, 0.12]} el={[-0.25, 0, -0.06]} hand={<Hand skin={f.skin} curl={-0.45} />} />
        )}

        {/* ---------- KOPF ---------- */}
        <group position={[0, headY, 0]} rotation={[0, headYaw, 0]}>
          <Part geo={G.sphere(R)} color={f.skin} kind="skin" scale={[1, 0.97, 0.97]} />
          <Part geo={G.sphere(R * 0.76)} color={f.skin} kind="skin" position={[0, -R * 0.3, R * 0.12]} />
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.sphere(1)} color={ear} kind="skin" position={[sd * R * 0.98, -R * 0.08, -R * 0.05]} scale={[R * 0.12, R * 0.26, R * 0.19]} />
          ))}
          {ex.includes("hoops") && [-1, 1].map((sd) => <Part key={sd} geo={G.torus(0.032, 0.006, Math.PI * 2)} color="#d4a640" position={[sd * R * 1.03, -R * 0.38, -R * 0.03]} rotation={[0, Math.PI / 2, 0]} />)}
          {ex.includes("earbud") && <Part geo={G.sphere(0.022)} color="#f6f6f6" position={[-R * 1.06, -R * 0.1, 0]} />}
          {/* Augen */}
          {[-1, 1].map((sd) => {
            const yaw = sd * 0.34;
            return (
              <group key={sd} position={surf(R * 0.9, yaw, 0.0)} rotation={[0, yaw * 0.75, 0]}>
                <Part geo={G.sphere(1)} color="#f8f5ef" kind="eye" scale={[ew, eh, fz]} />
                <Part geo={G.sphere(1)} color={f.eyes.iris} kind="eye" position={[-sd * ew * 0.1, -ew * 0.1, fz * 0.88]} scale={[ew * 0.58, ew * 0.62, fz * 0.22]} />
                <Part geo={G.sphere(1)} color="#140f0c" kind="eye" position={[-sd * ew * 0.1, -ew * 0.1, fz * 0.97]} scale={[ew * 0.28, ew * 0.3, fz * 0.16]} />
                <Part geo={G.circle(1)} color="#ffffff" unlit position={[-ew * 0.25, eh * 0.18, fz * 1.06]} scale={[ew * 0.11, ew * 0.11, 1]} />
                <Part geo={G.cap(1, Math.PI * 0.5)} color={f.skin} kind="skin" rotation={[f.eyes.lid, 0, sd * -0.1]} scale={[ew * 1.1, eh * 1.1, fz * 1.15]} doubleSide />
              </group>
            );
          })}
          {/* Brille */}
          {f.glasses !== "none" && (
            <>
              {[-1, 1].map((sd) => (
                <group key={sd} position={surf(R * 1.04, sd * 0.34, 0.0)} rotation={[0, sd * 0.27, 0]} scale={f.glasses === "rect" ? [1.25, 0.78, 1] : 1}>
                  <Part geo={G.torus(0.074, 0.0065, Math.PI * 2)} color="#2a2421" outline={0} />
                </group>
              ))}
              <Part geo={G.torus(0.033, 0.006, Math.PI)} color="#2a2421" outline={0} position={[0, 0.005, R * 1.02]} />
              {[-1, 1].map((sd) => <Part key={sd} geo={G.capsule(0.006, 0.2)} color="#2a2421" outline={0} position={[sd * R * 0.99, 0.01, R * 0.27]} rotation={[Math.PI / 2, 0, 0]} />)}
            </>
          )}
          {/* Brauen */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={surf(R * 1.0, sd * 0.34, 0.33)} rotation={[0, sd * 0.34, Math.PI / 2 - sd * f.brows.tilt]}>
              <Part geo={G.capsule(0.011 * f.brows.thick, 0.05)} color={f.brows.color ?? mix(f.hair.color, "#000", 0.15)} kind="hair" scale={[1, 1, 0.5]} />
            </group>
          ))}
          <Part geo={G.sphere(0.034 * (R / 0.26))} color={mix(f.skin, cheek, 0.25)} kind="skin" position={surf(R * 0.97, 0, -0.14)} scale={[1.05, 0.9, 1]} />
          {mouth}
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.circle(0.05)} color={cheek} unlit position={surf(R * 1.002, sd * 0.56, -0.2)} rotation={[0.2, sd * 0.56, 0]} scale={[1, 0.65, 1]} opacity={style.blush * 0.6} />
          ))}
          {ex.includes("freckles") &&
            Array.from({ length: 14 }).map((_, i) => {
              const yaw = (i % 2 ? 1 : -1) * (0.1 + rnd(i) * 0.5), pitch = -0.27 - rnd(i + 20) * 0.12;
              return <Part key={i} geo={G.circle(0.006)} color="#b4704f" unlit position={surf(R * 1.003, yaw, pitch)} rotation={[-pitch, yaw, 0]} opacity={0.85} />;
            })}
          {ex.includes("mustache") && [-1, 1].map((sd) => (
            <group key={sd} position={surf(R * 0.995, sd * 0.07, -0.27)} rotation={[0.3, sd * 0.07, sd * -0.35]}>
              <Part geo={G.capsule(0.016, 0.045)} color={f.brows.color ?? f.hair.color} kind="hair" rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.6]} />
            </group>
          ))}
          {ex.includes("stubble") && (
            <Part geo={G.sphere(R * 0.77)} color={mix(f.skin, "#2a2420", 0.35)} unlit position={[0, -R * 0.33, R * 0.115]} scale={[1.005, 0.86, 1.005]} opacity={0.3} />
          )}
          {hair}
          {headwear}
          {ex.includes("headphonesOn") && (
            <>
              <Part geo={G.torus(R * 1.14, 0.02, Math.PI)} color={mix(f.accent, "#000", 0.25)} position={[0, -R * 0.05, -R * 0.05]} rotation={[0, 0, 0]} />
              {[-1, 1].map((sd) => <Part key={sd} geo={G.cyl(R * 0.3, 0.06)} color={f.accent} position={[sd * R * 1.08, -R * 0.1, -R * 0.04]} rotation={[0, 0, Math.PI / 2]} />)}
            </>
          )}
        </group>
        </group>
      </group>
    </Ctx.Provider>
  );
};
