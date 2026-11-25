// The Neighbor Next Door · Episode 1 "Midnight" – căn 4B + hành lang tầng 4 (POV, style D, English/US)
// Hình học: locations/maple-court-4b/plan.json + locations/maple-court-flur4/plan.json (toạ độ hành lang; 4B lệch (5.0, 1.95))
// Thời gian: scenes/nextdoor-01/timeline.json + sfx.json + lips.json (cùng nguồn với âm thanh)
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import planB from "../../../locations/maple-court-4b/plan.json";
import planH from "../../../locations/maple-court-flur4/plan.json";
import tl from "../../../scenes/nextdoor-01/timeline.json";
import sfx from "../../../scenes/nextdoor-01/sfx.json";
import lips from "../../../scenes/nextdoor-01/lips.json";
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
const lerpAng = (a: number, b: number, k: number) => { let d = ((b - a + 540) % 360) - 180; return a + d * k; };
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const ease = (u: number) => { const k = clamp01(u); return 0.5 * k + 0.5 * k * k * (3 - 2 * k); };

// ---------- Thời gian ----------
const LINE = Object.fromEntries(tl.lines.map((l) => [l.id, l])) as Record<string, (typeof tl.lines)[number]>;
const ENDCARD = tl.events.endcard[0];
const KNOCKS = sfx.knocks as { t: number; gain: number }[];
const MYKNOCKS = sfx.myknocks as { t: number; gain: number }[];
const STEPS = sfx.steps as { t: number; foot: string; gain: number; surface: string }[];
const DOORS = sfx.door as { t: number; kind: string }[];
const CHAIN = sfx.chain as { t: number; kind: string }[];
const BUZZ = sfx.buzz as number[];
const RING = sfx.ring as number[];
const IMPACT = sfx.impact;
const WALKS = sfx.walks as Record<string, [number, number]>;
const T_CHAIN_OPEN = CHAIN[0].t, T_CHAIN_CLOSE = CHAIN[1].t;
const pulse = (t: number, at: number, w: number) => Math.exp(-(((t - at) / w) ** 2));
const knockHit = (t: number) => KNOCKS.reduce((m, k) => Math.max(m, pulse(t, k.t, 0.05) * Math.min(1, 0.4 + k.gain)), 0);
const myKnockHit = (t: number) => MYKNOCKS.reduce((m, k) => Math.max(m, pulse(t, k.t, 0.045)), 0);
const walking = (t: number) => Object.values(WALKS).reduce((m, [a, b]) => Math.max(m, smooth(t, a - 0.05, a + 0.25) * (1 - smooth(t, b - 0.2, b + 0.1))), 0);
const mouth = (spk: string, t: number) => {
  const es = (lips.speakers as unknown as Record<string, { t0: number; v: number[] }[]>)[spk] ?? [];
  for (const e of es) {
    const i = Math.floor((t - e.t0) * lips.fps);
    if (i >= 0 && i < e.v.length) return e.v[i];
  }
  return 0;
};

// ---------- Plan ----------
const OX = 5.0, OY = 1.95; // góc Tây-Nam của 4B trong toạ độ hành lang
const RH = 2.6;
type PathDef = { id: string; points: P2[]; t0: number; t1: number };
const pathH = (id: string) => (planH.paths as unknown as PathDef[]).find((p) => p.id === id)!;
const pathB = (id: string) => (planB.paths as unknown as PathDef[]).find((p) => p.id === id)!;
const legOf = (p: PathDef, off: P2 = [0, 0]) => ({ pts: p.points.map((q) => [q[0] + off[0], q[1] + off[1]] as P2), t0: p.t0, t1: p.t1 });
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
const face = (from: P2, to: P2) => Math.atan2(to[0] - from[0], -(to[1] - from[1])); // rotationY của Figure
const EAST = Math.PI / 2, NORTH = Math.PI, SOUTH = 0, WEST = -Math.PI / 2;

// ---------- Vật liệu ----------
const matCache = new Map<string, THREE.Material>();
const mat = (color: string, kind: Kind = "other") => {
  const k = `${color}|${kind}`;
  if (!matCache.has(k)) matCache.set(k, makeToon(STYLE, color, false, kind));
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
const Solid: React.FC<{ geo: THREE.BufferGeometry; at: V3; rot?: V3; scale?: V3; color: string; line?: boolean; unlit?: boolean; opacity?: number }> =
  ({ geo, at, rot, scale, color, line = true, unlit, opacity }) => (
    <group position={W3(at[0], at[1], at[2])} rotation={rot} scale={scale}>
      <mesh geometry={geo} material={unlit || opacity !== undefined ? basic(color, opacity ?? 1) : mat(color)} />
      {line && !unlit && opacity === undefined && <mesh geometry={geo} material={outlineMat()} />}
    </group>
  );

const makeTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const useCanvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => useMemo(() => makeTex(w, h, draw), []); // eslint-disable-line react-hooks/exhaustive-deps
const FONT = "'DejaVu Sans', sans-serif";

// Quầng sáng cộng (vệt đèn trên sàn, ánh xanh dưới cửa 4C, quầng đèn tường)
const useGlowTex = () => useCanvasTex(128, 128, (c) => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
});
const Glow: React.FC<{ tex: THREE.Texture; at: V3; size: [number, number]; color: string; opacity: number; on?: "floor" | "wallS" | "wallN" | "wallE" | "wallW" | "sprite" }> =
  ({ tex, at, size, color, opacity, on = "floor" }) => {
    if (opacity < 0.01) return null;
    const rot: V3 = on === "floor" ? [-Math.PI / 2, 0, 0] : on === "wallS" ? [0, 0, 0] : on === "wallN" ? [0, Math.PI, 0] : on === "wallE" ? [0, Math.PI / 2, 0] : on === "wallW" ? [0, -Math.PI / 2, 0] : [0, 0, 0];
    // wallS: pháp tuyến hướng Nam (−y) ; wallN: hướng Bắc ; wallE: hướng Đông ; wallW: hướng Tây
    return (
      <mesh position={W3(at[0], at[1], at[2])} rotation={rot} renderOrder={5}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    );
  };

// ---------- Màu (đêm, đèn yếu) ----------
const C = {
  hallWall: "#4d5a47", hallWood: "#33241d", carpet: "#5b2328", carpetWorn: "#4b1d21", ceiling: "#6b665a", door: "#5d4030", doorDark: "#4a3326",
  brass: "#b79a4a", brassDirty: "#7d6d3c", silver: "#cfd6df", wallB: "#837c68", wallBLow: "#6c6554", wallWest: "#8d8268", floorB: "#6a4a31", ceilB: "#8d887b",
  blanket: "#41604b", blanketB: "#344a3c", pillow: "#b8b1a2", wood: "#4a3626", cardboard: "#9a7a52", metal: "#aeb2ae", counter: "#5b5e55",
};

// Tường dọc trục x với ô cửa [a, b, z0, z1] (z0 > 0: bậu cửa sổ)
const WallRun: React.FC<{ a: number; b: number; y: [number, number]; open: [number, number, number, number][]; color: string }> = ({ a, b, y, open, color }) => {
  const xs = Array.from(new Set([a, b, ...open.flatMap(([p, q]) => [p, q])])).sort((p, q) => p - q);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const p = xs[i], q = xs[i + 1];
    const o = open.find(([oa, ob]) => oa <= p + 1e-6 && ob >= q - 1e-6);
    if (!o) out.push(<Box key={i} x={[p, q]} y={y} z={[0, RH]} color={color} />);
    else {
      if (o[2] > 0) out.push(<Box key={`${i}l`} x={[p, q]} y={y} z={[0, o[2]]} color={color} />);
      out.push(<Box key={`${i}h`} x={[p, q]} y={y} z={[o[3], RH]} color={color} />);
    }
  }
  return <>{out}</>;
};

// Cánh cửa quay quanh bản lề (hx, hy); dir = +1: cánh nằm về phía Đông khi đóng; angle > 0 quay ngược chiều kim đồng hồ (nhìn từ trên)
const DoorLeaf: React.FC<{ hx: number; hy: number; w: number; dir: 1 | -1; angle: number; color?: string; children?: React.ReactNode; line?: boolean }> =
  ({ hx, hy, w, dir, angle, color = C.door, children, line = true }) => (
    <group position={W3(hx, hy, 0)} rotation={[0, angle, 0]}>
      <mesh geometry={boxGeo} material={mat(color)} position={[dir * w / 2, 1.015, 0]} scale={[w, 2.03, 0.045]} />
      {line && <mesh geometry={boxGeo} material={outlineMat()} position={[dir * w / 2, 1.015, 0]} scale={[w, 2.03, 0.045]} />}
      {children}
    </group>
  );

