// Night Train · Episode 1 "Copper" – car two in a blizzard (POV, style D, English/US)
// Geometry: locations/nachtzug-wagen2/plan.json · times: scenes/nachtzug-01/timeline.json + sfx.json (same events as the audio)
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import plan from "../../../locations/nachtzug-wagen2/plan.json";
import tl from "../../../scenes/nachtzug-01/timeline.json";
import sfx from "../../../scenes/nachtzug-01/sfx.json";
import { G, makeOutline, makeToon, setLowPoly, type Kind } from "../../character/materials";
import { KANAL_STIL } from "../../stile/richtungen";
import { CAST } from "../../cast/cast";
import { Figure, FIG_TO_M } from "../../cast/Figure";
import type { FigureDef, HandProp } from "../../cast/types";

const STYLE = KANAL_STIL;
export const FPS = tl.fps;
export const DURATION_S = tl.duration_s;
type V3 = [number, number, number];
type P2 = [number, number];

const W3 = (x: number, y: number, z = 0): V3 => [x, z, -y];
const deg = (d: number) => (d * Math.PI) / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number, a: number, b: number) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const GROUND = -0.6; // Schnee unter dem Wagenboden

// ---------- Zeiten ----------
const BEAT = Object.fromEntries(Object.entries(tl.beats).map(([k, v]) => [Number(k), v as number])) as Record<number, number>;
const LINE = Object.fromEntries(tl.lines.map((l) => [l.id, l])) as Record<string, (typeof tl.lines)[number]>;
const ENDCARD = tl.events.endcard[0];
// Sound events with a visible source (scripts/nachtzug_timing.py) – the picture hits exactly these times
const KNOCKS = sfx.knocks as { t: number; gain: number }[];
const STEPS = sfx.steps as { t: number; foot: string; gain: number }[];
const IMPACT = sfx.impact;
const WALK = sfx.walk.segments;
const pulse = (t: number, at: number, w: number) => Math.exp(-(((t - at) / w) ** 2));
const knockHit = (t: number) => KNOCKS.reduce((m, k) => Math.max(m, pulse(t, k.t, 0.055) * Math.min(1, 0.4 + k.gain)), 0);
const impactHit = (t: number) => (t < IMPACT ? pulse(t, IMPACT, 0.12) : Math.exp(-(t - IMPACT) * 2.2));
// camera walk distance along weg-ich (stand up, 3 steps, stop, 4 steps)
const ease = (u: number) => { const k = clamp01(u); return 0.5 * k + 0.5 * k * k * (3 - 2 * k); };
const walkDist = (t: number) => {
  const [a, b] = WALK;
  if (t < a.walk0) return 0;
  if (t < a.t1) return lerp(a.d0, a.d1, ease((t - a.walk0) / (a.t1 - a.walk0)));
  if (t < b.walk0) return a.d1;
  if (t < b.t1) return lerp(b.d0, b.d1, ease((t - b.walk0) / (b.t1 - b.walk0)));
  return b.d1;
};
const speaking = (spk: string, t: number) => tl.lines.some((l) => l.speaker === spk && t >= l.start && t <= l.end);

// ---------- Plan ----------
type Furn = { id: string; type: string; x: number; y: number; w: number; d: number; h: number; seat?: number[]; mounted?: number };
const FURN = plan.furniture as Furn[];
const furn = (id: string) => FURN.find((f) => f.id === id)!;
const pathOf = (id: string) => plan.paths.find((p) => p.id === id)! as unknown as { points: P2[]; t0: number; t1: number };
const RW = plan.size.w, RD = plan.size.d, RH = plan.size.h;

const alongPath = (pts: P2[], u: number) => {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let dist = clamp01(u) * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? Math.min(1, dist / segs[i]) : 0;
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      return { pos: [lerp(x0, x1, k), lerp(y0, y1, k)] as P2, heading: Math.atan2(x1 - x0, -(y1 - y0)), dist: clamp01(u) * total };
    }
    dist -= segs[i];
  }
  return { pos: pts[pts.length - 1], heading: 0, dist: total };
};
const walkPath = (id: string, t: number) => {
  const p = pathOf(id);
  return alongPath(p.points, (t - p.t0) / (p.t1 - p.t0));
};

