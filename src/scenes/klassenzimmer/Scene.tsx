import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import plan from "../../../locations/klassenzimmer/plan.json";
import { G, makeOutline, makeToon, setLowPoly, type Kind } from "../../character/materials";
import { KANAL_STIL, richtung } from "../../stile/richtungen";
import type { JunoStyle } from "../../juno/styles";
import { CAST } from "../../cast/cast";
import { Figure, FIG_TO_M } from "../../cast/Figure";
import { EVENTS, FPS } from "./timeline";

// Stilprobe: Szene kann mit einer anderen Stilrichtung gerendert werden (src/stile/richtungen.ts)
let STYLE: JunoStyle = KANAL_STIL; // Kanal-Stil D · Comic-Linie
type V3 = [number, number, number];
type P2 = [number, number];

// Plan-Koordinaten (x Ost, y Nord, z oben) → Three (x, y oben, z Süd)
const W3 = (x: number, y: number, z = 0): V3 => [x, z, -y];
const deg = (d: number) => (d * Math.PI) / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number, a: number, b: number) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------- Plan-Hilfen ----------
type Furn = { id: string; type: string; x: number; y: number; w: number; d: number; h: number; seat?: number[] };
const FURN = plan.furniture as Furn[];
const seatOf = (key: string): P2 => {
  const ch = (plan.characters as Record<string, { seat?: string; start?: number[] }>)[key];
  if (ch.seat) return FURN.find((f) => f.id === ch.seat)!.seat as P2;
  return ch.start as P2;
};
const pathOf = (id: string) => (plan.paths as { id: string; points: number[][] }[]).find((p) => p.id === id)!.points as P2[];

// Position + Laufrichtung entlang eines Wegs (u = 0..1 über die Gesamtlänge)
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

