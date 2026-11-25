import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const RING_COUNT = 40;
const RING_SPACING = 6;

// POV-Kamera: Position wird rein aus dem Frame berechnet (deterministisch).
const PovCamera: React.FC<{ frame: number; duration: number }> = ({ frame, duration }) => {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const z = -interpolate(frame, [0, duration], [0, 150], {
      easing: Easing.inOut(Easing.cubic),
    });
    const sway = Math.sin(frame / 25) * 0.6;
    camera.position.set(sway, Math.cos(frame / 31) * 0.4, z);
    camera.lookAt(sway * 0.5, 0, z - 10);
    camera.rotation.z = Math.sin(frame / 40) * 0.08; // leichtes Rollen
  }, [frame, duration, camera]);
  return null;
};

export const PovTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#05010f" }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 75, near: 0.1, far: 300 }}>
        <PovCamera frame={frame} duration={durationInFrames} />
        <fog attach="fog" args={["#05010f", 10, 90]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, -20]} intensity={200} color="#ff3fd8" />
        {Array.from({ length: RING_COUNT }).map((_, i) => {
          const hue = (i * 9 + frame) % 360;
          return (
            <mesh
              key={i}
              position={[0, 0, -i * RING_SPACING]}
              rotation={[0, 0, i * 0.3 + frame * 0.01 * (i % 2 ? 1 : -1)]}
            >
              <torusGeometry args={[4, 0.12, 12, 6]} />
              <meshStandardMaterial
                color={`hsl(${hue}, 90%, 60%)`}
                emissive={`hsl(${hue}, 90%, 45%)`}
                emissiveIntensity={1.2}
              />
            </mesh>
          );
        })}
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 60,
          opacity: fadeIn,
          color: "white",
          fontFamily: "sans-serif",
          fontSize: 48,
          letterSpacing: 8,
        }}
      >
        POV STUDIO · TEST RENDER
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
