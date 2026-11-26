import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Fino, getRig } from "./Fino";
import { G } from "./materials";
import { STYLES, type CharStyle } from "./styles";

const CameraRig: React.FC<{ pos: [number, number, number]; target: [number, number, number]; zoom?: number }> = ({ pos, target, zoom }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...target);
    if (zoom) camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, pos, target, zoom]);
  return null;
};

const Shadow: React.FC<{ x: number; r: number }> = ({ x, r }) => (
  <mesh geometry={G.circle(r)} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <meshBasicMaterial color="#000000" transparent opacity={0.14} depthWrite={false} />
  </mesh>
);

const Header: React.FC<{ s: CharStyle; sub: string }> = ({ s, sub }) => (
  <div style={{ position: "absolute", top: 48, left: 72, right: 72, color: s.ink, fontFamily: "Helvetica, Arial, sans-serif" }}>
    <div style={{ fontSize: 22, letterSpacing: 6, opacity: 0.7 }}>FINO · {sub}</div>
    <div style={{ fontSize: 56, fontWeight: 800, marginTop: 4 }}>{s.name}</div>
    <div style={{ fontSize: 24, marginTop: 6, opacity: 0.85 }}>{s.tagline}</div>
  </div>
);

const Swatches: React.FC<{ s: CharStyle }> = ({ s }) => (
  <div style={{ position: "absolute", top: 60, right: 72, display: "flex", gap: 10 }}>
    {[s.palette.hoodie, s.palette.accent, s.palette.hair, s.palette.skin, s.palette.pants, s.palette.iris].map((c, i) => (
      <div key={i} style={{ width: 44, height: 44, borderRadius: 10, background: c, border: `3px solid ${s.ink}` }} />
    ))}
  </div>
);

export const Turnaround: React.FC<{ styleId: string }> = ({ styleId }) => {
  const s = STYLES.find((x) => x.id === styleId)!;
  const { width, height } = useVideoConfig();
  const H = getRig(s).top + 0.05;
  const zoom = 720 / H; // Figur zwischen y≈210px und y≈930px
  const camY = (H * (930 - 540)) / 720;
  const spacing = 560 / zoom;
  const views = [
    { label: "VORNE", rot: 0 },
    { label: "DREIVIERTEL", rot: Math.PI / 4 },
    { label: "SEITE", rot: Math.PI / 2 },
  ];
  return (
    <AbsoluteFill style={{ background: s.bg }}>
      <ThreeCanvas width={width} height={height} orthographic flat camera={{ near: 0.1, far: 100 }}>
        <CameraRig pos={[0, camY, 20]} target={[0, camY, 0]} zoom={zoom} />
        {views.map((v, i) => (
          <group key={v.label}>
            <Shadow x={(i - 1) * spacing} r={0.45 * s.proportions.chunk} />
            <Fino style={s} position={[(i - 1) * spacing, 0, 0]} rotationY={v.rot} />
          </group>
        ))}
      </ThreeCanvas>
      <Header s={s} sub="TURNAROUND" />
      <Swatches s={s} />
      {views.map((v, i) => (
        <div key={v.label} style={{ position: "absolute", top: 965, left: 960 + (i - 1) * 560 - 200, width: 400, textAlign: "center", color: s.ink, fontFamily: "Helvetica, Arial, sans-serif", fontSize: 26, letterSpacing: 6, fontWeight: 700 }}>
          {v.label}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const FaceCloseup: React.FC<{ styleId: string }> = ({ styleId }) => {
  const s = STYLES.find((x) => x.id === styleId)!;
  const { width, height } = useVideoConfig();
  const { headY, headR } = getRig(s);
  const dist = (headR / 0.42) * 3.5;
  return (
    <AbsoluteFill style={{ background: s.bg }}>
      <ThreeCanvas width={width} height={height} flat camera={{ fov: 24, near: 0.1, far: 100 }}>
        <CameraRig pos={[0, headY + 0.1 * (headR / 0.42), dist]} target={[-0.04 * (headR / 0.42), headY + 0.08 * (headR / 0.42), 0]} />
        <Fino style={s} rotationY={0.32} outlineMul={0.6} />
      </ThreeCanvas>
      <Header s={s} sub="GESICHT · NAHAUFNAHME" />
    </AbsoluteFill>
  );
};