// ---------- Materialien (Stil D, Raum mit Outline 0.015 m) ----------
const matCache = new Map<string, THREE.Material>();
const mat = (color: string, kind: Kind = "other", ds = false) => {
  const k = `${color}|${kind}|${ds}`;
  if (!matCache.has(k)) matCache.set(k, makeToon(STYLE, color, ds, kind));
  return matCache.get(k)!;
};
const basic = (color: string, opacity = 1) => {
  const k = `b${color}|${opacity}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide }));
  return matCache.get(k)!;
};
const outlineMat = () => {
  if (!matCache.has("o")) matCache.set("o", makeOutline(STYLE, "#000", 0.015));
  return matCache.get("o")!;
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

// Box in Plan-Koordinaten
const Box: React.FC<{ x: [number, number]; y: [number, number]; z: [number, number]; color: string; kind?: Kind; unlit?: boolean; opacity?: number; line?: boolean }> =
  ({ x, y, z, color, kind = "other", unlit, opacity, line = true }) => {
    const lit = !unlit && opacity === undefined;
    const props = { geometry: boxGeo, position: W3((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2), scale: [x[1] - x[0], z[1] - z[0], y[1] - y[0]] as V3 };
    return (
      <>
        <mesh {...props} material={lit ? mat(color, kind) : basic(color, opacity ?? 1)} />
        {lit && line && <mesh {...props} material={outlineMat()} />}
      </>
    );
  };
// beliebige Geometrie in Plan-Koordinaten
const Solid: React.FC<{ geo: THREE.BufferGeometry; at: V3; rot?: V3; scale?: V3; color: string; line?: boolean; unlit?: boolean; opacity?: number }> =
  ({ geo, at, rot, scale, color, line = true, unlit, opacity }) => (
    <group position={W3(at[0], at[1], at[2])} rotation={rot} scale={scale}>
      <mesh geometry={geo} material={unlit || opacity !== undefined ? basic(color, opacity ?? 1) : mat(color)} />
      {line && !unlit && opacity === undefined && <mesh geometry={geo} material={outlineMat()} />}
    </group>
  );

const useCanvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, deps: unknown[]) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

// ---------- Farben (Nacht, nur Notbeleuchtung) ----------
const C = {
  wall: "#747985", wallLow: "#5c606b", floor: "#35343b", stripe: "#c9a23a", ceiling: "#7d7a73", seat: "#33507e", seatBack: "#2b446b",
  head: "#c6c9cf", table: "#6d6a66", frame: "#2c2f36", door: "#a62a2f", doorInner: "#8f2328", rack: "#5b5f68",
  notlicht: "#ffb357", snow: "#6d7e97", snowLit: "#8292aa", tree: "#16231f", treeSnow: "#93a3b9", mast: "#5a5f66", van: "#24252b",
};

// Wand entlang x (Nord/Süd) mit Öffnungen [a, b, z0, z1]
const WallX: React.FC<{ y: [number, number]; open: [number, number, number, number][]; color: string }> = ({ y, open, color }) => {
  const xs = Array.from(new Set([0, RW, ...open.flatMap(([a, b]) => [a, b])])).sort((p, q) => p - q);
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    const o = open.find(([oa, ob]) => oa <= a + 1e-6 && ob >= b - 1e-6);
    if (!o) parts.push(<Box key={i} x={[a, b]} y={y} z={[0, RH]} color={color} />);
    else {
      if (o[2] > 0) parts.push(<Box key={`${i}l`} x={[a, b]} y={y} z={[0, o[2]]} color={C.wallLow} />);
      parts.push(<Box key={`${i}h`} x={[a, b]} y={y} z={[o[3], RH]} color={color} />);
    }
  }
  return <>{parts}</>;
};
// Wand entlang y (West/Ost) mit Türöffnung
const WallY: React.FC<{ x: [number, number]; door: [number, number, number] }> = ({ x, door }) => (
  <>
    <Box x={x} y={[0, door[0]]} z={[0, RH]} color={C.wall} />
    <Box x={x} y={[door[1], RD]} z={[0, RH]} color={C.wall} />
    <Box x={x} y={[door[0], door[1]]} z={[door[2], RH]} color={C.wall} />
  </>
);

// Glas mit Frost an den Rändern
const useFrost = () =>
  useCanvasTex(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 60, 128, 128, 180);
    g.addColorStop(0, "rgba(210,225,240,0.05)");
    g.addColorStop(0.7, "rgba(220,232,245,0.25)");
    g.addColorStop(1, "rgba(235,242,250,0.75)");
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  }, []);
const Glass: React.FC<{ x: [number, number]; y: number; z: [number, number]; frost: THREE.Texture }> = ({ x, y, z, frost }) => (
  <mesh position={W3((x[0] + x[1]) / 2, y, (z[0] + z[1]) / 2)}>
    <planeGeometry args={[x[1] - x[0], z[1] - z[0]]} />
    <meshBasicMaterial map={frost} transparent depthWrite={false} side={THREE.DoubleSide} />
  </mesh>
);

// ================================================================ WAGEN ====
const Wagon: React.FC<{ t: number }> = ({ t }) => {
  const frost = useFrost();
  const winN = plan.windows.filter((w) => w.wall === "nord"), winS = plan.windows.filter((w) => w.wall === "sued");
  const dN = plan.doors.find((d) => d.id === "aussentuer-nord")!, dS = plan.doors.find((d) => d.id === "aussentuer-sued")!;
  const op = (w: { center: number; width: number; sill: number; height: number }) => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height] as [number, number, number, number];
  const door = (d: typeof dN) => [d.center - d.width / 2, d.center + d.width / 2, 0, d.height] as [number, number, number, number];
  const phoneScreen = useCanvasTex(300, 600, (c) => {
    c.fillStyle = "#0e1116"; c.fillRect(0, 0, 300, 600);
    c.fillStyle = "#1f8f4e"; c.fillRect(20, 160, 260, 200);
    c.fillStyle = "#ffffff"; c.font = "bold 30px 'DejaVu Sans', sans-serif"; c.fillText("Unknown", 36, 205);
    c.font = "bold 34px 'DejaVu Sans', sans-serif"; c.fillText("Train", 36, 265); c.fillText("stopped. Keep", 36, 310); c.fillText("them inside.", 36, 350);
    c.font = "26px 'DejaVu Sans', sans-serif"; c.fillStyle = "#c9d1d9"; c.fillText("2:14 AM", 100, 90);
  }, []);
  const lit = t >= sfx.buzz - 0.05 && t <= LINE["22"].end + 1.0; // lights up with the buzz
  return (
    <group>
      {/* Boden, Decke, Gelb-Markierung an der Tür */}
      <Box x={[0, RW]} y={[0, RD]} z={[-0.05, 0]} color={C.floor} />
      <Box x={[dN.center - dN.width / 2, dN.center + dN.width / 2]} y={[RD - 0.12, RD]} z={[0, 0.004]} color={C.stripe} line={false} />
      <Box x={[0, RW]} y={[0, RD]} z={[RH, RH + 0.05]} color={C.ceiling} />
      {/* Notbeleuchtung (einzige Lichtquelle innen) */}
      {FURN.filter((f) => f.id.startsWith("notlicht")).map((f) => (
        <Box key={f.id} x={[f.x, f.x + f.w]} y={[f.y, f.y + f.d]} z={[RH - 0.03, RH]} color={C.notlicht} unlit />
      ))}
      {/* Wände */}
      <WallX y={[RD, RD + 0.08]} open={[...winN.map(op), door(dN)]} color={C.wall} />
      <WallX y={[-0.08, 0]} open={[...winS.map(op), door(dS)]} color={C.wall} />
      <WallY x={[-0.08, 0]} door={[1.4 - 0.45, 1.4 + 0.45, 1.95]} />
      <WallY x={[RW, RW + 0.08]} door={[1.4 - 0.4, 1.4 + 0.4, 1.95]} />
      {/* Fenster: Rahmen + Glas */}
      {[...winN.map((w) => ({ w, y: RD + 0.04 })), ...winS.map((w) => ({ w, y: -0.04 }))].map(({ w, y }) => {
        const [a, b, z0, z1] = op(w);
        return (
          <group key={w.id}>
            <Glass x={[a, b]} y={y} z={[z0, z1]} frost={frost} />
            <Box x={[a, b]} y={[y - 0.05, y + 0.05]} z={[z0 - 0.03, z0]} color={C.frame} />
          </group>
        );
      })}
      {/* Außentüren (rot), je zwei Flügel mit Fenster */}
      {[{ d: dN, y: RD + 0.02 }, { d: dS, y: -0.06 }].map(({ d, y }) =>
        [0, 1].map((k) => {
          const a = d.center - d.width / 2 + k * d.width / 2, b = a + d.width / 2;
          const wa = a + 0.08, wb = b - 0.08;
          return (
            <group key={`${d.id}${k}`}>
              <Box x={[a, wa]} y={[y, y + 0.04]} z={[0, d.height]} color={C.door} />
              <Box x={[wb, b]} y={[y, y + 0.04]} z={[0, d.height]} color={C.door} />
              <Box x={[wa, wb]} y={[y, y + 0.04]} z={[0, 0.85]} color={C.door} />
              <Box x={[wa, wb]} y={[y, y + 0.04]} z={[1.75, d.height]} color={C.door} />
              <Glass x={[wa, wb]} y={y + 0.02} z={[0.85, 1.75]} frost={frost} />
            </group>
          );
        }),
      )}
      {/* Notentriegelung (rot) + Türöffner (aus) */}
      {(() => { const f = furn("notentriegelung"); return (
        <group>
          <Box x={[f.x, f.x + f.w]} y={[RD - 0.06, RD]} z={[1.15, 1.35]} color="#c8202b" />
          <Box x={[f.x + 0.03, f.x + f.w - 0.03]} y={[RD - 0.09, RD - 0.06]} z={[1.2, 1.24]} color="#f2efe8" />
        </group>); })()}
      {(() => { const f = furn("tueroeffner-innen"); return <Solid geo={G.cyl(0.03, 0.02)} at={[f.x + 0.03, RD - 0.01, 1.07]} rot={[Math.PI / 2, 0, 0]} color="#2e4a3a" />; })()}
      {/* Sitzbänke, Tische, Gepäckablagen */}
      {FURN.filter((f) => f.id.startsWith("bank")).map((f) => {
        const facesEast = f.id.includes("-w-");
        const bx: [number, number] = facesEast ? [f.x, f.x + 0.13] : [f.x + f.w - 0.13, f.x + f.w];
        return (
          <group key={f.id}>
            <Box x={[f.x, f.x + f.w]} y={[f.y, f.y + f.d]} z={[0.1, 0.46]} color={C.seat} kind="cloth" />
            <Box x={[f.x + 0.05, f.x + f.w - 0.05]} y={[f.y + 0.05, f.y + f.d - 0.05]} z={[0, 0.1]} color={C.frame} />
            <Box x={bx} y={[f.y, f.y + f.d]} z={[0.46, f.h]} color={C.seatBack} kind="cloth" />
            <Box x={[bx[0] - 0.01, bx[1] + 0.01]} y={[f.y + 0.1, f.y + f.d - 0.1]} z={[f.h - 0.12, f.h - 0.03]} color={C.head} kind="cloth" />
          </group>
        );
      })}
      {FURN.filter((f) => f.id.startsWith("tisch")).map((f) => (
        <group key={f.id}>
          <Box x={[f.x, f.x + f.w]} y={[f.y, f.y + f.d]} z={[f.h - 0.03, f.h]} color={C.table} />
          <Box x={[f.x + 0.12, f.x + f.w - 0.12]} y={[f.y > 1 ? RD - 0.05 : 0, f.y > 1 ? RD : 0.05]} z={[0.3, f.h]} color={C.frame} />
        </group>
      ))}
      {[[0.2, 2.0], [4.0, 5.8], [6.0, 7.8], [8.0, 9.8]].flatMap(([a, b]) => [
        <Box key={`rn${a}`} x={[a, b]} y={[RD - 0.42, RD]} z={[1.88, 1.92]} color={C.rack} />,
        <Box key={`rs${a}`} x={[a, b]} y={[0, 0.42]} z={[1.88, 1.92]} color={C.rack} />,
      ])}
      {/* Brandts Handy auf dem Tisch – leuchtet bei Zeile 21 */}
      {(() => { const f = furn("tisch-B-n"); return (
        <group position={W3(f.x + 0.15, f.y + 0.24, f.h + 0.006)} rotation={[-Math.PI / 2, 0, 0.25]}>
          <mesh geometry={boxGeo} material={mat("#c27c2c")} scale={[0.075, 0.15, 0.01]} />
          <mesh position={[0, 0, 0.0055]}>
            <planeGeometry args={[0.066, 0.136]} />
            {lit ? <meshBasicMaterial map={phoneScreen} /> : <meshBasicMaterial color="#111318" />}
          </mesh>
        </group>); })()}
    </group>
  );
};

// ============================================================== DRAUSSEN ====
const Outside: React.FC<{ t: number }> = ({ t }) => {
  const objs = plan.outside_objects as (Furn & { color?: string })[];
  const snow = useMemo(() => {
    const n = 2600, pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const r = (k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
      seed.set([-12 + r(1) * 26, RD + 0.25 + r(2) * 18, r(3) * 7.5, r(4)], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geo, seed, n };
  }, []);
  // Schneefall: fällt schräg von West nach Ost
  const arr = snow.geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < snow.n; i++) {
    const [x0, y0, z0, ph] = snow.seed.slice(i * 4, i * 4 + 4);
    const fall = (z0 + 7.5 - ((t * 0.9 + ph * 7.5) % 7.5)) % 7.5;
    const p = W3(x0 + ((t * 0.6 + ph * 3) % 6) - 3, y0, GROUND + fall);
    arr.setXYZ(i, p[0], p[1], p[2]);
  }
  arr.needsUpdate = true;
  const showVan = t >= WALK[0].t0;
  const flake = useCanvasTex(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 15); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 32, 32); }, []);
  return (
    <group>
      {/* Schneeboden + Böschung + Gleis */}
      <Box x={[-40, 50]} y={[RD + 0.1, 60]} z={[GROUND - 0.1, GROUND]} color={C.snow} line={false} />
      <Box x={[-40, 50]} y={[-30, -0.1]} z={[GROUND - 0.1, GROUND]} color={C.snow} line={false} />
      <Box x={[-40, 50]} y={[-0.1, RD + 0.1]} z={[GROUND - 0.12, GROUND - 0.02]} color="#4a4d55" line={false} />
      {/* Forstweg */}
      <Box x={[-40, 50]} y={[14.5, 17.5]} z={[GROUND, GROUND + 0.01]} color={C.snowLit} line={false} />
      {/* Wald: Reihen von Fichten (deterministisch) + Plan-Bäume */}
      {[...objs.filter((o) => o.id.startsWith("baum")).map((o) => [o.x + o.w / 2, o.y + o.d / 2, o.h] as const),
        ...Array.from({ length: 60 }, (_, i) => {
          const r = (k: number) => { const x = Math.sin(i * 91.7 + k * 13.1) * 9999.1; return x - Math.floor(x); };
          const y = 6 + r(1) * 30;
          const x = -30 + r(2) * 70;
          // Sichtschneise Tür → Transporter frei halten
          return [x > -2 && x < 8 && y < 19 ? x + 11 : x, y > 14 && y < 18 ? y + 4 : y, 9 + r(3) * 8] as const;
        }),
        ...Array.from({ length: 30 }, (_, i) => {
          const r = (k: number) => { const x = Math.sin(i * 51.3 + k * 7.7) * 9999.1; return x - Math.floor(x); };
          return [-30 + r(2) * 70, -5 - r(1) * 20, 9 + r(3) * 8] as const;
        })].map(([x, y, h], i) => (
        <group key={`tree${i}`}>
          <Solid geo={G.cyl(0.18, 1)} at={[x, y, GROUND + 0.5]} color="#2a2420" line={false} />
          {[0, 1, 2, 3].map((k) => {
            const s = 1 - k * 0.22;
            return (
              <group key={k}>
                <Solid geo={G.cone(1, 1)} at={[x, y, GROUND + 1 + k * h * 0.2 + h * 0.13]} scale={[1.9 * s * (h / 12), h * 0.27, 1.9 * s * (h / 12)]} color={C.tree} />
                <Solid geo={G.cone(1, 1)} at={[x, y, GROUND + 1 + k * h * 0.2 + h * 0.21]} scale={[1.1 * s * (h / 12), h * 0.1, 1.1 * s * (h / 12)]} color={C.treeSnow} line={false} />
              </group>
            );
          })}
        </group>
      ))}
      {/* Signalmast – dunkel (Kabel gekappt) */}
      {(() => { const m = objs.find((o) => o.id === "signalmast")!; return (
        <group>
          <Solid geo={G.cyl(0.07, 4.5)} at={[m.x + 0.15, m.y + 0.15, GROUND + 2.25]} color={C.mast} />
          <Box x={[m.x - 0.05, m.x + 0.35]} y={[m.y, m.y + 0.3]} z={[GROUND + 3.6, GROUND + 4.4]} color="#1d1f24" />
          {[0, 1].map((k) => <Solid key={k} geo={G.cyl(0.08, 0.03)} at={[m.x + 0.15, m.y - 0.01, GROUND + 3.85 + k * 0.3]} rot={[Math.PI / 2, 0, 0]} color="#3a2a2a" line={false} />)}
        </group>); })()}
      {/* Transporter ohne Licht (ab Beat 7) */}
      {showVan && (() => { const v = objs.find((o) => o.id === "transporter")!; return (
        <group>
          <Box x={[v.x, v.x + v.w]} y={[v.y, v.y + v.d]} z={[GROUND + 0.35, GROUND + v.h]} color={C.van} />
          <Box x={[v.x + 0.1, v.x + v.w - 0.1]} y={[v.y + 0.1, v.y + v.d - 0.1]} z={[GROUND + v.h, GROUND + v.h + 0.08]} color={C.treeSnow} />
          <Box x={[v.x + v.w - 0.02, v.x + v.w + 0.01]} y={[v.y + 0.2, v.y + v.d - 0.2]} z={[GROUND + 1.3, GROUND + 1.9]} color="#11151c" />
          {[v.x + 0.9, v.x + v.w - 0.9].map((x) => <Solid key={x} geo={G.cyl(0.36, 0.25)} at={[x, v.y - 0.02, GROUND + 0.36]} rot={[Math.PI / 2, 0, 0]} color="#151518" />)}
        </group>); })()}
      <points geometry={snow.geo}>
        <pointsMaterial color="#eef3f8" size={0.04} map={flake} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
      </points>
    </group>
  );
};

// ================================================================ FIGUREN ====
const fig = (id: string, hands?: { right: HandProp; left: HandProp }): FigureDef => {
  const f = CAST.find((c) => c.id === id)!;
  return hands ? { ...f, hands: { ...f.hands, ...hands } } : f;
};
const EAST = Math.PI / 2, SOUTH = 0;
// Jonas draußen: Fenster B → (Bolzenschneider wegwerfen) → ab Beat 5 an die Tür
const jonasAt = (t: number) => {
  for (const id of ["weg-jonas", "weg-jonas-tuer"]) {
    const p = pathOf(id);
    if (t >= p.t0 && t <= p.t1) { const w = walkPath(id, t); return { pos: w.pos, heading: w.heading, moving: true, dist: w.dist }; }
  }
  const atDoor = t > pathOf("weg-jonas-tuer").t1;
  const pts = pathOf(atDoor ? "weg-jonas-tuer" : "weg-jonas").points;
  return { pos: (t < pathOf("weg-jonas").t0 ? plan.characters.FREMDER.start : pts[pts.length - 1]) as P2, heading: SOUTH, moving: false, dist: 0 };
};

const Cast: React.FC<{ t: number }> = ({ t }) => {
  // Jonas draußen: klopft (Beat 1), Bolzenschneider (Beat 3), wirft ihn weg, sackt zusammen (Beat 6–7)
  const jP = jonasAt(t);
  const jMoving = jP.moving;
  const hasCutter = t >= BEAT[3] - 2 && t < LINE["15"].start + 1.6;
  const knock = knockHit(t) * 0.04 + impactHit(t) * 0.1; // leans into the glass on each hit / slams into the door
  const sag = smooth(t, BEAT[6] + 6, BEAT[7] + 4) * 0.12;
  const climb = smooth(t, pathOf("weg-jonas-tuer").t1, pathOf("weg-jonas-tuer").t1 + 0.6) * 0.3;
  const jonasPos: P2 = jP.pos;
  // Brandt: sitzt (dreht sich zur Tür um), steht ab Beat 5 an der Notentriegelung
  const bPath = pathOf("weg-brandt");
  const bWalk = t >= bPath.t0 && t <= bPath.t1;
  const bP = walkPath("weg-brandt", t);
  const brandtSit = t < bPath.t0;
  const lookBack = brandtSit ? (t < BEAT[4] ? 1.15 * (1 - smooth(t, BEAT[4] - 1.5, BEAT[4])) : 0) : 0;
  const bSeat = furn("bank-B-w-n").seat as P2;
  const brandtPos: P2 = brandtSit ? bSeat : bWalk ? bP.pos : (bPath.points[bPath.points.length - 1] as P2);
  // Hanna: läuft nach vorn, steht dann im Einstiegsraum
  const hPath = pathOf("weg-hanna"), h2 = pathOf("weg-hanna-zurueck");
  const second = t >= h2.t0;
  const hP = walkPath(second ? "weg-hanna-zurueck" : "weg-hanna", t);
  const hWalking = (t >= hPath.t0 && t <= hPath.t1) || (t >= h2.t0 && t <= h2.t1);
  const hannaPos: P2 = t < hPath.t0 ? (plan.characters.HANNA.start as P2) : hP.pos;
  const lSeat = furn("bank-B-w-s").seat as P2;
  const lotteLook = t < BEAT[3] ? -0.9 : t < BEAT[4] ? -1.1 : 0.5;
  return (
    <group>
      <Figure f={fig("jonas", { right: hasCutter ? "boltcutter" : "none", left: "none" })} style={STYLE} scale={FIG_TO_M}
        position={W3(jonasPos[0], jonasPos[1] - knock, GROUND + climb - sag)} rotationY={jMoving ? jP.heading : SOUTH}
        walk={jMoving ? jP.dist * 4 : 0} headYaw={speaking("FREMDER", t) ? 0.08 * Math.sin(t * 5) : 0} lift={-sag} />
      <Figure f={fig("brandt", { right: "none", left: "none" })} style={STYLE} scale={FIG_TO_M}
        position={W3(brandtPos[0], brandtPos[1], 0)} rotationY={brandtSit ? EAST : bWalk ? bP.heading : EAST}
        pose={brandtSit ? "sit" : "stand"} walk={bWalk ? bP.dist * 4.2 : 0}
        torsoYaw={brandtSit ? lookBack * 0.45 : 0} headYaw={brandtSit ? lookBack * 0.9 : t > BEAT[6] && t < BEAT[7] ? 0.9 : 0} />
      <Figure f={fig("lotte")} style={STYLE} scale={FIG_TO_M} position={W3(lSeat[0], lSeat[1], 0)} rotationY={EAST} pose="sit"
        headYaw={lotteLook + (speaking("LOTTE", t) ? 0.06 * Math.sin(t * 6) : 0)} torsoYaw={lotteLook * 0.25} />
      <Figure f={fig("hanna")} style={STYLE} scale={FIG_TO_M} position={W3(hannaPos[0], hannaPos[1], 0)}
        rotationY={hWalking ? hP.heading : t < hPath.t0 ? -EAST : second ? EAST : EAST * 0.6} walk={hWalking ? hP.dist * 4.2 : 0}
        headYaw={!hWalking && t > hPath.t1 && !second ? (t > BEAT[2] && t < BEAT[3] ? -0.7 : 0.2) : 0} />
    </group>
  );
};

// ================================================================ KAMERA ====
type Cam = { id: string; t0: number; t1: number; pos: number[]; yaw: number | number[]; pitch: number; pitch_to?: number; path?: number[][] };
const CAMS = plan.cameras as Cam[];
// Gefahr in der Bildmitte: Zielpunkte je Einstellung (Plan-Koordinaten)
const jonasHead = (t: number): V3 => {
  const p = jonasAt(t).pos;
  const climb = smooth(t, pathOf("weg-jonas-tuer").t1, pathOf("weg-jonas-tuer").t1 + 0.6) * 0.3;
  return [p[0], p[1], GROUND + 1.5 + climb];
};
const target = (id: string, t: number): V3 | null => {
  switch (id) {
    case "K1": case "K2": case "K3": case "K6": return jonasHead(t);
    case "K5": { const j = jonasHead(t), w = lerp(0.35, 1.0, smooth(t, IMPACT - 1.3, IMPACT - 0.15)) * (1 - 0.45 * smooth(t, IMPACT + 1.2, IMPACT + 3.5)); return [lerp(3.8, j[0], w), lerp(2.75, j[1], w), lerp(1.3, j[2], w)]; } // trong giây im lặng máy quay lia về Caleb ở kính khoang B → cú va chạm ở giữa khung
    default: return null;
  }
};
export const camAt = (t: number) => {
  let i = 0;
  while (i + 1 < CAMS.length && t >= CAMS[i + 1].t0) i++;
  const shot = (c: Cam, tt: number) => {
    const u = clamp01((tt - c.t0) / Math.max(0.01, c.t1 - c.t0));
    let pos = c.pos as V3;
    if (c.path) {
      // ME stands up (eye height 1.2 → 1.6 m) and walks to the door in two legs – distance from sfx.json
      const w = alongPath(c.path as P2[], walkDist(tt) / sfx.walk.total);
      pos = [w.pos[0], w.pos[1], lerp(1.2, 1.6, smooth(tt, WALK[0].t0, WALK[0].walk0 + 0.2))];
    }
    const tg = target(c.id, tt);
    let yaw = Array.isArray(c.yaw) ? lerp(c.yaw[0], c.yaw[1], smooth(u, 0.05, 0.6)) : c.yaw;
    let pitch = c.pitch_to !== undefined ? lerp(c.pitch, c.pitch_to, smooth(tt, LINE["22"].start - 0.3, LINE["22"].start + 0.4)) : c.pitch;
    if (tg) {
      yaw = (Math.atan2(tg[0] - pos[0], tg[1] - pos[1]) * 180) / Math.PI;
      pitch = (Math.atan2(tg[2] - pos[2], Math.hypot(tg[0] - pos[0], tg[1] - pos[1])) * 180) / Math.PI;
    }
    if (c.id === "K8") {
      const j = jonasHead(tt);
      yaw = (Math.atan2(j[0] - 0.1 - pos[0], j[1] - pos[1]) * 180) / Math.PI;
      pitch = -11;
    }
    if (c.id === "K7") {
      // leg 1: Caleb at the door in the centre · stop: the dark van through window B · leg 2 → door, Caleb + van centred
      const aim = (p: V3) => [(Math.atan2(p[0] - pos[0], p[1] - pos[1]) * 180) / Math.PI,
        (Math.atan2(p[2] - pos[2], Math.hypot(p[0] - pos[0], p[1] - pos[1])) * 180) / Math.PI];
      const j = jonasHead(tt), v = plan.outside_objects.find((o) => o.id === "transporter")!;
      const [yJ, pJ] = aim(j), [yV, pV] = aim([v.x + v.w / 2, v.y + v.d / 2, GROUND + 1.2]);
      const yF = (Math.atan2(j[0] - 0.1 - pos[0], j[1] - pos[1]) * 180) / Math.PI;
      const kV = smooth(tt, WALK[0].t1 - 0.4, WALK[0].t1 + 0.4) * (1 - smooth(tt, WALK[1].t0 - 0.1, WALK[1].t0 + 0.5));
      const kF = smooth(tt, WALK[1].t1 - 0.7, WALK[1].t1 + 0.2);
      yaw = lerp(lerp(yJ, yV, kV), yF, kF);
      pitch = lerp(lerp(pJ, pV, kV), -11, kF);
    }
    if (c.id === "K4") yaw = t < LINE["22"].start ? -60 : lerp(-60, -88, smooth(tt, LINE["22"].start - 0.3, LINE["22"].start + 0.4));
    return { pos, yaw, pitch };
  };
  const cur = shot(CAMS[i], t);
  const prev = i > 0 ? shot(CAMS[i - 1], t) : cur;
  const k = i === 0 ? 1 : smooth(t, CAMS[i].t0, CAMS[i].t0 + 0.45);
  let yaw = lerp(prev.yaw, cur.yaw, k), pitch = lerp(prev.pitch, cur.pitch, k);
  const pos = [0, 1, 2].map((j) => lerp(prev.pos[j], cur.pos[j], k)) as V3;
  // Handkamera: Atmen, Zittern (Kälte), Schreck beim Klopfen
  const nerv = 0.5 + 0.5 * smooth(t, BEAT[5], BEAT[6]);
  yaw += nerv * (0.45 * Math.sin(t * 1.3) + 0.25 * Math.sin(t * 3.1));
  pitch += nerv * 0.35 * Math.sin(t * 1.7 + 1);
  let roll = 0.5 * Math.sin(t * 0.9);
  // startle on the first knock of each group and on the big impact (same times as the sounds)
  for (const s of sfx.shakes) {
    const d = t - s.t;
    if (d > 0 && d < 0.9) { const a = s.amp * Math.exp(-d * 6); yaw += a * Math.sin(d * 61); pitch += a * Math.sin(d * 47 + 1); roll += a * 0.5 * Math.sin(d * 53); }
  }
  // footsteps: head dips and rolls on every footfall (same times as the step sounds)
  for (const st of STEPS) {
    const b = pulse(t, st.t + 0.04, 0.1) * st.gain;
    pos[2] -= 0.024 * b; pitch -= 0.6 * b; roll += (st.foot === "L" ? -0.7 : 0.7) * b;
  }
  return { pos, yaw, pitch, roll };
};

export const RAW_HFOV = 130;
const VFOV = (2 * Math.atan(Math.tan(deg(RAW_HFOV / 2)) * (9 / 16)) * 180) / Math.PI;
const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const { pos, yaw, pitch, roll } = camAt(t);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...W3(pos[0], pos[1], pos[2]));
    cam.rotation.order = "YXZ";
    cam.rotation.set(deg(pitch), -deg(yaw), deg(roll));
    cam.fov = VFOV; cam.near = 0.03; cam.far = 400;
    cam.updateProjectionMatrix();
  }, [camera, t]);
  return null;
};

// ============================================================= POV-HÄNDE ====
// Ärmel moosgrün (Serienbuch), Handy mit orangem Case. Hände tun immer etwas.
const ICH = { skin: "#dba783", sleeve: "#4f5d3a", case: "#e0662f" };

const PovHands: React.FC<{ t: number }> = ({ t }) => {
  const { pos, yaw, pitch, roll } = camAt(t);
  const rec = useCanvasTex(360, 720, (c) => {
    c.fillStyle = "#0c1016"; c.fillRect(0, 0, 360, 720);
    c.fillStyle = "#e23b3b"; c.beginPath(); c.arc(40, 46, 12, 0, 7); c.fill();
    c.fillStyle = "#fff"; c.font = "bold 28px 'DejaVu Sans', sans-serif"; c.fillText("REC  2:11 AM", 62, 56);
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 3; c.strokeRect(60, 220, 240, 280);
    c.font = "22px 'DejaVu Sans', sans-serif"; c.fillText("Flashlight ON", 100, 680);
  }, []);
  const chat = useCanvasTex(360, 720, (c) => {
    c.fillStyle = "#14161c"; c.fillRect(0, 0, 360, 720);
    c.fillStyle = "#ff4f9a"; c.font = "bold 26px 'DejaVu Sans', sans-serif"; c.fillText("● LIVE  lexi.onthego", 18, 46);
    const msg = (y: number, who: string, txt: string[], col = "#2a2e38") => {
      c.fillStyle = col; c.fillRect(16, y, 328, 30 + txt.length * 30);
      c.fillStyle = "#9aa3b2"; c.font = "18px 'DejaVu Sans', sans-serif"; c.fillText(who, 28, y + 22);
      c.fillStyle = "#fff"; c.font = "bold 24px 'DejaVu Sans', sans-serif"; txt.forEach((s, i) => c.fillText(s, 28, y + 50 + i * 30));
    };
    msg(330, "mia_k", ["lasst ihn rein!!"]);
    msg(420, "anon_4471", ["We see you.", "Car two."], "#5a1c24");
  }, []);
  // Zustände
  const leanWindow = smooth(t, BEAT[3] - 0.2, BEAT[3] + 0.6) * (1 - smooth(t, BEAT[4] - 0.6, BEAT[4]));
  const reach = smooth(t, LINE["21"].start - 0.3, LINE["21"].start + 0.6) * (1 - smooth(t, LINE["22"].start + 0.2, LINE["22"].start + 0.7));
  const low = smooth(t, BEAT[5], BEAT[5] + 0.6) * (1 - smooth(t, BEAT[6], BEAT[6] + 0.5));
  const walking = smooth(t, WALK[0].t0, WALK[0].t0 + 0.5);
  const atDoor = smooth(t, WALK[1].t1 - 0.5, WALK[1].t1 + 0.4);
  const hover = smooth(t, ENDCARD - 0.5, ENDCARD + 0.8);
  const shake = (0.002 + 0.003 * low) * Math.sin(t * 37);
  const showChat = t >= LINE["33"].start;
  const skin = mat(ICH.skin, "skin"), sleeve = mat(ICH.sleeve, "cloth");
  // rechte Hand: Handy (Kamerakoordinaten: x rechts, y oben, z nach hinten)
  const px = 0.15 - 0.03 * walking + 0.08 * atDoor - 0.03 * hover, py = -0.16 - 0.07 * low - 0.01 * walking - 0.03 * atDoor + shake, pz = -0.34;
  const tilt = 0.25 + 0.3 * low + 0.25 * walking;
  // linke Hand: Tischkante → Fensterscheibe → nach Brandts Handy greifen → Sitzlehne/Türkante
  const lx = lerp(lerp(-0.2, -0.05, reach), -0.26, atDoor) + 0.12 * leanWindow, ly = lerp(-0.24, -0.2, reach) + 0.1 * leanWindow + 0.06 * atDoor, lz = lerp(-0.42, -0.55, reach) - 0.05 * leanWindow;
  const arm = (a: THREE.Vector3, b: THREE.Vector3) => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return { pos: a.clone().add(b).multiplyScalar(0.5).toArray() as V3, rot: new THREE.Euler().setFromQuaternion(q), len: a.distanceTo(b) };
  };
  const rA = arm(new THREE.Vector3(px + 0.03, py - 0.06, pz + 0.02), new THREE.Vector3(0.3, -0.5, -0.05));
  const lA = arm(new THREE.Vector3(lx, ly - 0.03, lz + 0.04), new THREE.Vector3(-0.32, -0.5, -0.05));
  const hoverPos: V3 = [lerp(0, 0.12, hover), lerp(0, 0.04, hover), 0];
  return (
    <group position={W3(pos[0], pos[1], pos[2])} rotation={new THREE.Euler(deg(pitch), -deg(yaw), deg(roll), "YXZ")}>
      {/* Handy rechts */}
      <group position={[px, py, pz]} rotation={[tilt, -0.15, 0.05]}>
        <mesh geometry={boxGeo} material={mat(ICH.case)} scale={[0.072, 0.15, 0.01]} />
        <mesh position={[0, 0, 0.0052]}>
          <planeGeometry args={[0.065, 0.138]} />
          <meshBasicMaterial map={showChat ? chat : rec} />
        </mesh>
        {/* Taschenlampen-Kegel nach vorn (aus der Rückseite) */}
        {!showChat && (
          <mesh position={[0.02, 0.06, -1.6]} rotation={[-Math.PI / 2 + 0.05, 0, 0]}>
            <coneGeometry args={[0.55, 3.2, 32, 1, true]} />
            <meshBasicMaterial color="#fff2d6" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}
        <group position={[0.045, -0.055, -0.012]}>
          <mesh geometry={G.sphere(1)} material={skin} scale={[0.028, 0.052, 0.024]} />
          <mesh geometry={G.capsule(0.0105, 0.03)} material={skin} position={[-0.018, 0.02, 0.019]} rotation={[0.15, 0, 1.1]} />
          {[0, 1, 2, 3].map((k) => <mesh key={k} geometry={G.capsule(0.0085, 0.026)} material={skin} position={[-0.012, 0.03 - k * 0.019, -0.016]} rotation={[0, 0, 1.45]} />)}
        </group>
      </group>
      <mesh geometry={G.capsule(0.045, rA.len)} material={sleeve} position={rA.pos} rotation={rA.rot} />
      {/* linke Hand: flach aufgelegt / greifend */}
      <group position={[lx + hoverPos[0], ly + hoverPos[1], lz]} rotation={[lerp(-1.2, -0.4, reach) + 0.9 * leanWindow, 0.3, 0.2]}>
        <mesh geometry={G.sphere(1)} material={skin} scale={[0.045, 0.012 + 0.01 * reach, 0.05]} />
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} geometry={G.capsule(0.009, 0.045)} material={skin} position={[-0.03 + k * 0.02, 0, -0.06]} rotation={[Math.PI / 2 - 0.5 * reach, 0, (k - 1.5) * 0.08]} />
        ))}
        <mesh geometry={G.capsule(0.01, 0.035)} material={skin} position={[0.045, 0, -0.02]} rotation={[Math.PI / 2, 0, -0.7]} />
      </group>
      <mesh geometry={G.capsule(0.045, lA.len)} material={sleeve} position={lA.pos} rotation={lA.rot} />
    </group>
  );
};

// Klopfende Hand von außen auf dem Türfenster (Frame 0: Gefahr sofort sichtbar)
const KnockHand: React.FC<{ t: number }> = ({ t }) => {
  // on the glass in beat 1, at the door from beat 6 to the end card, and for the slam (impact)
  const on = t < LINE["03"].end + 0.5 || t > BEAT[6] - 0.5 || Math.abs(t - IMPACT) < 1.2;
  if (!on) return null;
  const hit = Math.max(knockHit(t), Math.min(1, impactHit(t) * 1.4));
  const skin = mat("#c68a62", "skin");
  const j = jonasAt(t).pos;
  const x = t < BEAT[5] ? j[0] + 0.24 : j[0] + 0.24;
  return (
    <group position={W3(x, RD + 0.12 + 0.05 * (1 - hit), 1.12)}>
      <mesh geometry={G.sphere(1)} material={skin} scale={[0.05, 0.065, 0.02]} />
      {[0, 1, 2, 3].map((k) => <mesh key={k} geometry={G.capsule(0.01, 0.05)} material={skin} position={[-0.03 + k * 0.02, 0.075, 0]} />)}
    </group>
  );
};

// ================================================================= SZENE ====
export const NachtzugRaw: React.FC<{ at?: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  setLowPoly(false);
  const t = at ?? frame / FPS;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#0b1220 0%,#16223a 55%,#2a3a55 100%)", filter: STYLE.grade }}>
      <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: VFOV, near: 0.03, far: 400 }}>
        <CameraRig t={t} />
        <Wagon t={t} />
        <Outside t={t} />
        <Cast t={t} />
        <KnockHand t={t} />
        <PovHands t={t} />
      </ThreeCanvas>
      {/* Nacht: kühle Multiplikation über alles */}
      <AbsoluteFill style={{ background: "#9aa6c6", mixBlendMode: "multiply", pointerEvents: "none" }} />
      {/* Notlicht-Stimmung: warmer Schein von oben, kalte Ränder */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,170,80,.16), rgba(0,0,0,0) 70%), radial-gradient(ellipse 90% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(5,10,25,.45) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