const useWallpaper = () => useCanvasTex(128, 256, (c) => {
  c.fillStyle = "#3f4b3a"; c.fillRect(0, 0, 128, 256);
  for (let x = 0; x < 128; x += 32) { c.fillStyle = "#4a573f"; c.fillRect(x, 0, 14, 256); c.fillStyle = "#35402f"; c.fillRect(x + 14, 0, 2, 256); }
  c.fillStyle = "rgba(25,20,15,0.25)";
  for (let i = 0; i < 18; i++) { c.fillRect(((i * 53) % 120) + 4, ((i * 97) % 240), 3, 14 + (i % 4) * 8); } // vết ố / bong mép
  const t = c; t.fillStyle = "rgba(0,0,0,0)";
});
const WallPaper: React.FC<{ tex: THREE.Texture; a: number; b: number; y: number; facing: "S" | "N"; z0?: number; z1?: number }> = ({ tex, a, b, y, facing, z0 = 0.9, z1 = RH }) => {
  const t = useMemo(() => { const c = tex.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(Math.max(1, (b - a) / 0.55), 1); return c; }, [tex, a, b]);
  return (
    <mesh position={W3((a + b) / 2, y + (facing === "S" ? -0.004 : 0.004), (z0 + z1) / 2)} rotation={[0, facing === "S" ? 0 : Math.PI, 0]}>
      <planeGeometry args={[b - a, z1 - z0]} />
      <meshBasicMaterial map={t} color="#9a9a90" />
    </mesh>
  );
};