// ---------- Material-Cache ----------
const matCache = new Map<string, THREE.Material>();
const mat = (color: string, kind: Kind = "other", ds = false) => {
  const k = `${STYLE.id}|${color}|${kind}|${ds}`;
  if (!matCache.has(k)) matCache.set(k, makeToon(STYLE, color, ds, kind));
  return matCache.get(k)!;
};
const basic = (color: string, opacity = 1) => {
  const k = `b${color}|${opacity}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide }));
  return matCache.get(k)!;
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

// Box in Plan-Koordinaten: [x0..x1] × [y0..y1] × [z0..z1]
const outlineMat = () => {
  const k = `o${STYLE.id}`;
  if (!matCache.has(k)) matCache.set(k, makeOutline(STYLE, "#000", 0.015));
  return matCache.get(k)!;
};
const Box: React.FC<{ x: [number, number]; y: [number, number]; z: [number, number]; color: string; kind?: Kind; unlit?: boolean; opacity?: number }> = ({ x, y, z, color, kind = "other", unlit, opacity }) => {
  const lit = !unlit && opacity === undefined;
  const props = { geometry: boxGeo, position: W3((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2), scale: [x[1] - x[0], z[1] - z[0], y[1] - y[0]] as V3 };
  return (
    <>
      <mesh {...props} material={lit ? mat(color, kind) : basic(color, opacity ?? 1)} />
      {lit && STYLE.outline.width > 0 && <mesh {...props} material={outlineMat()} />}
    </>
  );
};

// Text-Texturen (Canvas)
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

// ================================================================= RAUM ====
const C = {
  wall: "#dfe3d3", floor: "#b48d63", ceiling: "#f2efe7", desk: "#cfae84", deskLeg: "#6d7176", chair: "#7f93a6",
  cabinet: "#c9b28e", door: "#9c7350", frame: "#f4f2ec", radiator: "#ecebe6", cork: "#b98a5a",
};

const Room: React.FC<{ t: number }> = ({ t }) => {
  const { w: RW, d: RD, h: RH } = plan.size;
  const board = useCanvasTex(1500, 600, (c) => {
    c.fillStyle = "#fbfbf8"; c.fillRect(0, 0, 1500, 600);
    c.fillStyle = "#24407a"; c.font = "bold 92px 'DejaVu Sans', sans-serif"; c.fillText("Industrielle Revolution", 70, 150);
    c.fillStyle = "#2a2a2e"; c.font = "54px 'DejaVu Sans', sans-serif";
    ["• ca. 1750 – 1850, England", "• Dampfmaschine (James Watt)", "• Fabriken & Städte wachsen"].forEach((s, i) => c.fillText(s, 90, 270 + i * 90));
    c.fillStyle = "#b5532a"; c.font = "bold 60px 'DejaVu Sans', sans-serif"; c.fillText("→ TEST!", 1150, 520);
  }, []);
  const clock = useCanvasTex(256, 256, (c) => {
    c.fillStyle = "#fbfaf5"; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill();
    c.lineWidth = 10; c.strokeStyle = "#2a2a2e"; c.stroke();
    c.lineWidth = 9; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 55 * Math.sin(5.2), 128 - 55 * Math.cos(5.2)); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 90 * Math.sin(1.2), 128 - 90 * Math.cos(1.2)); c.stroke();
  }, []);

  const wins = plan.windows.map((w) => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height] as const);
  const doors = plan.doors.map((d) => [d.center - d.width / 2, d.center + d.width / 2, d.height] as const);

  // Westwand mit Fensteröffnungen
  const westCuts = [0, ...wins.flatMap(([a, b]) => [a, b]), RD];
  const westSolid: [number, number][] = [];
  for (let i = 0; i < westCuts.length; i += 2) westSolid.push([westCuts[i], westCuts[i + 1]]);
  const eastCuts = [0, ...[...doors].sort((a, b) => a[0] - b[0]).flatMap(([a, b]) => [a, b]), RD];
  const eastSolid: [number, number][] = [];
  for (let i = 0; i < eastCuts.length; i += 2) eastSolid.push([eastCuts[i], eastCuts[i + 1]]);

  return (
    <group>
      {/* Boden, Decke */}
      <Box x={[0, RW]} y={[0, RD]} z={[-0.05, 0]} color={C.floor} />
      <Box x={[0, RW]} y={[0, RD]} z={[RH, RH + 0.05]} color={C.ceiling} />
      {[[1.5, 2.2], [4, 2.2], [6.5, 2.2], [1.5, 5.2], [4, 5.2], [6.5, 5.2]].map(([x, y], i) => (
        <Box key={i} x={[x - 0.6, x + 0.6]} y={[y - 0.15, y + 0.15]} z={[RH - 0.02, RH]} color="#fffdf4" unlit />
      ))}
      {/* Nord- und Südwand */}
      <Box x={[-0.3, RW + 0.175]} y={[RD, RD + 0.175]} z={[0, RH]} color={C.wall} />
      <Box x={[-0.3, RW + 0.175]} y={[-0.175, 0]} z={[0, RH]} color={C.wall} />
      {/* Westwand (Fenster) */}
      {westSolid.map(([a, b], i) => <Box key={`ws${i}`} x={[-0.3, 0]} y={[a, b]} z={[0, RH]} color={C.wall} />)}
      {wins.map(([a, b, s, t], i) => (
        <group key={`w${i}`}>
          <Box x={[-0.3, 0]} y={[a, b]} z={[0, s]} color={C.wall} />
          <Box x={[-0.3, 0]} y={[a, b]} z={[t, RH]} color={C.wall} />
          {/* Rahmen + Mittelpfosten + Fensterbank */}
          <Box x={[-0.2, -0.12]} y={[a, a + 0.06]} z={[s, t]} color={C.frame} />
          <Box x={[-0.2, -0.12]} y={[b - 0.06, b]} z={[s, t]} color={C.frame} />
          <Box x={[-0.2, -0.12]} y={[(a + b) / 2 - 0.035, (a + b) / 2 + 0.035]} z={[s, t]} color={C.frame} />
          <Box x={[-0.2, -0.12]} y={[a, b]} z={[t - 0.06, t]} color={C.frame} />
          <Box x={[-0.3, 0.05]} y={[a - 0.03, b + 0.03]} z={[s - 0.03, s]} color={C.frame} />
          <Box x={[-0.17, -0.16]} y={[a, b]} z={[s, t]} color="#cfe6f3" opacity={0.1} />
        </group>
      ))}
      {/* Ostwand mit Türen */}
      {eastSolid.map(([a, b], i) => <Box key={`es${i}`} x={[RW, RW + 0.175]} y={[a, b]} z={[0, RH]} color={C.wall} />)}
      {doors.map(([a, b, h], i) => (
        <group key={`d${i}`}>
          <Box x={[RW, RW + 0.175]} y={[a, b]} z={[h, RH]} color={C.wall} />
          <Box x={[RW + 0.02, RW + 0.07]} y={[a + 0.04, b - 0.04]} z={[0, h - 0.03]} color={C.door} />
          <Box x={[RW - 0.03, RW + 0.02]} y={[a - 0.06, a]} z={[0, h + 0.06]} color={C.frame} />
          <Box x={[RW - 0.03, RW + 0.02]} y={[b, b + 0.06]} z={[0, h + 0.06]} color={C.frame} />
          <Box x={[RW - 0.03, RW + 0.02]} y={[a - 0.06, b + 0.06]} z={[h, h + 0.06]} color={C.frame} />
          {/* Klinke auf der Seite gegenüber dem Scharnier */}
          <Box x={[RW - 0.05, RW + 0.02]} y={i === 0 ? [a + 0.08, a + 0.22] : [b - 0.22, b - 0.08]} z={[1.02, 1.06]} color="#9aa0a6" />
          {/* Glasausschnitt */}
          <Box x={[RW + 0.015, RW + 0.075]} y={[(a + b) / 2 - 0.15, (a + b) / 2 + 0.15]} z={[1.3, 1.9]} color="#cfe6f3" opacity={0.35} />
        </group>
      ))}
      {/* Tafel + Uhr + Pinnwand */}
      <mesh position={W3(4.0, 7.445, 1.5)}>
        <planeGeometry args={[3.0, 1.2]} />
        <meshBasicMaterial map={board} />
      </mesh>
      <Box x={[2.47, 5.53]} y={[7.45, 7.5]} z={[0.87, 2.13]} color="#9aa0a6" />
      <Box x={[2.6, 5.4]} y={[7.36, 7.45]} z={[0.86, 0.9]} color="#9aa0a6" />
      <mesh position={W3(4.0, 7.48, 2.5)}>
        <circleGeometry args={[0.17, 48]} />
        <meshBasicMaterial map={clock} />
      </mesh>
      <Box x={[0.4, 4.2]} y={[0, 0.02]} z={[1.2, 2.2]} color={C.cork} />
      {[["#f2e7c9", 0.6, 1.45], ["#e8907a", 1.3, 1.7], ["#8fd1b4", 2.1, 1.4], ["#a99bd0", 2.9, 1.75], ["#f2e7c9", 3.6, 1.5]].map(([c, x, z], i) => (
        <Box key={i} x={[x as number, (x as number) + 0.45]} y={[0.02, 0.03]} z={[z as number, (z as number) + 0.32]} color={c as string} />
      ))}
      {/* Möbel aus plan.json */}
      {FURN.map((f) => {
        const m = (plan as { moves?: { id: string; at: number; dx: number; dy: number }[] }).moves?.find((x) => x.id === f.id);
        const k = m ? smooth(t, m.at, m.at + 0.25) : 0;
        return <Furniture key={f.id} f={m ? { ...f, x: f.x + m.dx * k, y: f.y + m.dy * k } : f} />;
      })}
    </group>
  );
};

const Furniture: React.FC<{ f: Furn }> = ({ f }) => {
  const x: [number, number] = [f.x, f.x + f.w], y: [number, number] = [f.y, f.y + f.d];
  const legs = (h: number, c: string, inset = 0.04, t = 0.035) =>
    [[x[0] + inset, y[0] + inset], [x[1] - inset - t, y[0] + inset], [x[0] + inset, y[1] - inset - t], [x[1] - inset - t, y[1] - inset - t]].map(([lx, ly], i) => (
      <Box key={i} x={[lx, lx + t]} y={[ly, ly + t]} z={[0, h]} color={c} />
    ));
  if (f.id.startsWith("tisch") || f.id === "lehrertisch")
    return (
      <group>
        <Box x={x} y={y} z={[f.h - 0.04, f.h]} color={C.desk} />
        {legs(f.h - 0.04, C.deskLeg)}
        {f.id === "lehrertisch" && <Box x={[x[0] + 0.05, x[1] - 0.05]} y={[y[0], y[0] + 0.03]} z={[0.25, f.h - 0.04]} color={C.cabinet} />}
      </group>
    );
  if (f.id.startsWith("stuhl") || f.id === "lehrerstuhl") {
    const back = f.id === "lehrerstuhl" ? [y[1] - 0.04, y[1]] : [y[0], y[0] + 0.04];
    return (
      <group>
        <Box x={x} y={y} z={[0.44, 0.48]} color={C.chair} />
        <Box x={[x[0] + 0.02, x[1] - 0.02]} y={back as [number, number]} z={[0.55, f.h]} color={C.chair} />
        {legs(0.44, C.deskLeg, 0.02, 0.03)}
      </group>
    );
  }
  if (f.id === "schraenke")
    return (
      <group>
        <Box x={x} y={y} z={[0, f.h]} color={C.cabinet} />
        {[1, 2, 3].map((i) => <Box key={i} x={[x[0] + i - 0.005, x[0] + i + 0.005]} y={[y[1], y[1] + 0.005]} z={[0.02, f.h - 0.02]} color="#8d7a5f" />)}
      </group>
    );
  if (f.id === "garderobe")
    return (
      <group>
        <Box x={[x[1] - 0.03, x[1]]} y={y} z={[1.45, 1.6]} color={C.cabinet} />
        {["#3e4a66", "#c8433a", "#5f6446", "#a99bd0", "#24242a", "#d2a23a", "#2f4a3a"].map((c, i) => (
          <Box key={i} x={[x[0] + 0.02, x[1] - 0.03]} y={[y[0] + 0.15 + i * 0.45, y[0] + 0.5 + i * 0.45]} z={[0.75, 1.55]} color={c} kind="cloth" />
        ))}
      </group>
    );
  if (f.id === "muelleimer") return <Box x={x} y={y} z={[0, f.h]} color="#5d6066" />;
  if (f.id.startsWith("heizkoerper"))
    return (
      <group>
        {Array.from({ length: 12 }).map((_, i) => (
          <Box key={i} x={[x[0], x[1]]} y={[y[0] + i * (f.d / 12), y[0] + i * (f.d / 12) + f.d / 18]} z={[0.12, f.h]} color={C.radiator} />
        ))}
      </group>
    );
  if (f.id === "tafel") return null; // eigene Darstellung oben
  return <Box x={x} y={y} z={[0, f.h]} color="#bbbbbb" />;
};

// ============================================================== DRAUSSEN ====
const Outside: React.FC = () => {
  const houses = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({ y: -120 + i * 26, w: 14 + ((i * 7) % 9), h: 9 + ((i * 5) % 8), c: ["#cdbfa7", "#b9a891", "#d8ccb6", "#a99a86"][i % 4] })),
    [],
  );
  return (
    <group>
      <Box x={[-400, -0.3]} y={[-300, 400]} z={[-6.05, -6]} color="#9fae86" />
      <Box x={[-60, -0.3]} y={[-40, 60]} z={[-6.0, -5.98]} color="#b0aca2" />
      {[[-30, -30], [-60, 70], [-18, -45], [-45, -60]].map(([x, y], i) => (
        <group key={i}>
          <Box x={[x - 0.4, x + 0.4]} y={[y - 0.4, y + 0.4]} z={[-6, -1]} color="#6b5440" />
          <mesh geometry={G.sphere(4)} material={mat("#6f8a5a", "cloth")} position={W3(x, y, 1.5)} />
        </group>
      ))}
      {houses.map((h, i) => (
        <group key={i}>
          <Box x={[-160, -160 + h.w]} y={[h.y, h.y + 18]} z={[-6, -6 + h.h]} color={h.c} />
          <Box x={[-161, -159 + h.w]} y={[h.y - 1, h.y + 19]} z={[-6 + h.h, -4 + h.h]} color="#8c5a48" />
        </group>
      ))}
    </group>
  );
};

const Jet: React.FC<{ t: number }> = ({ t }) => {
  const [a1, b1] = EVENTS.jet1, [a2, b2] = EVENTS.jet2;
  let y: number, dir: 1 | -1;
  if (t <= b1 + 0.5) { y = lerp(36, 230, (t - a1) / (b1 - a1)); dir = 1; }
  else if (t >= a2 - 0.5) { y = lerp(120, -40, (t - a2) / (b2 - a2)); dir = -1; }
  else return null;
  const X = -60, Z = 14; // 60 m vor der Westwand, 20 m über dem Boden (Raumboden liegt 6 m hoch)
  const rot: V3 = [0, dir === 1 ? 0 : Math.PI, dir * -0.12];
  return (
    <group position={W3(X, y, Z)} rotation={rot}>
      {/* Spitze zeigt nach −Z (= Norden) */}
      <mesh geometry={G.capsule(0.75, 12)} material={mat("#7d848c")} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={G.cone(0.75, 3)} material={mat("#6f767e")} position={[0, 0, -7.4]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={G.sphere(1)} material={mat("#2a3440")} position={[0, 0.65, -3.5]} scale={[0.55, 0.45, 1.6]} />
      <mesh geometry={boxGeo} material={mat("#737a82")} position={[0, -0.1, 0.8]} scale={[10, 0.25, 3.6]} />
      <mesh geometry={boxGeo} material={mat("#737a82")} position={[0, 0.1, 6]} scale={[4.6, 0.2, 1.8]} />
      {[-1, 1].map((s) => <mesh key={s} geometry={boxGeo} material={mat("#737a82")} position={[s * 0.9, 1.5, 5.6]} rotation={[0, 0, s * 0.35]} scale={[0.2, 2.6, 2]} />)}
      {/* Kondensstreifen */}
      {[-0.5, 0.5].map((s) => (
        <mesh key={s} geometry={G.cyl(0.35, 140)} material={basic("#ffffff", 0.55)} position={[s, 0, 76]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
    </group>
  );
};

// ================================================================= FIGUREN ====
const CHAR_FIG: Record<string, string> = { TEACHER: "weber", CAROL: "carol", RAFA: "rafa", LEO: "leo", BIA: "bia", THIAGO: "thiago" };
const NORTH = Math.PI; // Blickrichtung Tafel

type CharState = { pos: P2; rotY: number; pose: "sit" | "stand"; walk: number; headYaw: number; lift: number; torso: number };

const charState = (key: string, t: number): CharState => {
  const seat = seatOf(key);
  const base: CharState = { pos: seat, rotY: NORTH, pose: "sit", walk: 0, headYaw: 0, lift: 0, torso: 0 };
  // 0→1→0-Hüllkurve für eine Drehung von a..b, zurück c..d
  const env = (a: number, b: number, c = 1e9, d = 1e9 + 1) => smooth(t, a, b) * (1 - smooth(t, c, d));
  const turn = (to: number, a: number, b: number, back?: number, c?: number, d?: number) => {
    let r = lerp(NORTH, to, smooth(t, a, b));
    if (back !== undefined && c !== undefined && d !== undefined) r = lerp(r, back, smooth(t, c, d));
    return r;
  };
  switch (key) {
    case "TEACHER": {
      const [a, b] = EVENTS.weberWalk;
      if (t < a) return { ...base, pose: "stand", rotY: 0, headYaw: 0.25 * Math.sin(t * 0.8) };
      const u = (t - a) / (b - a);
      const p = alongPath(pathOf("weg-weber"), u);
      const moving = u < 1;
      return { ...base, pose: "stand", pos: p.pos, rotY: moving ? p.heading : -0.35, walk: moving ? p.dist * 5.5 : 0, headYaw: moving ? 0 : -0.3 };
    }
    // Sitzend dreht nur der Oberkörper; ganze Drehungen nur mit Beinen in den freien Gang (plan.json → seated_turns)
    case "CAROL":
      return { ...base, torso: 0.75 * env(EVENTS.bang + 0.05, EVENTS.bang + 0.35), lift: t > EVENTS.bang && t < EVENTS.bang + 0.35 ? 0.08 * Math.sin(((t - EVENTS.bang) / 0.35) * Math.PI) : 0, headYaw: -0.3 * env(4.2, 4.5) };
    case "RAFA": {
      const k = env(6.2, 6.6, 8.7, 9.2);
      return { ...base, rotY: NORTH + (Math.PI / 2) * k, torso: 0.42 * k, headYaw: 0.25 * k };
    }
    case "BIA": {
      const k = env(14.5, 15.0, 17.8, 18.3);
      return { ...base, rotY: NORTH - (Math.PI / 2) * k, torso: -1.2 * k, headYaw: -0.4 * k };
    }
    case "THIAGO":
      return { ...base, torso: 0.55 * env(17.5, 17.9), headYaw: 0.4 * env(17.9, 18.2) };
    case "LEO": {
      const [r0, r1] = EVENTS.leoRise, [g0, g1] = EVENTS.leoRun;
      if (t < r0) return { ...base, torso: 0.9 * env(8.6, 9.0, 11.4, 11.9), headYaw: 0.35 * env(8.8, 9.1, 11.3, 11.6) };
      if (t < g0) return { ...base, pose: "stand", rotY: NORTH + 0.4, lift: -0.25 * (1 - smooth(t, r0, r1)) };
      const u = (t - g0) / (g1 - g0);
      const p = alongPath(pathOf("weg-leo"), u);
      return { ...base, pose: "stand", pos: p.pos, rotY: u < 1 ? p.heading : -Math.PI / 2, walk: u < 1 ? p.dist * 4.2 : 0 };
    }
  }
  return base;
};

const Cast: React.FC<{ t: number }> = ({ t }) => (
  <group>
    {Object.keys(CHAR_FIG).map((key) => {
      const f = CAST.find((c) => c.id === CHAR_FIG[key])!;
      const s = charState(key, t);
      return (
        <Figure key={key} f={f} style={STYLE} scale={FIG_TO_M} position={W3(s.pos[0], s.pos[1], 0)} rotationY={s.rotY}
          pose={s.pose} walk={s.walk} headYaw={s.headYaw} lift={s.lift} torsoYaw={s.torso} />
      );
    })}
  </group>
);

// ================================================================= KAMERA ====
const CAM_POS = plan.cameras[0].pos as V3; // alle Einstellungen: Sitzplatz ICH
const angleTo = (p: P2) => (Math.atan2(p[0] - CAM_POS[0], p[1] - CAM_POS[1]) * 180) / Math.PI;

// Kamera-Segmente: ab t0 (Übergang bis t1) gilt das Ziel
const SHOTS: { t0: number; t1: number; yaw: (t: number) => number; pitch: number }[] = [
  { t0: -1, t1: 0, yaw: () => -22, pitch: -14 }, // K1
  { t0: 4.25, t1: 4.6, yaw: () => -55, pitch: -6 }, // K2 Carol
  { t0: 6.25, t1: 6.6, yaw: () => 62, pitch: -6 }, // K3 Rafa
  { t0: 8.6, t1: 9.0, yaw: () => 92, pitch: -12 }, // K4 Leo
  { t0: 11.45, t1: 11.85, yaw: (t) => angleTo(charState("TEACHER", t).pos), pitch: -1 }, // K5 Weber verfolgen
  { t0: 14.7, t1: 15.1, yaw: () => 15, pitch: -4 }, // K6 Bia
  { t0: 17.55, t1: 17.95, yaw: () => -88, pitch: -4 }, // K7 Thiago
  { t0: 20.45, t1: 20.85, yaw: (t) => { const a = angleTo(charState("LEO", t).pos); return a < 0 ? a + 360 : a; }, pitch: 2 }, // K8 Leo verfolgen
];

export const camAt = (t: number) => {
  let i = 0;
  while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t0) i++;
  const cur = SHOTS[i], prev = SHOTS[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : smooth(t, cur.t0, cur.t1);
  let yaw = lerp(prev.yaw(t), cur.yaw(t), k);
  let pitch = lerp(prev.pitch, cur.pitch, k);
  // Handkamera-Atmen + Erschütterung beim Knall
  yaw += 0.35 * Math.sin(t * 1.3) + 0.2 * Math.sin(t * 2.9);
  pitch += 0.3 * Math.sin(t * 1.7 + 1);
  let roll = 0.4 * Math.sin(t * 0.9);
  const db = t - EVENTS.bang;
  if (db > 0 && db < 0.8) {
    const a = 3.2 * Math.exp(-db * 5);
    yaw += a * Math.sin(db * 61); pitch += a * Math.sin(db * 47 + 1); roll += a * 0.6 * Math.sin(db * 53);
  }
  return { yaw, pitch, roll };
};

// Raw-Render: rechtwinklige Weitwinkel-Projektion, 130° horizontal → später Fisheye per ffmpeg v360
export const RAW_HFOV = 130;
const VFOV = (2 * Math.atan(Math.tan(deg(RAW_HFOV / 2)) * (9 / 16)) * 180) / Math.PI;

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const { yaw, pitch, roll } = camAt(t);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...W3(CAM_POS[0], CAM_POS[1], CAM_POS[2]));
    cam.rotation.order = "YXZ";
    cam.rotation.set(deg(pitch), -deg(yaw), deg(roll));
    cam.fov = VFOV;
    cam.near = 0.03;
    cam.far = 900;
    cam.updateProjectionMatrix();
  }, [camera, t]);
  return null;
};

// ============================================================ POV-HÄNDE ====
const ICH = { skin: "#dba783", sleeve: "#56606e" };

const PovHands: React.FC<{ t: number }> = ({ t }) => {
  const { yaw, pitch, roll } = camAt(t);
  const screen = useCanvasTex(360, 720, (c) => {
    c.fillStyle = "#b8302a"; c.fillRect(0, 0, 360, 720);
    c.fillStyle = "#ffffff"; c.textAlign = "center";
    c.font = "bold 120px 'DejaVu Sans', sans-serif"; c.fillText("⚠", 180, 190);
    c.font = "bold 50px 'DejaVu Sans', sans-serif"; c.fillText("EXTREME", 180, 300); c.fillText("GEFAHR", 180, 360);
    c.font = "28px 'DejaVu Sans', sans-serif";
    ["Luftraumwarnung", "Bleiben Sie im Gebäude.", "Halten Sie sich von", "Fenstern fern."].forEach((s, i) => c.fillText(s, 180, 450 + i * 42));
  }, []);
  // Zustände: halten (0–11.6, 15–20.6), unter den Tisch schieben (11.6–15), gesenkt beim Umdrehen (ab 20.6)
  const hide = smooth(t, 11.7, 12.3) * (1 - smooth(t, 14.9, 15.4));
  const low = smooth(t, 20.5, 20.9);
  const buzz = t < EVENTS.phoneBuzz[1] && Math.floor(t * 4) % 2 === 0 ? 0.003 * Math.sin(t * 380) : 0;
  const py = -0.1 - 0.28 * hide - 0.1 * low + buzz;
  const pz = -0.32 + 0.04 * hide;
  const tilt = 0.5 + 0.45 * hide + 0.25 * low;
  const skin = mat(ICH.skin, "skin"), sleeve = mat(ICH.sleeve, "cloth");
  // Unterarme: vom Handgelenk schräg nach unten-hinten aus dem Bild (Kamerakoordinaten)
  const arm = (s: number) => {
    const a = new THREE.Vector3(s * 0.06, py - 0.06, pz + 0.02), b = new THREE.Vector3(s * 0.24, py - 0.42, pz + 0.2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return { pos: a.clone().add(b).multiplyScalar(0.5).toArray() as V3, rot: new THREE.Euler().setFromQuaternion(q), len: a.distanceTo(b) };
  };
  return (
    <group position={W3(CAM_POS[0], CAM_POS[1], CAM_POS[2])} rotation={new THREE.Euler(deg(pitch), -deg(yaw), deg(roll), "YXZ")}>
      <group position={[0, py, pz]} rotation={[tilt, 0, 0]}>
        {/* Handy */}
        <mesh geometry={boxGeo} material={mat("#1d1d22")} scale={[0.072, 0.15, 0.009]} />
        <mesh position={[0, 0, 0.0047]}>
          <planeGeometry args={[0.065, 0.138]} />
          <meshBasicMaterial map={screen} />
        </mesh>
        {/* Hände umfassen das Handy seitlich, Daumen vorn am Rand */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.049, -0.062, -0.014]}>
            <mesh geometry={G.sphere(1)} material={skin} scale={[0.028, 0.052, 0.024]} />
            <mesh geometry={G.capsule(0.0105, 0.03)} material={skin} position={[-s * 0.014, 0.012, 0.019]} rotation={[0.15, 0, s * 1.1]} />
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} geometry={G.capsule(0.0085, 0.026)} material={skin} position={[-s * 0.012, 0.03 - k * 0.019, -0.016]} rotation={[0, 0, s * 1.45]} />
            ))}
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => {
        const a = arm(s);
        return (
          <group key={s}>
            <mesh geometry={G.capsule(0.045, a.len)} material={sleeve} position={a.pos} rotation={a.rot} />
            <mesh geometry={G.cyl(0.03, 0.05)} material={skin} position={[s * 0.058, py - 0.045, pz + 0.01]} rotation={a.rot} />
          </group>
        );
      })}
    </group>
  );
};

// ================================================================== SZENE ====
export const KlassenzimmerRaw: React.FC<{ stil?: string; at?: number }> = ({ stil, at }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const r = stil ? richtung(stil) : KANAL_STIL;
  STYLE = r ?? KANAL_STIL;
  setLowPoly(false);
  const t = at ?? frame / FPS;
  return (
    <AbsoluteFill style={{ background: r.sky, filter: r.grade }}>
      <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: VFOV, near: 0.03, far: 900 }}>
        <CameraRig t={t} />
        <Room t={t} />
        <Outside />
        <Jet t={t} />
        <Cast t={t} />
        <PovHands t={t} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
