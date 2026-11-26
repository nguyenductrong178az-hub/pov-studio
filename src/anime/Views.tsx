import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { G } from "../character/materials";
import { Ren, REN_RIG } from "./Ren";
import { ANIME_STYLES, REN } from "./styles";

export type View = "frontal" | "dreiviertel" | "seitlich" | "gesicht";
export const VIEWS: { id: View; label: string; rot: number }[] = [
  { id: "frontal", label: "FRONTAL", rot: 0 },
  { id: "dreiviertel", label: "3/4", rot: Math.PI / 4 },
  { id: "seitlich", label: "SEITLICH", rot: Math.PI / 2 },
  { id: "gesicht", label: "NAHAUFNAHME GESICHT", rot: 0.28 },
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

export const RenView: React.FC<{ styleId: string; view: View }> = ({ styleId, view }) => {
  const s = ANIME_STYLES.find((x) => x.id === styleId)!;
  const v = VIEWS.find((x) => x.id === view)!;
  const { width, height } = useVideoConfig();
  const face = view === "gesicht";
  const H = REN_RIG.top;
  const zoom = 900 / H; // Figur von y≈120px bis y≈1020px
  const camY = (H * (1020 - 540)) / 900;
  const headY = REN_RIG.headY;
  return (
    <AbsoluteFill style={{ background: s.bg }}>
      {face ? (
        <ThreeCanvas width={width} height={height} flat camera={{ fov: 18, near: 0.1, far: 100 }}>
          <Cam pos={[0, headY + 0.02, 2.0]} target={[0, headY - 0.03, 0]} />
          <Ren style={s} rotationY={v.rot} outlineMul={s.faceOutline} />
        </ThreeCanvas>
      ) : (
        <ThreeCanvas width={width} height={height} orthographic flat camera={{ near: 0.1, far: 100 }}>
          <Cam pos={[0, camY, 20]} target={[0, camY, 0]} zoom={zoom} />
          <mesh geometry={G.circle(0.42)} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
            <meshBasicMaterial color="#000000" transparent opacity={0.1} depthWrite={false} />
          </mesh>
          <Ren style={s} rotationY={v.rot} />
        </ThreeCanvas>
      )}
      <div style={{ position: "absolute", top: 56, left: 72, color: s.ink, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div style={{ fontSize: 20, letterSpacing: 6, opacity: 0.6 }}>REN · {v.label}</div>
        <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6 }}>{s.name}</div>
        <div style={{ fontSize: 20, marginTop: 6, opacity: 0.75, maxWidth: 520, lineHeight: 1.35 }}>{s.tagline}</div>
      </div>
      <div style={{ position: "absolute", bottom: 56, left: 72, display: "flex", gap: 10 }}>
        {[REN.hair, REN.hoodie, REN.skin, REN.shoes, REN.red, REN.iris].map((c, i) => (
          <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: c, border: `2px solid ${s.ink}` }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
