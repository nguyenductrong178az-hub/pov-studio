import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { G } from "../character/materials";
import { Figure, figureRig } from "../cast/Figure";
import { SKIN } from "../cast/cast";
import { PROBE, RICHTUNGEN, richtung, type Richtung } from "./richtungen";

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

const font = "Helvetica, Arial, sans-serif";
const Head: React.FC<{ r: Richtung; sub: string }> = ({ r, sub }) => (
  <div style={{ position: "absolute", top: 50, left: 64, color: r.ink, fontFamily: font, maxWidth: 1000 }}>
    <div style={{ fontSize: 20, letterSpacing: 6, opacity: 0.7 }}>{sub}</div>
    <div style={{ fontSize: 50, fontWeight: 800, marginTop: 6 }}>{r.name}</div>
    <div style={{ fontSize: 21, marginTop: 8, opacity: 0.85, lineHeight: 1.35 }}>{r.tagline}</div>
  </div>
);

export const StilFigur: React.FC<{ id: string }> = ({ id }) => {
  const r = richtung(id);
  const { width, height } = useVideoConfig();
  const { top } = figureRig(PROBE);
  const zoom = 880 / top;
  const camY = (top * (1010 - 540)) / 880;
  return (
    <AbsoluteFill style={{ background: r.bg }}>
      <AbsoluteFill style={{ filter: r.grade }}>
        <ThreeCanvas width={width} height={height} orthographic flat camera={{ near: 0.1, far: 100 }}>
          <Cam pos={[0, camY, 20]} target={[0, camY, 0]} zoom={zoom} />
          <mesh geometry={G.circle(0.38)} position={[1.05, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[3, 0.6, 1]}>
            <meshBasicMaterial color="#000000" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <group position={[0.35, 0, 0]}><Figure f={PROBE} style={r} rotationY={Math.PI / 5} /></group>
          <group position={[1.75, 0, 0]}><Figure f={PROBE} style={r} rotationY={-Math.PI / 2} /></group>
        </ThreeCanvas>
      </AbsoluteFill>
      <Head r={r} sub="GANZKÖRPER · 3/4 + SEITE · TESTFIGUR MIKA" />
    </AbsoluteFill>
  );
};

export const StilGesicht: React.FC<{ id: string }> = ({ id }) => {
  const r = richtung(id);
  const { width, height } = useVideoConfig();
  const { headY, R } = figureRig(PROBE);
  const k = R / 0.26;
  return (
    <AbsoluteFill style={{ background: r.bg }}>
      <AbsoluteFill style={{ filter: r.grade }}>
        <ThreeCanvas width={width} height={height} flat camera={{ fov: 20, near: 0.1, far: 100 }}>
          <Cam pos={[-0.32 * k, headY + 0.1 * k, 3.4 * k]} target={[-0.32 * k, headY + 0.05 * k, 0]} />
          <Figure f={PROBE} style={r} rotationY={0.3} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Head r={r} sub="NAHAUFNAHME GESICHT" />
    </AbsoluteFill>
  );
};

// Schattenton = Farbe × Schatten-Multiplikator (linear), wie im Shader
const shade = (hex: string, m: [number, number, number]) => {
  const c = new THREE.Color(hex);
  c.r *= m[0]; c.g *= m[1]; c.b *= m[2];
  return "#" + c.getHexString();
};

export const StilPalette: React.FC<{ id: string }> = ({ id }) => {
  const r = richtung(id);
  const m = r.shading.shadow;
  const sw = (hex: string, size = 120) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", border: `2px solid ${r.ink}33`, filter: r.grade }}>
        <div style={{ width: size, height: size, background: hex }} />
        <div style={{ width: size * 0.55, height: size, background: shade(hex, m) }} />
      </div>
    </div>
  );
  const row: React.CSSProperties = { display: "flex", gap: 28, marginTop: 18, flexWrap: "wrap" };
  const label: React.CSSProperties = { fontSize: 19, marginTop: 6, textAlign: "center", width: 186, lineHeight: 1.25 };
  return (
    <AbsoluteFill style={{ background: r.bg, color: r.ink, fontFamily: font, padding: "250px 64px 40px" }}>
      <Head r={r} sub="FARBPALETTE · LICHT | SCHATTEN" />
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, opacity: 0.8 }}>LEITFARBEN</div>
      <div style={row}>
        {r.palette.map((p) => (
          <div key={p.hex}>{sw(p.hex)}<div style={label}>{p.name}<br /><b>{p.hex}</b></div></div>
        ))}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, opacity: 0.8, marginTop: 34 }}>HAUTTÖNE 1–6 IN DIESEM LICHT</div>
      <div style={row}>
        {SKIN.map((h, i) => (
          <div key={h}>{sw(h, 92)}<div style={{ ...label, width: 150 }}>Stufe {i + 1}<br /><b>{h}</b> → {shade(h, m)}</div></div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 64, right: 64, bottom: 44, fontSize: 21, lineHeight: 1.5, opacity: 0.9 }}>
        {r.rules.map((t) => <div key={t}>• {t.replace(/`/g, "")}</div>)}
      </div>
    </AbsoluteFill>
  );
};

export const STIL_IDS = RICHTUNGEN.map((r) => r.id);