const labelTex = (text: string, w = 128, h = 64, bg = "#0000", fg = "#f2f2f2", size = 34) => makeTex(w, h, (c) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = `bold ${size}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, w / 2, h / 2);
});

// ================================================================ HÀNH LANG ====
// Thời gian cửa
const doorAngle4B = (t: number) => {
  const opens = DOORS.filter((d) => d.kind === "open"), close = DOORS.find((d) => d.kind === "close")!.t;
  const open1 = opens[0].t - 0.15, open2 = opens[1].t - 0.1;
  const a1 = smooth(t, open1, open1 + 0.55) * (1 - smooth(t, close - 0.7, close + 0.05));
  const a2 = smooth(t, open2, open2 + 0.38);
  return deg(97) * Math.max(a1, a2);
};
const doorAngle4A = (t: number) => {
  const chain = smooth(t, T_CHAIN_OPEN - 0.12, T_CHAIN_OPEN + 0.25) * (1 - smooth(t, T_CHAIN_CLOSE - 0.25, T_CHAIN_CLOSE)) * deg(34);
  const wide = smooth(t, 85.4, 86.1) * deg(105);
  return Math.max(chain, wide);
};
const doorAngle4D = (t: number) => smooth(t, planH.characters.MRS_LEE.appear - 0.5, planH.characters.MRS_LEE.appear + 0.2) * deg(85);
const hallFlick = (t: number) => {
  let f = 0.9 + 0.1 * Math.sin(t * 2.1) * Math.sin(t * 0.7);
  if (t > IMPACT && t < IMPACT + 1.4) f *= hash(Math.floor(t * 15)) > 0.4 ? 1 : 0.15;
  return f;
};
const sconceFlick = (t: number) => {
  const base = hash(Math.floor(t * 9)) > 0.86 ? 0.35 : 1;
  return Math.min(hallFlick(t), base);
};

const Hall: React.FC<{ t: number }> = ({ t }) => {
  const glow = useGlowTex();
  const wp = useWallpaper();
  const exitTex = useMemo(() => labelTex("EXIT", 128, 48, "#7a1018", "#ffd8d8", 30), []);
  const nums = useMemo(() => ({ "4C": labelTex("4C", 96, 64, "#0000", "#b9a45a", 40), "4B": labelTex("4B", 96, 64, "#0000", "#d6bd62", 40), "4A": labelTex("4A", 96, 64, "#0000", "#d6bd62", 40), "4D": labelTex("4D", 96, 64, "#0000", "#d6bd62", 40) }), []);
  const flick = hallFlick(t), sc = sconceFlick(t);
  const glowOn = t < IMPACT;
  const gl = glowOn ? (0.55 + 0.45 * hash(Math.floor(t * 12))) * (0.85 + 0.15 * Math.sin(t * 3)) : 0;
  const mats4a = doorAngle4A(t);
  const stepsN = 8, run = 0.2, rise = 0.17;
  return (
    <group>
      {/* sàn thảm, trần */}
      <Box x={[0, 12]} y={[0, 1.8]} z={[-0.05, 0]} color={C.carpet} kind="cloth" line={false} />
      <Box x={[0.4, 10.4]} y={[0.45, 1.35]} z={[0, 0.004]} color={C.carpetWorn} kind="cloth" line={false} />
      <Box x={[0, 12]} y={[0, 1.8]} z={[RH, RH + 0.05]} color={C.ceiling} />
      {/* tường Bắc: 4C (2.5) · 4B (6.2) ; tường Nam: 4D (2.5) · 4A (6.4) */}
      <WallRun a={0} b={12} y={[1.8, 1.95]} color={C.hallWood} open={[[2.05, 2.95, 2.03, RH], [5.75, 6.65, 2.03, RH]].map(([a, b, z, h]) => [a, b, 0, z] as [number, number, number, number])} />
      <WallRun a={0} b={12} y={[-0.15, 0]} color={C.hallWood} open={[[2.05, 2.95, 0, 2.03], [5.95, 6.85, 0, 2.03]]} />
      {[[0, 2.05], [2.95, 5.75], [6.65, 12]].map(([a, b]) => <WallPaper key={`wn${a}`} tex={wp} a={a} b={b} y={1.8} facing="S" />)}
      {[[0, 2.05], [2.95, 5.95], [6.85, 12]].map(([a, b]) => <WallPaper key={`ws${a}`} tex={wp} a={a} b={b} y={0} facing="N" />)}
      <Box x={[-0.3, 0]} y={[0, 1.8]} z={[0, RH]} color={C.hallWood} />
      <Box x={[12, 12.15]} y={[0, 1.8]} z={[0, RH]} color={C.hallWood} />
      {/* các khung cửa phía sau cửa đóng: 4C / 4B (nhìn từ hành lang) – cửa là khối đặc nên chỉ cần cánh */}
      {/* cửa 4C – MỐI NGUY: bụi phủ, chỉ tay nắm sạch, ổ khoá mới, ánh xanh dưới khe */}
      <DoorLeaf hx={2.05} hy={1.875} w={0.9} dir={1} angle={0} color={C.doorDark}>
        <mesh position={[0.45, 1.015, 0.026]} scale={[0.9, 2.03, 0.004]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#c8c2ae" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0.45, 1.8, 0.027]} scale={[0.38, 0.19, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={nums["4C"]} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      </DoorLeaf>
      <Solid geo={G.sphere(0.035)} at={[2.88, 1.84, 0.96]} color="#e8d690" unlit />
      <Box x={[2.84, 2.9]} y={[1.835, 1.85]} z={[0.9, 1.02]} color="#e8d690" unlit />
      {/* ổ khoá móc mới tinh */}
      <Box x={[2.74, 2.86]} y={[1.83, 1.85]} z={[1.16, 1.3]} color="#d7dce4" unlit />
      <Solid geo={G.sphere(0.04)} at={[2.8, 1.82, 1.1]} scale={[1, 1.2, 0.6]} color="#f0f3f8" unlit />
      {/* ánh xanh lạnh dưới cửa 4C */}
      <Box x={[2.07, 2.93]} y={[1.79, 1.82]} z={[0.0, 0.02]} color="#6cc4ff" unlit opacity={glowOn ? 0.55 + 0.45 * gl : 0} />
      <Glow tex={glow} at={[2.5, 1.2, 0.015]} size={[2.4, 1.7]} color="#3d93ff" opacity={0.75 * gl} />
      <Glow tex={glow} at={[2.5, 1.78, 0.45]} size={[1.3, 0.9]} color="#3d93ff" opacity={0.28 * gl} on="wallS" />
      {/* cửa 4B (của TÔI) – cánh mở vào trong */}
      <DoorLeaf hx={5.75} hy={1.875} w={0.9} dir={1} angle={doorAngle4B(t)} line={false}>
        <mesh position={[0.45, 1.5, 0.026]}><circleGeometry args={[0.012, 12]} /><meshBasicMaterial color="#222" /></mesh>
        <mesh position={[0.45, 1.8, 0.026]} scale={[0.34, 0.17, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={nums["4B"]} transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0.78, 0.98, 0.04]}><sphereGeometry args={[0.03, 12, 8]} /><meshBasicMaterial color={C.brassDirty} /></mesh>
      </DoorLeaf>
      {/* giày của Jenna trên thảm chùi chân phía phải cửa 4B (gieo trước) */}
      {[0, 1].map((k) => (
        <group key={k}>
          <Box x={[6.74 + k * 0.17, 6.88 + k * 0.17]} y={[1.45, 1.74]} z={[0, 0.1]} color="#c9c4b8" kind="cloth" />
          <Box x={[6.74 + k * 0.17, 6.88 + k * 0.17]} y={[1.5, 1.58]} z={[0.1, 0.13]} color="#d86a98" kind="cloth" />
        </group>
      ))}
      <Box x={[6.66, 7.1]} y={[1.4, 1.78]} z={[0.0, 0.012]} color="#3b3a33" kind="cloth" line={false} />
      <Box x={[6.66, 7.1]} y={[1.4, 1.78]} z={[0.1, 0.101]} color="#9a968a" unlit opacity={0.2} />
      {/* cửa 4D (bà Lee) – mở sau tiếng rầm */}
      <DoorLeaf hx={2.95} hy={-0.075} w={0.9} dir={-1} angle={doorAngle4D(t)} line={false}>
        <mesh position={[-0.45, 1.8, -0.026]} rotation={[0, Math.PI, 0]} scale={[0.34, 0.17, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={nums["4D"]} transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
      </DoorLeaf>
      <group>
        <Box x={[1.2, 3.8]} y={[-2.4, -0.15]} z={[-0.05, 0]} color="#3a3027" />
        <Box x={[1.2, 3.8]} y={[-2.45, -2.4]} z={[0, RH]} color="#44505e" unlit />
        <Glow tex={glow} at={[2.5, -1.5, 1.0]} size={[2.2, 1.6]} color="#5a86c8" opacity={0.28} on="wallN" />
      </group>
      {/* cửa 4A (Rosa) – hé có xích, rồi mở hẳn */}
      <DoorLeaf hx={6.85} hy={-0.075} w={0.9} dir={-1} angle={mats4a} line={false}>
        <mesh position={[-0.45, 1.8, -0.026]} rotation={[0, Math.PI, 0]} scale={[0.34, 0.17, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={nums["4A"]} transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[-0.82, 1.42, -0.03]}><boxGeometry args={[0.1, 0.02, 0.012]} /><meshBasicMaterial color={C.brass} /></mesh>
      </DoorLeaf>
      {/* phía sau cửa 4A: lối vào nhà Rosa, đèn vàng, ảnh Đức Mẹ */}
      <group>
        <Box x={[5.2, 7.7]} y={[-2.6, -0.15]} z={[-0.05, 0]} color="#5a3d26" />
        <Box x={[5.2, 7.7]} y={[-2.6, -0.15]} z={[RH, RH + 0.05]} color="#5d5446" />
        <Box x={[5.2, 7.7]} y={[-2.65, -2.6]} z={[0, RH]} color="#a37a42" unlit />
        <Box x={[5.15, 5.2]} y={[-2.6, -0.15]} z={[0, RH]} color="#8a6a3c" unlit />
        <Box x={[7.7, 7.75]} y={[-2.6, -0.15]} z={[0, RH]} color="#8a6a3c" unlit />
        <Box x={[6.2, 6.62]} y={[-2.6, -2.55]} z={[1.2, 1.7]} color="#6fa0d8" unlit />
        <Box x={[6.3, 6.52]} y={[-2.55, -2.5]} z={[1.3, 1.62]} color="#efe9dc" unlit />
        <Glow tex={glow} at={[6.4, -1.4, 2.2]} size={[3, 2.2]} color="#ffbe6a" opacity={0.45 * (t >= T_CHAIN_OPEN - 0.3 && t < T_CHAIN_CLOSE ? 1 : 0)} />
        <Glow tex={glow} at={[6.2, 0.35, 0.012]} size={[1.8, 1.2]} color="#ffbe6a" opacity={0.3 * (t >= T_CHAIN_OPEN - 0.3 && t < T_CHAIN_CLOSE + 0.4 ? 1 : 0)} />
      </group>
      {/* thảm chùi chân BIENVENIDOS */}
      <Box x={[6.0, 6.8]} y={[0.02, 0.37]} z={[0, 0.014]} color="#8a4a2a" kind="cloth" line={false} />
      {/* đèn tường hình nến: x=4.2 (chập chờn), x=8.0 */}
      {[4.2, 8.0].map((x) => (
        <group key={x}>
          <Box x={[x - 0.05, x + 0.05]} y={[1.72, 1.8]} z={[1.82, 1.98]} color={C.brass} />
          <Box x={[x - 0.03, x + 0.03]} y={[1.7, 1.74]} z={[1.98, 2.1]} color="#ffdf9a" unlit opacity={x === 4.2 ? sc : flick} />
          <Glow tex={glow} at={[x, 1.78, 1.95]} size={[1.8, 1.4]} color="#ffc070" opacity={0.55 * (x === 4.2 ? sc : flick)} on="wallS" />
          <Glow tex={glow} at={[x, 0.9, 0.012]} size={[2.4, 1.4]} color="#ffb060" opacity={0.28 * (x === 4.2 ? sc : flick)} />
        </group>
      ))}
      {/* bình chữa cháy */}
      <Box x={[8.7, 8.9]} y={[0.0, 0.1]} z={[1.1, 1.45]} color="#a31f27" />
      {/* đầu Tây: cửa sổ ra con hẻm + EXIT đỏ */}
      <Box x={[0, 0.02]} y={[0.45, 1.35]} z={[0.95, 2.15]} color="#2a3f5e" unlit />
      <Glow tex={glow} at={[0.05, 0.9, 1.55]} size={[1.4, 1.6]} color="#7aa0d8" opacity={0.3} on="wallE" />
      <Box x={[0, 0.17]} y={[0.1, 0.36]} z={[0, 0.65]} color="#3a3a3a" /> {/* lò sưởi */}
      <Box x={[0.02, 0.18]} y={[0.6, 1.2]} z={[2.25, 2.45]} color="#a31520" unlit />
      <mesh position={W3(0.2, 0.9, 2.35)} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.18]} /><meshBasicMaterial map={exitTex} /></mesh>
      <Glow tex={glow} at={[0.4, 0.9, 2.3]} size={[1.6, 1.0]} color="#ff2a2a" opacity={0.5} on="wallE" />
      {/* cầu thang đi xuống ở đầu Đông */}
      {Array.from({ length: stepsN }, (_, i) => (
        <Box key={`st${i}`} x={[10.4 + run * i, 12]} y={[0, 1.8]} z={[-rise * (i + 1), -rise * i]} color={i % 2 ? "#3d2c21" : "#46332a"} />
      ))}
      <Box x={[10.4, 12]} y={[0, 0.06]} z={[-1.4, 0.0]} color="#26201c" line={false} />
      {Array.from({ length: stepsN }, (_, i) => <Box key={`po${i}`} x={[10.42 + run * i, 10.46 + run * i]} y={[1.74, 1.78]} z={[-rise * i, -rise * i + 0.9]} color={C.hallWood} />)}
      <group position={W3(11.2, 1.76, 0.1 - rise * 4)} rotation={[0, 0, -Math.atan2(rise, run)]}>
        <mesh geometry={boxGeo} material={mat(C.hallWood)} scale={[1.9, 0.05, 0.06]} />
      </group>
      <Box x={[10.38, 10.42]} y={[1.72, 1.8]} z={[0, 0.95]} color={C.hallWood} />
      <Glow tex={glow} at={[11.2, 0.9, -0.5]} size={[2.4, 2.0]} color="#c8a060" opacity={0.18} />
    </group>
  );
};

// ================================================================ CĂN 4B ====
const FRAME_AT: V3 = [5.0, 5.65, 1.45];
const DET_AT: V3 = [OX + 2.2, OY + 2.6, 2.6];
const NOTE_AT: V3 = [OX + 3.75, OY + 1.5, 1.6];
const ledOn = (t: number) => t < IMPACT + 0.05 && (t % 4) < 0.2;
const T_LENS = 59.9;

const nightWindowTex = () => makeTex(1024, 512, (c) => {
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#0b1424"); g.addColorStop(0.6, "#1a2638"); g.addColorStop(1, "#3a2c26");
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  // toà nhà bên kia đường + biển neon
  c.fillStyle = "#10151f"; c.fillRect(140, 150, 520, 230);
  c.fillStyle = "#171c28"; c.fillRect(680, 190, 260, 190);
  c.fillStyle = "#2b2a1c"; for (let i = 0; i < 12; i++) { c.fillRect(170 + (i % 6) * 70, 190 + Math.floor(i / 6) * 70, 28, 36); }
  c.shadowColor = "#ff4fa0"; c.shadowBlur = 24; c.fillStyle = "#ff77b8"; c.font = `bold 44px ${FONT}`; c.fillText("SUDS", 190, 130);
  c.shadowColor = "#4fd8ff"; c.fillStyle = "#8fe8ff"; c.font = `bold 26px ${FONT}`; c.fillText("24 HR LAUNDRY", 175, 168); c.shadowBlur = 0;
  // đèn natri + xe phủ sương
  const lamp = (x: number) => { const r = c.createRadialGradient(x, 330, 0, x, 330, 160); r.addColorStop(0, "rgba(255,160,60,0.85)"); r.addColorStop(1, "rgba(255,160,60,0)"); c.fillStyle = r; c.fillRect(x - 160, 170, 320, 340); c.fillStyle = "#ffd08a"; c.fillRect(x - 6, 322, 12, 12); };
  lamp(300); lamp(780);
  c.fillStyle = "#2a2d34"; c.fillRect(120, 420, 230, 62); c.fillRect(500, 428, 210, 56);
  c.fillStyle = "rgba(220,235,245,0.35)"; c.fillRect(130, 424, 210, 14); c.fillRect(510, 432, 190, 12);
  // cây phong trụi lá
  c.strokeStyle = "#090c12"; c.lineWidth = 7; c.beginPath(); c.moveTo(900, 512); c.lineTo(900, 260); c.stroke();
  c.lineWidth = 4; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(900, 330 - i * 14); c.lineTo(900 + (i % 2 ? 70 : -70), 270 - i * 18); c.stroke(); }
});

const Apartment: React.FC<{ t: number }> = ({ t }) => {
  const glow = useGlowTex();
  const view = useMemo(() => nightWindowTex(), []);
  const blanket = useCanvasTex(128, 128, (c) => { c.fillStyle = "#3f5c49"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#34483c"; for (let i = 0; i < 128; i += 32) for (let j = 0; j < 128; j += 32) if (((i + j) / 32) % 2 === 0) c.fillRect(i, j, 32, 32); });
  const noteTex = useCanvasTex(128, 128, (c) => { c.fillStyle = "#f2d95c"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#3a3318"; c.font = `bold 15px ${FONT}`; c.textAlign = "center"; ["IT'S NOT A", "SMOKE", "DETECTOR.", "– J"].forEach((s, i) => c.fillText(s, 64, 36 + i * 22)); });
  const frameArt = useCanvasTex(64, 48, (c) => { const g = c.createLinearGradient(0, 0, 0, 48); g.addColorStop(0, "#4a5a78"); g.addColorStop(1, "#b0714a"); c.fillStyle = g; c.fillRect(0, 0, 64, 48); c.fillStyle = "#2a2f3c"; c.beginPath(); c.moveTo(0, 48); c.lineTo(18, 24); c.lineTo(34, 40); c.lineTo(50, 20); c.lineTo(64, 44); c.lineTo(64, 48); c.fill(); });
  const bx = (x: number) => x + OX, by = (y: number) => y + OY;
  // khung ảnh nảy theo tiếng gõ (nguồn: tay hàng xóm), rơi sau tiếng rầm
  const bounce = KNOCKS.reduce((m, k) => Math.max(m, pulse(t, k.t, 0.07)), 0) * 0.07 + MYKNOCKS.reduce((m, k) => Math.max(m, pulse(t, k.t, 0.06)), 0) * 0.035;
  const fall = clamp01((t - IMPACT - 0.05) / 0.45);
  const fz = FRAME_AT[2] - (FRAME_AT[2] - 0.62) * fall * fall;
  const lensK = smooth(t, T_LENS, T_LENS + 0.9);
  const camP = camAt(t).pos;
  const dir = new THREE.Vector3(...W3(camP[0], camP[1], camP[2])).sub(new THREE.Vector3(...W3(...DET_AT))).normalize();
  const lensQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const led = ledOn(t) || BUZZ.some((b) => t > b && t < b + 0.35 && t < IMPACT);
  const noteGone = t >= 63.9;
  const lampFlick = t > IMPACT && t < IMPACT + 1.0 ? (hash(Math.floor(t * 16)) > 0.5 ? 1 : 0.2) : 1;
  return (
    <group>
      {/* sàn gỗ, trần */}
      <Box x={[5, 9.4]} y={[1.95, 6.95]} z={[-0.05, 0]} color={C.floorB} line={false} />
      {Array.from({ length: 10 }, (_, i) => <Box key={`pl${i}`} x={[5 + i * 0.44, 5.015 + i * 0.44]} y={[1.95, 6.95]} z={[0, 0.003]} color="#4a3220" line={false} />)}
      <Box x={[5, 9.4]} y={[1.95, 6.95]} z={[RH, RH + 0.05]} color={C.ceilB} />
      {/* tường: Tây (chung với 4C), Bắc (cửa sổ), Đông */}
      <Box x={[4.88, 5.0]} y={[1.95, 6.95]} z={[0, RH]} color={C.wallWest} />
      <WallRun a={5} b={9.4} y={[6.95, 7.25]} color={C.wallB} open={[[6.0, 7.2, 0.9, 2.15]]} />
      <Box x={[9.4, 9.55]} y={[1.95, 6.95]} z={[0, RH]} color={C.wallB} />
      <Box x={[5, 9.4]} y={[1.95, 1.99]} z={[0, 0.12]} color={C.wallBLow} />
      {/* cửa sổ: khung, kính phủ sương, cảnh bãi đỗ xe */}
      <Box x={[6.0, 7.2]} y={[7.0, 7.12]} z={[0.86, 0.9]} color="#d8d2c0" />
      <Box x={[6.58, 6.62]} y={[7.05, 7.09]} z={[0.9, 2.15]} color="#cfc9b8" />
      <mesh position={W3(6.6, 8.8, 1.55)}><planeGeometry args={[10, 5]} /><meshBasicMaterial map={view} color="#c8c8c8" /></mesh>
      <mesh position={W3(6.6, 7.08, 1.52)}><planeGeometry args={[1.2, 1.25]} /><meshBasicMaterial color="#c8dcf0" transparent opacity={0.1} depthWrite={false} /></mesh>
      <Glow tex={glow} at={[6.6, 6.2, 0.012]} size={[2.4, 3.2]} color="#ff9a40" opacity={0.28} />
      {/* cửa vào 4B – phía trong (nhìn từ trong phòng) đã vẽ ở Hall; chốt, xích */}
      <Box x={[6.5, 6.56]} y={[1.99, 2.0]} z={[1.5, 1.53]} color="#c9ced4" line={false} />
      <Box x={[6.52, 6.55]} y={[1.99, 2.01]} z={[1.18, 1.24]} color={C.brass} line={false} />
      {/* giường (đầu giường áp tường Tây) */}
      <Box x={[5.05, 7.05]} y={[by(3.0), by(4.4)]} z={[0.0, 0.3]} color={C.wood} />
      <Box x={[5.05, 7.05]} y={[by(3.0), by(4.4)]} z={[0.3, 0.52]} color={C.blanket} kind="cloth" line={false} />
      <mesh position={W3(6.1, by(3.7), 0.525)} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.8, 1.3]} /><meshBasicMaterial map={blanket} color="#8a8a8a" /></mesh>
      <Box x={[5.08, 5.55]} y={[by(3.1), by(4.3)]} z={[0.52, 0.64]} color={C.pillow} kind="cloth" />
      <Box x={[5.0, 5.07]} y={[by(2.95), by(4.45)]} z={[0.3, 1.1]} color={C.wood} />
      {/* tủ đầu giường + đèn ngủ */}
      <Box x={[5.05, 5.5]} y={[by(2.45), by(2.9)]} z={[0, 0.6]} color="#5a4230" />
      <Solid geo={G.cylT(0.09, 0.14, 0.26)} at={[5.28, by(2.68), 0.76]} color="#f1c97a" unlit opacity={lampFlick} />
      <Solid geo={G.cyl(0.03, 0.14)} at={[5.28, by(2.68), 0.66]} color="#3a2f26" />
      <Glow tex={glow} at={[5.28, by(2.68), 0.9]} size={[1.6, 1.6]} color="#ffb860" opacity={0.6 * lampFlick} on="wallE" />
      <Glow tex={glow} at={[5.7, by(2.68), 0.012]} size={[2.6, 2.6]} color="#ffb060" opacity={0.42 * lampFlick} />
      <Solid geo={G.cyl(0.03, 0.1)} at={[5.4, by(2.6), 0.65]} color="#8fa8bd" opacity={0.6} />
      {/* ánh xanh từ 4C lọt qua khe dưới cửa 4B (tắt cùng lúc với tiếng rầm) */}
      {t > 62.9 && t < IMPACT && (
        <group>
          <Box x={[5.8, 6.6]} y={[1.95, 2.03]} z={[0, 0.012]} color="#6cc4ff" unlit opacity={0.5 + 0.5 * (0.55 + 0.45 * hash(Math.floor(t * 12)))} />
          <Glow tex={glow} at={[6.2, 2.4, 0.014]} size={[2.2, 1.6]} color="#3d93ff" opacity={0.55 * (0.55 + 0.45 * hash(Math.floor(t * 12 + 7)))} />
        </group>
      )}
      {/* khung ảnh trên tường Tây */}
      <group position={W3(5.02, FRAME_AT[1], fz)} rotation={[bounce * (fall < 0.01 ? 1 : 0), 0, fall * 0.7 * (fall > 0 ? 1 : 0) + (fall < 0.01 ? bounce : 0)]}>
        <mesh geometry={boxGeo} material={mat("#3b2a20")} scale={[0.04, 0.35, 0.45]} />
        <mesh geometry={boxGeo} material={outlineMat()} scale={[0.04, 0.35, 0.45]} />
        <mesh position={[0.025, 0, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.4, 0.3]} /><meshBasicMaterial map={frameArt} color="#aaaaaa" /></mesh>
      </group>
      {/* tủ quần áo âm tường + mẩu giấy vàng */}
      <Box x={[8.75, 9.35]} y={[by(0.9), by(2.1)]} z={[0, 2.1]} color="#6f5a45" />
      <Box x={[8.745, 8.75]} y={[by(1.495), by(1.505)]} z={[0, 2.1]} color="#2d241c" line={false} />
      <Box x={[8.74, 8.75]} y={[by(1.45), by(1.47)]} z={[0.9, 1.15]} color="#b5b9bf" />
      {!noteGone && (
        <mesh position={W3(8.743, NOTE_AT[1], NOTE_AT[2])} rotation={[0, -Math.PI / 2, 0.06]}><planeGeometry args={[0.075, 0.075]} /><meshBasicMaterial map={noteTex} color="#d8d8d8" /></mesh>
      )}
      {/* bàn + hộp các-tông + ghế */}
      <Box x={[bx(2.6), bx(3.3)]} y={[by(2.6), by(3.3)]} z={[0.72, 0.75]} color="#6c5a46" />
      {[[2.62, 2.62], [3.26, 2.62], [2.62, 3.26], [3.26, 3.26]].map(([x, y], i) => <Box key={`tl${i}`} x={[bx(x), bx(x) + 0.04]} y={[by(y), by(y) + 0.04]} z={[0, 0.72]} color="#4d3e30" />)}
      <Box x={[bx(2.7), bx(3.05)]} y={[by(2.7), by(3.05)]} z={[0.75, 0.97]} color={C.cardboard} />
      <Box x={[bx(2.58), bx(2.98)]} y={[by(3.9), by(4.3)]} z={[0, 0.45]} color={C.cardboard} />
      <Box x={[bx(3.1), bx(3.5)]} y={[by(3.95), by(4.3)]} z={[0, 0.3]} color="#8a6c48" />
      <Box x={[bx(3.12), bx(3.24)]} y={[by(2.72), by(2.84)]} z={[0.75, 0.752]} color="#ece8da" unlit />
      <Box x={[bx(2.75), bx(3.17)]} y={[by(3.35), by(3.77)]} z={[0.0, 0.45]} color="#58442f" />
      <Box x={[bx(2.75), bx(3.17)]} y={[by(3.72), by(3.77)]} z={[0.45, 0.88]} color="#58442f" />
      {/* bếp nhỏ + tủ lạnh */}
      <Box x={[bx(3.0), bx(4.35)]} y={[by(4.4), by(4.95)]} z={[0, 0.9]} color={C.counter} />
      <Box x={[bx(3.05), bx(3.5)]} y={[by(4.5), by(4.85)]} z={[0.9, 0.92]} color="#9ea4a0" />
      <Box x={[bx(3.8), bx(4.35)]} y={[by(4.4), by(4.95)]} z={[0.9, 1.75]} color={C.metal} />
      {/* đầu báo khói (thật ra là camera) */}
      <group position={W3(DET_AT[0], DET_AT[1], RH - 0.02)}>
        <mesh geometry={G.cyl(0.068, 0.034)} material={mat("#e6e1d2")} />
        <mesh geometry={G.cyl(0.068, 0.034)} material={outlineMat()} />
        {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[Math.cos(i * 1.047) * 0.04, -0.018, Math.sin(i * 1.047) * 0.04]}><boxGeometry args={[0.012, 0.004, 0.012]} /><meshBasicMaterial color="#555" /></mesh>)}
        {/* thấu kính lộ ra, xoay theo TÔI */}
        <group position={[0, -0.02, 0]} quaternion={lensQ} scale={lensK}>
          <mesh position={[0, -0.02, 0]} geometry={G.cyl(0.028, 0.04)} material={basic("#070709")} />
          <mesh position={[0, -0.042, 0]}><circleGeometry args={[0.02, 20]} /><meshBasicMaterial color="#1b2c44" /></mesh>
          <mesh position={[0.007, -0.0425, 0.005]}><circleGeometry args={[0.005, 10]} /><meshBasicMaterial color="#9ab8e0" /></mesh>
        </group>
        <mesh position={[0.05, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.009, 10]} /><meshBasicMaterial color={led ? "#ff3030" : "#4a1010"} /></mesh>
      </group>
      {led && <Glow tex={glow} at={[DET_AT[0] + 0.05, DET_AT[1], RH - 0.06]} size={[0.5, 0.5]} color="#ff2020" opacity={0.9} on="floor" />}
    </group>
  );
};

// ================================================================ FIGUREN ====
const fig = (id: string, hands?: { right: HandProp; left: HandProp }): FigureDef => {
  const f = CAST.find((c) => c.id === id)!;
  return hands ? { ...f, hands: { ...f.hands, ...hands } } : f;
};
const CH = planH.characters as unknown as Record<string, { start: P2; appear?: number }>;
const nbAppear = (id: string) => CH[id].appear ?? 0;

const Neighbors: React.FC<{ t: number }> = ({ t }) => {
  const out: React.ReactNode[] = [];
  const talk = (k: string) => mouth(k, t);
  const sway = (k: number) => 0.08 * Math.sin(t * 1.3 + k);
  // ROSA: sau khe cửa có xích, rồi mở cửa bước ra ngưỡng
  if (t >= T_CHAIN_OPEN - 0.2 && !(t > T_CHAIN_CLOSE && t < 85.4)) {
    const stepOut = smooth(t, 85.5, 86.4);
    const behind: P2 = [6.18, -0.3], door: P2 = CH.ROSA.start;
    const pos: P2 = t < 85 ? behind : [lerp(behind[0], door[0], stepOut), lerp(behind[1], door[1], stepOut)];
    const lookMe = t > 85.5 ? face(pos, [6.2, 1.62]) : face(pos, [5.7, 0.85]);
    out.push(<Figure key="rosa" f={fig("rosa")} style={STYLE} scale={FIG_TO_M} position={W3(pos[0], pos[1], 0)} rotationY={lookMe} walk={stepOut > 0 && stepOut < 1 ? stepOut * 1.2 : 0}
      talk={talk("ROSA")} headYaw={sway(1) * 0.8} />);
  }
  if (t >= nbAppear("MRS_LEE")) {
    out.push(<Figure key="lee" f={fig("mrs-lee")} style={STYLE} scale={FIG_TO_M} position={W3(CH.MRS_LEE.start[0], CH.MRS_LEE.start[1], 0)} rotationY={NORTH - 0.1}
      talk={talk("MRS_LEE")} headYaw={0.15 + sway(2)} />);
  }
  if (t >= nbAppear("TYLER")) {
    const p = pathH("weg-tyler");
    const u = clamp01((t - p.t0) / (p.t1 - p.t0));
    const w = alongPath(p.points, u);
    const run = u > 0 && u < 1;
    out.push(<Figure key="tyler" f={fig("tyler")} style={STYLE} scale={FIG_TO_M} position={W3(w.pos[0], w.pos[1], 0)} rotationY={run ? w.heading : face(w.pos, [2.6, 1.8])}
      walk={run ? w.dist * 4.4 : 0} talk={talk("TYLER")} headYaw={run ? 0 : sway(3)} />);
  }
  if (t >= nbAppear("RAY")) {
    const step = smooth(t, 96, 97.2) * 0.45;
    const pos: P2 = [CH.RAY.start[0] - step, CH.RAY.start[1] + step * 0.12];
    out.push(<Figure key="ray" f={fig("ray", { right: "phone", left: "none" })} style={STYLE} scale={FIG_TO_M} position={W3(pos[0], pos[1], 0)} rotationY={face(pos, [2.6, 1.8])}
      walk={step > 0.01 && step < 0.44 ? step * 6 : 0} talk={talk("RAY")} headYaw={sway(4)} />);
  }
  if (t >= nbAppear("DEB")) {
    out.push(<Figure key="deb" f={fig("deb")} style={STYLE} scale={FIG_TO_M} position={W3(CH.DEB.start[0], CH.DEB.start[1], 0)} rotationY={face(CH.DEB.start, [6.2, 1.62])}
      talk={talk("DEB")} headYaw={sway(5)} />);
  }
  if (t >= nbAppear("BRIANNA")) {
    const back = smooth(t, 92, 99) * 0.9;
    const pos: P2 = [CH.BRIANNA.start[0] + back, CH.BRIANNA.start[1]];
    out.push(<Figure key="bri" f={fig("brianna", { right: "phone", left: "none" })} style={STYLE} scale={FIG_TO_M} position={W3(pos[0], pos[1], 0)} rotationY={face(pos, [2.6, 1.8])}
      walk={back > 0.01 && back < 0.88 ? back * 5 : 0} talk={talk("BRIANNA")} headYaw={sway(6)} />);
  }
  if (t >= nbAppear("OKAFOR")) {
    const p = pathH("weg-okafor");
    const u = clamp01((t - p.t0) / (p.t1 - p.t0));
    const w = alongPath(p.points, u);
    const z = w.pos[0] > 10.4 ? -(w.pos[0] - 10.4) * 0.85 : 0;
    out.push(<Figure key="oka" f={fig("okafor")} style={STYLE} scale={FIG_TO_M} position={W3(w.pos[0], w.pos[1], z)} rotationY={u < 1 ? w.heading : face(w.pos, [2.6, 1.8])}
      walk={u > 0 && u < 1 ? w.dist * 4 : 0} talk={talk("OKAFOR")} headYaw={u >= 1 ? sway(7) : 0} />);
  }
  return <group>{out}</group>;
};

// Cánh tay Rosa đưa vòng cổ mèo qua khe cửa (46–48.4 s) – rồi vòng cổ chuyển sang tay trái của TÔI
const T_HAND0 = 45.4, T_GRAB = 48.3, T_POCKET = 60.4;
const collarWorld = (t: number): V3 | null => {
  if (t < T_HAND0 || t >= T_GRAB) return null;
  const hand: V3 = [5.93, 0.12, 1.18];
  const c = camAt(t);
  const fwd: V3 = [Math.sin(deg(c.yaw)) * Math.cos(deg(c.pitch)), Math.cos(deg(c.yaw)) * Math.cos(deg(c.pitch)), Math.sin(deg(c.pitch))];
  const meet: V3 = [c.pos[0] + fwd[0] * 0.5, c.pos[1] + fwd[1] * 0.5, c.pos[2] + fwd[2] * 0.5 - 0.22];
  const k = smooth(t, 47.0, 48.2);
  return [lerp(hand[0], meet[0], k), lerp(hand[1], meet[1], k), lerp(hand[2], meet[2], k)];
};
const RosaArm: React.FC<{ t: number }> = ({ t }) => {
  const w = collarWorld(t);
  const ext = smooth(t, T_HAND0, T_HAND0 + 0.8) * (1 - smooth(t, T_GRAB - 0.1, T_GRAB + 0.4));
  if (ext < 0.02) return null;
  const sh = new THREE.Vector3(...W3(6.1, -0.25, 1.12));
  const hd = new THREE.Vector3(...W3(lerp(6.1, 5.93, ext), lerp(-0.25, 0.12, ext), lerp(1.12, 1.18, ext)));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), hd.clone().sub(sh).normalize());
  const mid = sh.clone().add(hd).multiplyScalar(0.5);
  const len = sh.distanceTo(hd);
  return (
    <group>
      <mesh position={mid.toArray()} quaternion={q} geometry={G.capsule(0.032, Math.max(0.05, len - 0.07))} material={mat("#c48a92", "cloth")} />
      <mesh position={hd.toArray()} geometry={G.sphere(0.034)} material={mat("#efc4a6", "skin")} />
      {w && <Collar at={w} />}
    </group>
  );
};
const Collar: React.FC<{ at: V3 }> = ({ at }) => (
  <group position={W3(at[0], at[1], at[2])} rotation={[Math.PI / 2 - 0.4, 0.2, 0]}>
    <mesh geometry={new THREE.TorusGeometry(0.045, 0.008, 8, 24)} material={basic("#d8344a")} />
    <mesh position={[0, -0.047, 0]}><circleGeometry args={[0.014, 12]} /><meshBasicMaterial color="#e8c860" side={THREE.DoubleSide} /></mesh>
  </group>
);

// ================================================================ KAMERA ====
type Hold = { t: number; aim?: V3; yaw?: number; pitch?: number };
type Leg = { pts: P2[]; t0: number; t1: number };
type Shot = { id: string; t0: number; t1: number; pos: V3; legs?: Leg[]; z?: (t: number) => number; holds: Hold[] };
const camPlan = (id: string, pl: { cameras: unknown[] }) => (pl.cameras as { id: string; t0: number; t1: number; pos: number[] }[]).find((c) => c.id === id)!;
const B = (x: number, y: number): P2 => [x + OX, y + OY];

const D4C: V3 = [2.5, 1.8, 1.05], KNOB: V3 = [2.88, 1.8, 0.95], LOCK: V3 = [2.8, 1.8, 1.22], GLOW: V3 = [2.5, 1.8, 0.05];
const ROSAF: V3 = [6.18, -0.3, 1.32], SHOES: V3 = [6.9, 1.6, 0.1], DOOR_IN: V3 = [6.2, 1.95, 1.1], DOOR_OUT: V3 = [6.2, 1.8, 1.1];
const LAMP: V3 = [5.28, OY + 2.68, 0.8];
const SHOTS: Shot[] = [
  { id: "A1", t0: camPlan("A1", planB).t0, t1: camPlan("A1", planB).t1, pos: [...B(1.6, 3.25), 1.05] as V3, holds: [
    { t: 0, aim: FRAME_AT }, { t: 7.2, aim: DET_AT }, { t: 9.4, aim: NOTE_AT }, { t: 10.9, aim: FRAME_AT }, { t: 14.2, yaw: -88, pitch: -38 },
    { t: 15.4, aim: FRAME_AT }, { t: 18.0, aim: LAMP }, { t: 19.3, aim: FRAME_AT } ] },
  { id: "A2", t0: camPlan("A2", planB).t0, t1: camPlan("A2", planB).t1, pos: [...B(0.72, 3.7), 1.15] as V3, holds: [
    { t: 21.03, aim: FRAME_AT }, { t: 23.3, yaw: -88, pitch: -36 }, { t: 26.5, yaw: -62, pitch: -55 }, { t: 29.4, yaw: -88, pitch: -30 } ] },
  { id: "A3", t0: camPlan("A3", planB).t0, t1: camPlan("A3", planB).t1, pos: [...B(1.6, 3.25), 1.6] as V3, legs: [legOf(pathB("weg-tuer"), [OX, OY])],
    z: (t) => lerp(1.1, 1.6, smooth(t, 31.9, 32.9)), holds: [{ t: 31.62, aim: DOOR_IN }] },
  { id: "F0", t0: camPlan("F0", planH).t0, t1: camPlan("F0", planH).t1, pos: [6.2, 1.75, 1.6], legs: [legOf(pathH("weg-4c"))], holds: [{ t: 34.576, yaw: -100, pitch: -5 }, { t: 35.4, aim: D4C }] },
  { id: "F1", t0: camPlan("F1", planH).t0, t1: camPlan("F1", planH).t1, pos: [3.0, 1.1, 1.6], holds: [{ t: 37.22, aim: GLOW }, { t: 38.0, aim: KNOB }, { t: 39.2, aim: LOCK }] },
  { id: "F2", t0: camPlan("F2", planH).t0, t1: camPlan("F2", planH).t1, pos: [3.0, 1.1, 1.6], legs: [legOf(pathH("weg-rosa")), legOf(pathH("weg-zurueck"))], holds: [
    { t: 40.68, aim: D4C }, { t: 41.6, aim: ROSAF }, { t: 44.2, aim: GLOW }, { t: 45.3, aim: ROSAF }, { t: 46.4, aim: [5.9, 0.15, 1.2] }, { t: 48.7, aim: ROSAF },
    { t: 52.0, aim: SHOES }, { t: 53.2, aim: ROSAF }, { t: 60.2, aim: DOOR_OUT } ] },
  { id: "A4", t0: camPlan("A4", planB).t0, t1: camPlan("A4", planB).t1, pos: [...B(1.2, 0.05), 1.6] as V3, legs: [legOf(pathB("weg-schrank"), [OX, OY])], holds: [
    { t: 60.953, aim: NOTE_AT }, { t: 66.6, aim: DET_AT }, { t: 71.7, yaw: -30, pitch: -46 } ] },
  { id: "A5", t0: camPlan("A5", planB).t0, t1: camPlan("A5", planB).t1, pos: [...B(3.2, 1.5), 1.6] as V3, legs: [legOf(pathB("weg-tuer-2"), [OX, OY])], holds: [
    { t: 76.05, yaw: -30, pitch: -46 }, { t: 76.9, aim: DOOR_IN }, { t: 79.6, yaw: 178, pitch: -22 }, { t: 80.6, aim: DOOR_IN } ] },
  { id: "A6", t0: camPlan("A6", planB).t0, t1: camPlan("A6", planB).t1, pos: [...B(1.2, 0.45), 1.6] as V3, legs: [legOf(pathB("weg-schwelle"), [OX, OY])], holds: [
    { t: 83.255, aim: [6.2, 1.95, 0.55] }, { t: 85.4, aim: D4C } ] },
  { id: "F3", t0: camPlan("F3", planH).t0, t1: camPlan("F3", planH).t1, pos: [6.2, 1.62, 1.6], holds: [
    { t: 86.455, aim: D4C }, { t: 87.9, aim: [8.2, 0.6, 1.5] }, { t: 89.4, aim: [3.0, 0.5, 1.4] }, { t: 91.5, aim: [10.0, 0.75, 1.4] }, { t: 93.0, aim: D4C },
    { t: 94.9, yaw: -85, pitch: -42 }, { t: 97.6, aim: D4C }, { t: 99.3, aim: [4.2, 1.0, 1.4] }, { t: 101.2, aim: D4C }, { t: 103.2, aim: [3.0, 0.5, 1.4] } ] },
];
const aimOf = (pos: V3, a: V3) => ({ yaw: (Math.atan2(a[0] - pos[0], a[1] - pos[1]) * 180) / Math.PI, pitch: (Math.atan2(a[2] - pos[2], Math.hypot(a[0] - pos[0], a[1] - pos[1])) * 180) / Math.PI });
const shotState = (s: Shot, t: number) => {
  let xy: P2 = [s.pos[0], s.pos[1]];
  if (s.legs) {
    xy = s.legs[0].pts[0];
    for (const lg of s.legs) {
      if (t >= lg.t1) xy = lg.pts[lg.pts.length - 1];
      else if (t > lg.t0) { xy = alongPath(lg.pts, ease((t - lg.t0) / (lg.t1 - lg.t0))).pos; break; } else break;
    }
  }
  const pos: V3 = [xy[0], xy[1], s.z ? s.z(t) : s.pos[2]];
  const ang = (h: Hold) => (h.aim ? aimOf(pos, h.aim) : { yaw: h.yaw!, pitch: h.pitch! });
  let cur = ang(s.holds[0]);
  for (let i = 1; i < s.holds.length; i++) {
    const k = smooth(t, s.holds[i].t - 0.28, s.holds[i].t + 0.28);
    if (k > 0) { const a = ang(s.holds[i]); cur = { yaw: lerpAng(cur.yaw, a.yaw, k), pitch: lerp(cur.pitch, a.pitch, k) }; }
  }
  return { pos, yaw: cur.yaw, pitch: cur.pitch };
};
export const camAt = (t: number) => {
  let i = 0;
  while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t0) i++;
  const cur = shotState(SHOTS[i], t);
  const prev = i > 0 ? shotState(SHOTS[i - 1], t) : cur;
  const k = i === 0 ? 1 : smooth(t, SHOTS[i].t0, SHOTS[i].t0 + 0.55);
  let yaw = lerpAng(prev.yaw, cur.yaw, k), pitch = lerp(prev.pitch, cur.pitch, k);
  const pos = [0, 1, 2].map((j) => lerp(prev.pos[j], cur.pos[j], k)) as V3;
  // Camera biết thở: thở, run nhẹ, hoảng hơn về cuối
  const nerv = 0.5 + 0.5 * smooth(t, 60, 84);
  yaw += nerv * (0.5 * Math.sin(t * 1.3) + 0.25 * Math.sin(t * 3.1));
  pitch += nerv * 0.4 * Math.sin(t * 1.7 + 1) + 0.25 * Math.sin(t * 0.8);
  pos[2] += 0.006 * Math.sin(t * 1.9);
  let roll = 0.5 * Math.sin(t * 0.9);
  for (const s of sfx.shakes) {
    const d = t - s.t;
    if (d > 0 && d < 1.2) { const a = s.amp * Math.exp(-d * 5); yaw += a * Math.sin(d * 61); pitch += a * Math.sin(d * 47 + 1); roll += a * 0.5 * Math.sin(d * 53); }
  }
  for (const st of STEPS) {
    const b = pulse(t, st.t + 0.04, 0.1) * st.gain * (st.surface === "carpet" ? 0.85 : 1);
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

// ============================================================= ĐIỆN THOẠI ====
const drawPhone = (key: string, n = 6) => makeTex(360, 720, (c) => {
  const W = 360, H = 720;
  const txt = (s: string, x: number, y: number, size: number, col = "#fff", bold = true, align: CanvasTextAlign = "left") => { c.fillStyle = col; c.font = `${bold ? "bold " : ""}${size}px ${FONT}`; c.textAlign = align; c.fillText(s, x, y); };
  const card = (y: number, who: string, msg: string[], col = "#2a2e38") => { c.fillStyle = col; c.fillRect(16, y, W - 32, 44 + msg.length * 32); txt(who, 28, y + 26, 18, "#aab3c2", false); msg.forEach((m, i) => txt(m, 28, y + 60 + i * 32, 25)); };
  const bg = (a: string, b: string) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  if (key === "calling" || key === "incall" || key === "ring" || key === "dial911" || key === "in911") {
    bg("#17202c", "#0b0f16");
    const who = key.includes("911") ? "911" : "Mr. Pruitt";
    const sub = key === "calling" ? "calling…" : key === "ring" ? "incoming call" : key === "dial911" ? "Calling 911…" : key === "in911" ? "Emergency · 0:04" : "Landlord · 0:09";
    c.fillStyle = key.includes("911") ? "#8a1d28" : "#3a4b63"; c.beginPath(); c.arc(180, 200, 70, 0, 7); c.fill();
    txt(key.includes("911") ? "911" : "P", 180, 224, 62, "#fff", true, "center");
    txt(who, 180, 340, 44, "#fff", true, "center"); txt(sub, 180, 390, 26, "#9fb0c8", false, "center");
    if (key === "ring") { c.fillStyle = "#d02a38"; c.beginPath(); c.arc(90, 620, 44, 0, 7); c.fill(); c.fillStyle = "#2ba84f"; c.beginPath(); c.arc(270, 620, 44, 0, 7); c.fill(); }
    else { c.fillStyle = "#d02a38"; c.beginPath(); c.arc(180, 620, 44, 0, 7); c.fill(); txt("speaker ON", 180, 520, 22, "#9fb0c8", false, "center"); }
  } else if (key === "lock" || key === "msg1" || key === "msg2") {
    bg("#111a2e", "#05070d");
    txt("12:00", 180, 160, 88, "#fff", true, "center"); txt("AM", 180, 205, 30, "#c9d1e0", false, "center");
    if (key === "msg2") card(420, "Unknown number · now", ["Nice green hoodie.", "Go to sleep."], "#4a1c24");
    if (key === "msg1" || key === "msg2") card(key === "msg2" ? 300 : 330, "Unknown number", ["Don't knock back."], "#4a1c24");
  } else if (key === "flash") {
    c.fillStyle = "#06080c"; c.fillRect(0, 0, W, H); c.fillStyle = "#f3efe0"; c.beginPath(); c.arc(180, 330, 70, 0, 7); c.fill();
    txt("Flashlight ON", 180, 640, 24, "#c9d1e0", false, "center");
  } else if (key === "wifi") {
    c.fillStyle = "#0e1117"; c.fillRect(0, 0, W, H); txt("Wi-Fi", 24, 70, 36); txt("12:00 AM", 336, 70, 22, "#9aa3b2", false, "right");
    const names = ["4C_CAM_4B", "4C_CAM_4A", "4C_CAM_4D", "4C_CAM_3A", "4C_CAM_3B", "4C_CAM_3D"];
    names.slice(0, n).forEach((s, i) => { c.fillStyle = "#1a1f2a"; c.fillRect(16, 120 + i * 84, W - 32, 72); txt(s, 32, 168 + i * 84, 28); txt("▂▄▆", 330, 168 + i * 84, 24, "#7ad07a", true, "right"); });
    if (n === 0) txt("No networks found", 180, 360, 28, "#9aa3b2", false, "center");
  }
});
const screenAt = (t: number): { key: string; n?: number } => {
  if (t < 5.6) return { key: "calling" };
  if (t < 21) return { key: "incall" };
  if (t < BUZZ[0]) return { key: "lock" };
  if (t < BUZZ[1]) return { key: "msg1" };
  if (t < 31.7) return { key: "msg2" };
  if (t < 62.6) return { key: "flash" };
  if (t < 71.4) return { key: "lock" };
  if (t < RING[0]) return { key: "wifi", n: 6 };
  if (t < LINE["17"].start) return { key: "ring" };
  if (t < LINE["19"].start) return { key: "incall" };
  if (t < LINE["20"].start) return { key: "dial911" };
  if (t < 94.3) return { key: "in911" };
  return { key: "wifi", n: Math.max(0, 6 - Math.max(0, Math.floor((t - 95.5) / 0.5) + 1)) };
};

// ============================================================= POV-HÄNDE ====
const ICH = { skin: "#dba783", sleeve: "#5f8a4a", case: "#e0662f" };
const kf = (t: number, keys: number[][]) => {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const k = smooth(t, keys[i - 1][0], keys[i][0]);
      return keys[i].slice(1).map((v, j) => lerp(keys[i - 1][j + 1], v, k));
    }
  }
  return keys[keys.length - 1].slice(1);
};
// tay trái: [t, x, y, z, rx, curl]  (toạ độ camera: x phải, y lên, −z phía trước)
const LEFT: number[][] = [
  [0, -0.24, -0.27, -0.42, -0.1, 0.35], [19.6, -0.24, -0.27, -0.42, -0.1, 0.35], [20.6, -0.10, -0.04, -0.68, 0.6, 1.0], [22.0, -0.10, -0.04, -0.68, 0.6, 1.0],
  [22.8, -0.22, -0.22, -0.40, -0.1, 0.4], [26.0, -0.22, -0.22, -0.40, -0.1, 0.4], [26.9, -0.02, -0.30, -0.38, 0.2, 0.7], [28.8, -0.02, -0.30, -0.38, 0.2, 0.7],
  [29.8, -0.20, -0.20, -0.40, 0, 0.4], [31.7, -0.20, -0.20, -0.40, 0, 0.4], [32.3, -0.24, -0.30, -0.35, -0.3, 0.2], [33.6, -0.24, -0.30, -0.35, -0.3, 0.2],
  [33.95, -0.09, -0.10, -0.55, 0.3, 0.7], [34.4, -0.08, -0.10, -0.42, 0.2, 0.95], [35.1, -0.24, -0.28, -0.40, -0.2, 0.3], [37.3, -0.24, -0.28, -0.40, -0.2, 0.3],
  [38.0, -0.05, -0.15, -0.52, 0.5, 0.15], [39.9, -0.05, -0.15, -0.52, 0.5, 0.15], [40.7, -0.24, -0.28, -0.40, -0.2, 0.3], [44.6, -0.22, -0.26, -0.40, -0.2, 0.3],
  [45.8, -0.02, -0.22, -0.50, 0.3, 0.1], [48.3, -0.02, -0.22, -0.50, 0.3, 0.1], [48.7, -0.12, -0.28, -0.42, 0.1, 0.8], [60.0, -0.12, -0.28, -0.42, 0.1, 0.8],
  [60.8, -0.20, -0.26, -0.40, 0, 0.5], [63.0, -0.20, -0.26, -0.40, 0, 0.5], [63.5, -0.04, -0.02, -0.52, 0.5, 0.3], [63.9, -0.04, -0.02, -0.52, 0.5, 0.85],
  [64.5, -0.04, -0.07, -0.36, 0.2, 0.85], [66.4, -0.04, -0.07, -0.36, 0.2, 0.85], [67.4, -0.20, -0.30, -0.40, 0, 0.9], [84.1, -0.20, -0.30, -0.40, 0, 0.9],
  [84.35, -0.10, -0.16, -0.36, 0, 1.0], [84.95, -0.08, -0.10, -0.52, 0.3, 0.4], [85.4, -0.08, -0.06, -0.55, 0.2, 0.85], [86.1, -0.30, -0.12, -0.34, -0.4, 0.9],
  [105.5, -0.30, -0.12, -0.34, -0.4, 0.9],
];
// tay phải + điện thoại: [t, x, y, z, tilt]
const RIGHT: number[][] = [
  [0, 0.15, -0.14, -0.34, 0.35], [21, 0.15, -0.14, -0.34, 0.35], [22.0, 0.10, -0.10, -0.33, 0.55], [29.7, 0.10, -0.10, -0.33, 0.55], [31.8, 0.15, -0.17, -0.34, 0.45],
  [43.3, 0.14, -0.17, -0.34, 0.55], [44.2, 0.15, -0.20, -0.34, 0.95], [60.0, 0.15, -0.20, -0.34, 0.95], [62.6, 0.15, -0.18, -0.34, 0.4],
  [66.8, 0.14, -0.16, -0.34, 0.3], [71.3, 0.08, -0.08, -0.32, 0.62], [76.0, 0.08, -0.08, -0.32, 0.62], [78.3, 0.15, -0.18, -0.34, 0.4],
  [80.0, 0.12, -0.04, -0.30, 0.9], [83.0, 0.12, -0.12, -0.30, 0.6], [84.2, 0.15, -0.18, -0.34, 0.4], [86.5, 0.10, -0.10, -0.32, 0.55],
  [94.4, 0.08, -0.08, -0.30, 0.65], [98.0, 0.09, -0.10, -0.32, 0.55], [105.5, 0.09, -0.10, -0.32, 0.55],
];

const arm = (a: THREE.Vector3, b: THREE.Vector3) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return { pos: a.clone().add(b).multiplyScalar(0.5).toArray() as V3, rot: new THREE.Euler().setFromQuaternion(q), len: a.distanceTo(b) };
};

const PovHands: React.FC<{ t: number }> = ({ t }) => {
  const { pos, yaw, pitch, roll } = camAt(t);
  const screens = useMemo(() => {
    const m: Record<string, THREE.Texture> = {};
    for (const k of ["calling", "incall", "lock", "msg1", "msg2", "flash", "ring", "dial911", "in911"]) m[k] = drawPhone(k);
    for (let n = 0; n <= 6; n++) m[`wifi${n}`] = drawPhone("wifi", n);
    return m;
  }, []);
  const sc = screenAt(t);
  const tex = sc.key === "wifi" ? screens[`wifi${sc.n}`] : screens[sc.key];
  const skin = mat(ICH.skin, "skin"), sleeve = mat(ICH.sleeve, "cloth");
  const w = walking(t);
  const swing = Math.sin(t * Math.PI * 2);
  // phải: điện thoại
  const [rx0, ry0, rz0, tilt] = kf(t, RIGHT);
  const shakeP = 0.002 * Math.sin(t * 37) * (0.4 + 0.6 * smooth(t, 60, 84));
  const px = rx0 - 0.015 * w, py = ry0 + shakeP + 0.012 * w * swing, pz = rz0;
  // trái: kf + gõ tường + vung tay khi đi
  let [lx, ly, lz, lrx, curl] = kf(t, LEFT);
  const hit = myKnockHit(t);
  if (t > 20.5 && t < 22.2) lz += 0.05 * (1 - hit);
  lx += 0.03 * w * swing; ly += 0.02 * w * swing; lz += 0.05 * w * Math.cos(t * Math.PI * 2);
  ly += 0.004 * Math.sin(t * 1.7);
  const rA = arm(new THREE.Vector3(px + 0.03, py - 0.06, pz + 0.02), new THREE.Vector3(0.3, -0.5, -0.05));
  const lA = arm(new THREE.Vector3(lx, ly - 0.03, lz + 0.05), new THREE.Vector3(-0.32, -0.5, -0.05));
  const holdNote = t >= 63.9;
  const holdCollar = t >= T_GRAB && t < T_POCKET;
  return (
    <group position={W3(pos[0], pos[1], pos[2])} rotation={new THREE.Euler(deg(pitch), -deg(yaw), deg(roll), "YXZ")}>
      {/* điện thoại bên phải */}
      <group position={[px, py, pz]} rotation={[tilt, -0.15, 0.05]}>
        <mesh geometry={boxGeo} material={mat(ICH.case)} scale={[0.072, 0.15, 0.01]} />
        <mesh position={[0, 0, 0.0052]}><planeGeometry args={[0.065, 0.138]} /><meshBasicMaterial map={tex} /></mesh>
        <group position={[0.045, -0.055, -0.012]}>
          <mesh geometry={G.sphere(1)} material={skin} scale={[0.028, 0.052, 0.024]} />
          <mesh geometry={G.capsule(0.0105, 0.03)} material={skin} position={[-0.018, 0.02, 0.019]} rotation={[0.15, 0, 1.1]} />
          {[0, 1, 2, 3].map((k) => <mesh key={k} geometry={G.capsule(0.0085, 0.026)} material={skin} position={[-0.012, 0.03 - k * 0.019, -0.016]} rotation={[0, 0, 1.45]} />)}
        </group>
      </group>
      <mesh geometry={G.capsule(0.045, rA.len)} material={sleeve} position={rA.pos} rotation={rA.rot} />
      {/* tay trái: tựa chăn → gõ tường → kéo tay áo → chốt cửa → vòng cổ → mẩu giấy → khung cửa */}
      <group position={[lx, ly, lz]} rotation={[lrx, 0.3, 0.15]}>
        <mesh geometry={G.sphere(1)} material={skin} scale={[0.045, 0.014 + 0.01 * (1 - curl), 0.05]} />
        {[0, 1, 2, 3].map((k) => (
          <group key={k} position={[-0.03 + k * 0.02, 0, -0.045]} rotation={[-curl * 1.35, 0, (k - 1.5) * 0.06]}>
            <mesh geometry={G.capsule(0.009, 0.04)} material={skin} position={[0, 0, -0.025]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
        <mesh geometry={G.capsule(0.01, 0.035)} material={skin} position={[0.045, 0, -0.02]} rotation={[Math.PI / 2, 0, -0.7 + 0.5 * curl]} />
        {holdNote && <mesh position={[0.0, 0.03, -0.06]} rotation={[0.9, 0.2, 0.3]}><boxGeometry args={[0.07, 0.07, 0.006]} /><meshBasicMaterial color="#f2d95c" /></mesh>}
        {holdCollar && <group position={[0, -0.03, -0.07]} rotation={[0.3, 0, 0]}><Collar at={[0, 0, 0]} /></group>}
      </group>
      <mesh geometry={G.capsule(0.045, lA.len)} material={sleeve} position={lA.pos} rotation={lA.rot} />
    </group>
  );
};

// ================================================================= SZENE ====
export const NextdoorRaw: React.FC<{ at?: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  setLowPoly(false);
  const t = at ?? frame / FPS;
  const inRoom = smooth(camAt(t).pos[1], 1.9, 2.2);
  const dark = t > IMPACT && t < IMPACT + 1.4 ? (hash(Math.floor(t * 15)) > 0.4 ? 0 : 0.5) : 0;
  return (
    <AbsoluteFill style={{ background: "#07090d", filter: STYLE.grade }}>
      <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: VFOV, near: 0.03, far: 400 }}>
        <CameraRig t={t} />
        <Hall t={t} />
        <Apartment t={t} />
        <Neighbors t={t} />
        <RosaArm t={t} />
        <PovHands t={t} />
      </ThreeCanvas>
      {/* đêm: nhân lạnh trong phòng, vàng ố ngoài hành lang */}
      <AbsoluteFill style={{ background: inRoom > 0.5 ? "#8e98b8" : "#a39c86", mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(0,0,0,0) 50%, rgba(2,4,10,.6) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "#000", opacity: dark, pointerEvents: "none" }} />
      {t > 32.1 && t < 62.6 && <AbsoluteFill style={{ background: "radial-gradient(ellipse 38% 42% at 54% 46%, rgba(255,240,210,.20), rgba(255,240,210,0) 100%)", mixBlendMode: "screen", pointerEvents: "none" }} />}
    </AbsoluteFill>
  );
};
