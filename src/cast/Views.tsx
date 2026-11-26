import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { G } from "../character/materials";
import { Juno, JUNO_RIG } from "../juno/Juno";
import { JUNO } from "../juno/styles";
import { CAST } from "./cast";
import { Figure, figureRig } from "./Figure";

// Fester Kanal-Stil: D · Comic-Linie
import { KANAL_STIL } from "../stile/richtungen";
const KANAL = KANAL_STIL;

export type CView = "frontal" | "dreiviertel" | "seitlich" | "gesicht";
export const CVIEWS: { id: CView; label: string; rot: number }[] = [
  { id: "frontal", label: "FRONTAL", rot: 0 },
  { id: "dreiviertel", label: "3/4", rot: Math.PI / 4 },
  { id: "seitlich", label: "SEITLICH", rot: Math.PI / 2 },
  { id: "gesicht", label: "NAHAUFNAHME GESICHT", rot: 0.3 },
];

const Cam: React.FC<{ pos: [number, number, number]; target: [number, number, number]; zoom?: number }> = ({ pos, target, zoom }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...target);
    if (zoom) camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, pos, target, zoom]);
  return null;
};

const Label: React.FC<{ title: string; sub: string; line: string; swatches: string[] }> = ({ title, sub, line, swatches }) => (
  <>
    <div style={{ position: "absolute", top: 56, left: 72, color: KANAL.ink, fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ fontSize: 20, letterSpacing: 6, opacity: 0.65 }}>{sub}</div>
      <div style={{ fontSize: 48, fontWeight: 800, marginTop: 6 }}>{title}</div>
      <div style={{ fontSize: 22, marginTop: 6, opacity: 0.8 }}>{line}</div>
    </div>
    <div style={{ position: "absolute", bottom: 56, left: 72, display: "flex", gap: 10 }}>
      {swatches.map((c, i) => <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: c, border: `2px solid ${KANAL.ink}` }} />)}
    </div>
  </>
);

export const CastView: React.FC<{ figId: string; view: CView }> = ({ figId, view }) => {
  const f = CAST.find((x) => x.id === figId)!;
  const v = CVIEWS.find((x) => x.id === view)!;
  const { width, height } = useVideoConfig();
  const { headY, R, top } = figureRig(f);
  const H = top;
  const zoom = 880 / H;
  const camY = (H * (1010 - 540)) / 880;
  const k = R / 0.26;
  return (
    <AbsoluteFill style={{ background: KANAL.bg }}>
      <AbsoluteFill style={{ filter: KANAL.grade }}>
      {view === "gesicht" ? (
        <ThreeCanvas width={width} height={height} flat camera={{ fov: 20, near: 0.1, far: 100 }}>
          <Cam pos={[0, headY + 0.1 * k, 3.25 * k]} target={[0, headY + 0.07 * k, 0]} />
          <Figure f={f} style={KANAL} rotationY={v.rot} />
        </ThreeCanvas>
      ) : (
        <ThreeCanvas width={width} height={height} orthographic flat camera={{ near: 0.1, far: 100 }}>
          <Cam pos={[0, camY, 20]} target={[0, camY, 0]} zoom={zoom} />
          <mesh geometry={G.circle(0.38)} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]}>
            <meshBasicMaterial color="#000000" transparent opacity={0.13} depthWrite={false} />
          </mesh>
          <Figure f={f} style={KANAL} rotationY={v.rot} />
        </ThreeCanvas>
      )}
      </AbsoluteFill>
      <Label title={f.name} sub={`${v.label} · STIL D`} line={f.role} swatches={[f.hair.color, f.top.color, f.bottom.color, f.accent, f.skin, f.eyes.iris]} />
    </AbsoluteFill>
  );
};

// Alle Figuren nebeneinander (Ähnlichkeits-Check), Juno als Referenz links
export const CastLineup: React.FC = () => {
  const { width, height } = useVideoConfig();
  const tallest = Math.max(JUNO_RIG.top, ...CAST.map((f) => figureRig(f).top));
  const zoom = 780 / tallest;
  const camY = (tallest * (990 - 540)) / 780;
  const n = CAST.length + 1;
  const spacing = 1700 / zoom / (n - 1);
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * spacing);
  const names = ["Juno", ...CAST.map((f) => f.name)];
  return (
    <AbsoluteFill style={{ background: KANAL.bg }}>
      <ThreeCanvas width={width} height={height} orthographic flat camera={{ near: 0.1, far: 100 }}>
        <Cam pos={[0, camY, 20]} target={[0, camY, 0]} zoom={zoom} />
        <group position={[xs[0], 0, 0]}><Juno style={KANAL} /></group>
        {CAST.map((f, i) => <Figure key={f.id} f={f} style={KANAL} position={[xs[i + 1], 0, 0]} />)}
      </ThreeCanvas>
      {names.map((nm, i) => (
        <div key={nm} style={{ position: "absolute", top: 1010, left: 960 + xs[i] * zoom - 120, width: 240, textAlign: "center", color: KANAL.ink, fontFamily: "Helvetica, Arial, sans-serif", fontSize: 24, fontWeight: 700 }}>{nm}</div>
      ))}
      <div style={{ position: "absolute", top: 48, left: 72, color: KANAL.ink, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ fontSize: 20, letterSpacing: 6, opacity: 0.65 }}>FIGUREN-REGISTER · STIL D</div>
        <div style={{ fontSize: 44, fontWeight: 800, marginTop: 4 }}>Klassenzimmer-Cast</div>
      </div>
      <div style={{ display: "none" }}>{JUNO.skin}</div>
    </AbsoluteFill>
  );
};
