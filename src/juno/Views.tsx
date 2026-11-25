import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { G } from "../character/materials";
import { Juno, JUNO_RIG } from "./Juno";
import { JUNO, JUNO_STYLES } from "./styles";

export type JView = "frontal" | "dreiviertel" | "seitlich" | "gesicht";
export const JVIEWS: { id: JView; label: string; rot: number }[] = [
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

export const JunoView: React.FC<{ styleId: string; view: JView }> = ({ styleId, view }) => {
  const s = JUNO_STYLES.find((x) => x.id === styleId)!;
  const v = JVIEWS.find((x) => x.id === view)!;
  const { width, height } = useVideoConfig();
  const H = JUNO_RIG.top;
  const zoom = 880 / H;
  const camY = (H * (1010 - 540)) / 880;
  const hy = JUNO_RIG.headY;
  return (
    <AbsoluteFill style={{ background: s.bg }}>
      {view === "gesicht" ? (
        <ThreeCanvas width={width} height={height} flat camera={{ fov: 20, near: 0.1, far: 100 }}>
          <Cam pos={[0, hy + 0.1, 3.1]} target={[0, hy + 0.07, 0]} />
          <Juno style={s} rotationY={v.rot} outlineMul={s.faceOutline} />
        </ThreeCanvas>
      ) : (
        <ThreeCanvas width={width} height={height} orthographic flat camera={{ near: 0.1, far: 100 }}>
          <Cam pos={[0, camY, 20]} target={[0, camY, 0]} zoom={zoom} />
          <mesh geometry={G.circle(0.38)} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]}>
            <meshBasicMaterial color="#000000" transparent opacity={0.13} depthWrite={false} />
          </mesh>
          <Juno style={s} rotationY={v.rot} />
        </ThreeCanvas>
      )}
      <div style={{ position: "absolute", top: 56, left: 72, color: s.ink, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ fontSize: 20, letterSpacing: 6, opacity: 0.65 }}>JUNO · {v.label}</div>
        <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6 }}>{s.name}</div>
        <div style={{ fontSize: 20, marginTop: 6, opacity: 0.8, maxWidth: 520, lineHeight: 1.35 }}>{s.tagline}</div>
      </div>
      <div style={{ position: "absolute", bottom: 56, left: 72, display: "flex", gap: 10 }}>
        {[JUNO.beanie, JUNO.sweater, JUNO.pants, JUNO.hair, JUNO.skin, JUNO.shoes].map((c, i) => (
          <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: c, border: `2px solid ${s.ink}` }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
