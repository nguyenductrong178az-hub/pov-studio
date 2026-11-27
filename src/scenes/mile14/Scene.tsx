// Mile 14 · Tập 1 · CẢNH THỬ bối cảnh (C15–C16): đi tới xe bán tải dưới mưa, 2:18 AM.
// Hướng "gần thật": chất liệu PBR (MeshStandard/Physical), đèn vật lý, tone mapping ACES, sương, mưa hạt.
// Chưa có Cole: mô hình người sẽ thêm khi có mô hình Meshy (C17).
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const FPS = 30;
export const DURATION_S = 3.5;
type V3 = [number, number, number];
const deg = (d: number) => (d * Math.PI) / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number, a: number, b: number) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// deterministic hash → [0,1)
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- textures
export const canvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, color = true) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  if (color) tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  return tx;
};
// bùn ướt: nền nâu sẫm, vệt bánh xe, vũng nước (vũng = roughness thấp)
const useMud = () => useMemo(() => {
  const blobs = Array.from({ length: 90 }, (_, i) => ({ x: rnd(i) * 1024, y: rnd(i + 99) * 1024, r: 20 + rnd(i + 7) * 90 }));
  const col = canvasTex(1024, 1024, (c) => {
    c.fillStyle = "#4a3c30"; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 5000; i++) { const g = 25 + rnd(i * 3) * 40; c.fillStyle = `rgba(${g + 12},${g + 4},${g - 4},.35)`; c.fillRect(rnd(i) * 1024, rnd(i + 1) * 1024, 2 + rnd(i + 2) * 5, 2 + rnd(i + 5) * 5); }
    c.fillStyle = "rgba(15,12,10,.55)"; for (const x of [330, 470, 560, 700]) c.fillRect(x, 0, 46, 1024); // vệt bánh
    blobs.forEach((b) => { c.fillStyle = "rgba(20,22,26,.8)"; c.beginPath(); c.ellipse(b.x, b.y, b.r, b.r * 0.6, 0, 0, 7); c.fill(); });
  });
  const rough = canvasTex(1024, 1024, (c) => {
    c.fillStyle = "#9a9a9a"; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 3000; i++) { const g = 120 + rnd(i * 5) * 90; c.fillStyle = `rgb(${g},${g},${g})`; c.fillRect(rnd(i + 3) * 1024, rnd(i + 4) * 1024, 3, 3); }
    c.fillStyle = "#3a3a3a"; for (const x of [330, 470, 560, 700]) c.fillRect(x + 6, 0, 34, 1024);
    blobs.forEach((b) => { c.fillStyle = "#0c0c0c"; c.beginPath(); c.ellipse(b.x, b.y, b.r * 0.9, b.r * 0.55, 0, 0, 7); c.fill(); });
  }, false);
  for (const t of [col, rough]) t.repeat.set(3, 3);
  return { col, rough };
}, []);
const useBark = () => useMemo(() => canvasTex(128, 512, (c) => {
  c.fillStyle = "#2a1f18"; c.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(10,8,6,${0.3 + rnd(i) * 0.5})`; c.fillRect(rnd(i + 1) * 128, rnd(i + 2) * 512, 2 + rnd(i + 3) * 4, 20 + rnd(i + 4) * 60); }
}), []);
const useGlow = () => useMemo(() => canvasTex(256, 256, (c) => {
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,250,235,1)"); g.addColorStop(0.08, "rgba(255,240,210,.9)"); g.addColorStop(0.3, "rgba(255,220,170,.25)"); g.addColorStop(1, "rgba(255,200,150,0)");
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
}), []);
const useTarp = () => useMemo(() => canvasTex(512, 512, (c) => {
  c.fillStyle = "#1d2c2a"; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(0,0,0,${0.2 + rnd(i) * 0.3})`; c.lineWidth = 2 + rnd(i + 1) * 6; c.beginPath(); const y = rnd(i + 2) * 512; c.moveTo(0, y); c.bezierCurveTo(170, y + 30 * (rnd(i + 3) - 0.5), 340, y - 30 * rnd(i + 4), 512, y + 20 * (rnd(i + 5) - 0.5)); c.stroke(); }
}), []);

// ---------------------------------------------------------------- layout (m)
// Đường đất chạy theo trục z. Camera đi từ z=+9 về phía xe bán tải.
// Xe bán tải đỗ lệch xuống lề phải, đầu xe hướng về phía camera (đèn pha chói ống kính).
const TRUCK = { x: 1.9, z: -1.5, yaw: deg(-9) };
const CRUISER = { x: -1.4, z: -9.5, yaw: deg(3) };

// ---------------------------------------------------------------- camera (POV, 1,6 m)
const STEP_T = [0.25, 0.75, 1.25, 1.75]; // 4 bước (C15)
export const RAW_HFOV = 130;
const VFOV = (2 * Math.atan(Math.tan(deg(RAW_HFOV / 2)) * (9 / 16)) * 180) / Math.PI;
let C17 = false;
let TALK = false;
let CABIN = false; // C20–C21: đi vòng đầu xe, vũng nước trên capô gợn, cúi soi ghế phụ (7,5 s)
export const CABIN_DURATION_S = 7.5;
// toạ độ cục bộ của xe (m, +z = đầu xe, +x = bên lái) → thế giới (bỏ qua độ nghiêng 2°)
const carW = (lx: number, ly: number, lz: number): V3 => {
  const c = Math.cos(TRUCK.yaw), s = Math.sin(TRUCK.yaw);
  return [TRUCK.x + lx * c + lz * s, ly, TRUCK.z - lx * s + lz * c];
};
let HOOD_Y = 0.85; // chiều cao mặt capô (đo bằng tia khi nạp mô hình xe)
const PUDDLE_L: V3 = [-0.2, 0, 1.55]; // vũng nước trên capô (cục bộ, y lấy từ HOOD_Y)
export const RIPPLE_T = 1.05; // C20: vũng nước gợn một vòng — chỉ người xem kịp thấy
const yawPitchTo = (from: V3, to: V3) => {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  return { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI, pitch: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI };
};
const cabinCam = (t: number) => {
  // đường đi: từ chỗ đứng cạnh Cole vòng qua góc đầu xe bên phụ, dừng cạnh cửa kính ghế phụ
  const P0: V3 = [1.1, 0, 3.4], C: V3 = [-0.3, 0, 1.0], P1: V3 = [carW(-1.08, 0, 0.15)[0], 0, carW(-1.08, 0, 0.15)[2]];
  const u = smooth(t, 0.15, 2.8);
  const bz = (a: number, b: number, c: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
  const moving = t > 0.15 && t < 2.8 ? 1 : 0;
  const phase = clamp01((t - 0.15) / 2.65) * 6 * Math.PI; // 6 bước
  const bob = moving * 0.03 * Math.abs(Math.sin(phase));
  const sway = moving * 0.012 * Math.sin(phase / 2);
  const bend = smooth(t, 2.7, 3.5); // cúi xuống ngang cửa kính (mắt 1,6 → 1,2 m)
  const breathe = 0.006 * Math.sin(t * 2.3);
  const pos: V3 = [bz(P0[0], C[0], P1[0]), 1.6 - 0.1 * bend - bob + breathe, bz(P0[2], C[2], P1[2])];
  // nhìn: thân xe → vũng nước trên capô (lướt qua, không dừng) → dọc hông xe → ghế phụ
  const tCar = carW(0, 1.1, -0.2), tPud = carW(PUDDLE_L[0], HOOD_Y, PUDDLE_L[2]), tSide = carW(-0.9, 1.05, -0.2), tSeat = carW(-0.4, 0.62, 0.12);
  const a = yawPitchTo(pos, tCar), b = yawPitchTo(pos, tPud), c = yawPitchTo(pos, tSide), d = yawPitchTo(pos, tSeat);
  const k1 = smooth(t, 0.2, 0.75), k2 = smooth(t, 1.45, 2.1), k3 = smooth(t, 2.6, 3.4);
  const wrap = (x: number, ref: number) => x + 360 * Math.round((ref - x) / 360);
  let yaw = a.yaw, pitch = a.pitch;
  yaw = lerp(yaw, wrap(b.yaw, yaw), k1); pitch = lerp(pitch, b.pitch, k1);
  yaw = lerp(yaw, wrap(c.yaw, yaw), k2); pitch = lerp(pitch, c.pitch, k2);
  yaw = lerp(yaw, wrap(d.yaw, yaw), k3); pitch = lerp(pitch, d.pitch, k3);
  return { pos: [pos[0] + sway, pos[1], pos[2]] as V3, yaw: yaw + 0.8 * Math.sin(t * 0.9), pitch: pitch - bob * 30 + breathe * 30, roll: sway * 60 + 0.5 * Math.sin(t * 1.3) };
};
const HAT = false; // chủ kênh 26.11: bỏ mũ
const HEAD_UP = -0.08; // ngẩng đầu nhìn người đối diện (động tác gốc cúi xuống) // cảnh thử nói chuyện C17–C19 (7,5 s)
// thoại (giây) theo kịch bản C17–C19; phụ đề được ffmpeg vẽ SAU bước mắt cá (để chữ không bị cong); Cole nói ở dòng 0 và 2
export const TALK_LINES = [
  { who: "COLE", text: "Already looked. It's empty.", a: 1.3, b: 2.9 },
  { who: "ME", text: "Cole! You beat me here.", a: 3.1, b: 4.5 },
  { who: "COLE", text: "Engine was running when I pulled up.", a: 4.9, b: 7.0 },
];
export const TALK_DURATION_S = 7.5;
// thời gian động tác "Talking": chạy đủ tốc độ khi Cole nói, chậm 0,15× lúc im (vẫn thở, không đứng đơ)
const talkAnimT = (t: number) => {
  let a = 0;
  for (let x = 0; x < t; x += 1 / 120) {
    const speaking = TALK_LINES.some((l) => l.who === "COLE" && x >= l.a && x < l.b);
    a += (speaking ? 1 : 0.15) / 120;
  }
  return a;
};
const C17_TURN = 0.9; // ảnh thử C17: camera đã quay phải 120°, nhìn Cole
const camAt = (t: number) => {
  if (CABIN) return cabinCam(t);
  if (C17) {
    const b = 0.006 * Math.sin(t * 2.1);
    // C16→C17: đang soi cabin, giọng Cole sau lưng → giật quay phải 118° (0,9→1,35 s), khựng, lùi nửa bước
    const turn = smooth(t, C17_TURN, C17_TURN + 0.45);
    const overshoot = 6 * Math.sin(clamp01((t - C17_TURN - 0.45) / 0.5) * Math.PI) * (t > C17_TURN + 0.45 ? 1 : 0);
    const back = 0.18 * (TALK ? smooth(t, 3.05, 3.6) : smooth(t, C17_TURN + 0.5, C17_TURN + 1.1)); // C18: lùi nửa bước khi giật mình
    // C19: Cole hất cằm về phía xe → camera quay theo về xe
    const follow = TALK ? smooth(t, 6.55, 7.3) : 0;
    const shake = turn > 0 && turn < 1 ? 1.2 * Math.sin(t * 40) : 0;
    return { pos: [1.1 - back * 0.3, 1.6 + b, 3.4 - back * 0.5] as V3, yaw: lerp(lerp(-16, -118, turn) - overshoot, -38, follow) + 1.2 * Math.sin(t * 0.8), pitch: lerp(lerp(-8, 3, turn), -6, follow) + b * 40 + shake, roll: lerp(0.5, -1.5, turn) };
  }
  const walk = smooth(t, 0.1, 2.0);
  const z = lerp(8.5, 3.4, walk), x = lerp(0.4, 1.1, walk);
  const phase = clamp01((t - 0.1) / 1.9) * 4 * Math.PI; // 2 chu kỳ bước
  const moving = walk > 0 && walk < 1 ? 1 : 0;
  const bob = moving * 0.028 * Math.abs(Math.sin(phase));
  const sway = moving * 0.012 * Math.sin(phase / 2);
  // dừng lại, cúi nhẹ nhìn vào cabin (C16), thở
  const look = smooth(t, 2.0, 2.7);
  const breathe = 0.006 * Math.sin(t * 2.1);
  const yaw = lerp(-6, -18, look) + 1.2 * Math.sin(t * 0.9);
  const pitch = lerp(-4, -9, look) + breathe * 40 - bob * 30;
  const roll = sway * 60 + 0.6 * Math.sin(t * 1.3);
  return { pos: [x + sway, 1.6 - bob + breathe, z] as V3, yaw, pitch, roll };
};
const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera, gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    scene.fog = new THREE.FogExp2(0x0a0f16, 0.055);
    scene.background = new THREE.Color(0x05080c);
    const { pos, yaw, pitch, roll } = camAt(t);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...pos);
    cam.rotation.order = "YXZ";
    cam.rotation.set(deg(pitch), deg(yaw), deg(roll));
    cam.fov = VFOV; cam.near = 0.03; cam.far = 200;
    cam.updateProjectionMatrix();
  }, [camera, gl, scene, t]);
  return null;
};

// đèn pin trong tay (ngoài khung hình) ở cảnh nói chuyện: rọi ngực Cole (C18), hắt sáng lên mặt
const HandFlash: React.FC<{ t: number }> = ({ t }) => {
  const { scene } = useThree();
  const light = useMemo(() => new THREE.SpotLight("#f4f6ff", 38, 25, deg(18), 0.5, 2), []);
  useLayoutEffect(() => { scene.add(light.target); return () => { scene.remove(light.target); }; }, [scene, light]);
  // đèn ở tay phải, thấp hơn mắt 35 cm; chiếu theo hướng nhìn, hơi chúc xuống (ngực Cole)
  const { pos, yaw, pitch } = camAt(t);
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(deg(pitch - (CABIN ? 0 : 4)), deg(yaw), 0, "YXZ"));
  const p = new THREE.Vector3(pos[0], pos[1] - (CABIN ? 0.06 : 0.35), pos[2]) // C21: tay giơ đèn qua mép cửa kính.add(new THREE.Vector3(0.15, 0, 0).applyEuler(new THREE.Euler(0, deg(yaw), 0)));
  light.position.copy(p);
  light.intensity = CABIN ? 9 : 38; light.angle = deg(CABIN ? 13 : 18);
  // tia hội tụ vào điểm đang nhìn (cách mắt 1,5 m), không chiếu song song bên dưới tầm mắt
  light.target.position.copy(new THREE.Vector3(...pos).add(dir.multiplyScalar(CABIN ? 1.1 : 3)));
  light.target.updateMatrixWorld();
  return <primitive object={light} />;
};

// ---------------------------------------------------------------- ground + forest
const Ground: React.FC = () => {
  const mud = useMud();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 60, 1, 1]} />
        <meshPhysicalMaterial map={mud.col} roughnessMap={mud.rough} roughness={1} metalness={0} clearcoat={0.5} clearcoatRoughness={0.12} />
      </mesh>
      {/* lề cỏ ướt hai bên */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 14, 0.01, 0]} receiveShadow>
          <planeGeometry args={[12, 60]} />
          <meshStandardMaterial color="#141b12" roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
};

const Forest: React.FC<{ far?: boolean }> = ({ far }) => {
  const bark = useBark();
  const trees = useMemo(() => {
    const out: { x: number; z: number; h: number; r: number }[] = [];
    for (let i = 0; i < 260; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * ((far ? 13 : 8.5) + rnd(i) * (far ? 18 : 22));
      const z = 14 - rnd(i + 500) * 70;
      out.push({ x, z, h: 14 + rnd(i + 900) * 16, r: 0.18 + rnd(i + 77) * 0.22 });
    }
    return out;
  }, [far]);
  const needle = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0d1a12", roughness: 0.85 }), []);
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ map: bark, roughness: 0.9 }), [bark]);
  return (
    <group>
      {trees.map((tr, i) => (
        <group key={i} position={[tr.x, 0, tr.z]}>
          <mesh material={trunk} position={[0, tr.h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[tr.r * 0.6, tr.r, tr.h, 8]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => {
            const y = tr.h * (0.35 + k * 0.14), rr = (1.9 - k * 0.32) * (0.8 + rnd(i + k) * 0.4);
            return (
              <mesh key={k} material={needle} position={[0, y, 0]} rotation={[0, rnd(i * 7 + k) * 6, 0]}>
                <coneGeometry args={[rr, tr.h * 0.26, 9]} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- vehicles
const rbox = (w: number, h: number, d: number, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r);
const Wheel: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p} rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow><cylinderGeometry args={[0.4, 0.4, 0.3, 28]} /><meshStandardMaterial color="#0d0d0e" roughness={0.6} /></mesh>
    <mesh position={[0, 0.155, 0]}><cylinderGeometry args={[0.22, 0.22, 0.02, 20]} /><meshStandardMaterial color="#8d9196" metalness={0.9} roughness={0.35} /></mesh>
  </group>
);

const Pickup: React.FC<{ t: number }> = ({ t }) => {
  const glow = useGlow();
  const tarpTex = useTarp();
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#4a1414", metalness: 0.55, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.08 }), []);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#0a0d10", metalness: 0, roughness: 0.05, transmission: 0.35, transparent: true, opacity: 0.55 }), []);
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a9adb3", metalness: 1, roughness: 0.25 }), []);
  const heads = useMemo(() => [0, 1].map(() => {
    const l = new THREE.SpotLight("#ffe8c8", 220, 60, deg(30), 0.5, 2);
    l.target.position.set(0, -2.6, 12); l.add(l.target);
    return l;
  }), []);
  const idle = 0.004 * Math.sin(t * 52); // máy nổ: rung nhẹ
  // xe cục bộ: +z = đầu xe
  return (
    <group position={[TRUCK.x, 0, TRUCK.z]} rotation={[0, TRUCK.yaw, deg(-2.5)]}>
      <group position={[0, idle, 0]}>
        {/* khung + cabin */}
        <mesh geometry={rbox(1.95, 0.75, 5.4, 0.1)} material={paint} position={[0, 0.85, 0]} castShadow receiveShadow />
        <mesh geometry={rbox(1.85, 0.8, 1.9, 0.14)} material={paint} position={[0, 1.6, 0.35]} castShadow />
        {/* kính chắn gió + cửa sổ */}
        <mesh material={glass} position={[0, 1.65, 1.31]} rotation={[deg(-28), 0, 0]}><planeGeometry args={[1.7, 0.72]} /></mesh>
        <mesh material={glass} position={[0.93, 1.66, 0.35]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.6, 0.56]} /></mesh>
        <mesh material={glass} position={[-0.93, 1.66, 0.35]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.6, 0.56]} /></mesh>
        {/* lưới tản nhiệt, cản */}
        <mesh geometry={rbox(1.0, 0.36, 0.04, 0.015)} position={[0, 0.95, 2.71]}><meshStandardMaterial color="#121314" roughness={0.5} metalness={0.3} /></mesh>
        <mesh geometry={rbox(2.0, 0.22, 0.2, 0.05)} material={chrome} position={[0, 0.5, 2.72]} />
        {/* thùng xe phủ bạt (C20: vũng nước trên bạt) */}
        <mesh position={[0, 1.28, -1.45]} castShadow>
          <boxGeometry args={[1.8, 0.12, 2.3]} />
          <meshPhysicalMaterial map={tarpTex} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0.1, 1.345, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 32]} />
          <meshPhysicalMaterial color="#0c1214" roughness={0.02} metalness={0.1} clearcoat={1} transparent opacity={0.85} />
        </mesh>
        {/* đèn trần cabin sáng (cửa lái mở) */}
        <pointLight position={[0.3, 1.85, 0.4]} color="#ffcf8a" intensity={2.2} distance={3.2} decay={2} />
        {/* cửa lái mở (bên trái xe = +x khi đầu xe hướng +z) */}
        <group position={[0.97, 0, 1.25]} rotation={[0, deg(62), 0]}>
          <mesh geometry={rbox(0.08, 1.15, 1.25, 0.03)} material={paint} position={[0, 1.08, -0.62]} castShadow />
          <mesh material={glass} position={[0.045, 1.72, -0.62]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.1, 0.5]} /></mesh>
        </group>
        {/* bánh */}
        {([[0.92, 0.4, 1.75], [-0.92, 0.4, 1.75], [0.92, 0.4, -1.7], [-0.92, 0.4, -1.7]] as V3[]).map((p, i) => <Wheel key={i} p={p} />)}
        {/* đèn pha: nguồn sáng + quầng chói */}
        {[-0.68, 0.68].map((x, i) => (
          <group key={x} position={[x, 1.02, 2.8]}>
            <mesh><circleGeometry args={[0.11, 24]} /><meshBasicMaterial color="#fff6e0" toneMapped={false} /></mesh>
            <sprite scale={[1.3, 1.3, 1]} position={[0, 0, 0.05]}><spriteMaterial map={glow} color="#ffe6c0" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} /></sprite>
            <primitive object={heads[i]} />
          </group>
        ))}
        {/* đèn hậu đỏ */}
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} position={[x, 1.0, -2.71]}><boxGeometry args={[0.12, 0.3, 0.02]} /><meshBasicMaterial color="#ff1a1a" toneMapped={false} /></mesh>
        ))}
      </group>
    </group>
  );
};

// xe tuần tra của Cole: tắt đèn, chỉ là khối tối có chữ SHERIFF trơn
const Cruiser: React.FC = () => {
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d9dcdf", metalness: 0.4, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }), []);
  const dark = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#0b0e12", metalness: 0.5, roughness: 0.3, clearcoat: 1 }), []);
  return (
    <group position={[CRUISER.x, 0, CRUISER.z]} rotation={[0, CRUISER.yaw, 0]}>
      <mesh geometry={rbox(1.9, 0.7, 5.0, 0.12)} material={paint} position={[0, 0.75, 0]} castShadow />
      <mesh geometry={rbox(1.7, 0.6, 2.4, 0.18)} material={dark} position={[0, 1.38, -0.2]} castShadow />
      <mesh geometry={rbox(1.2, 0.1, 0.3, 0.04)} material={dark} position={[0, 1.73, -0.1]} />
      {([[0.9, 0.38, 1.6], [-0.9, 0.38, 1.6], [0.9, 0.38, -1.6], [-0.9, 0.38, -1.6]] as V3[]).map((p, i) => <Wheel key={i} p={p} />)}
    </group>
  );
};

// ---------------------------------------------------------------- rain
// Vệt mưa xác định theo thời gian (render từng khung cho kết quả giống nhau).
const N_RAIN = 2500;
const Rain: React.FC<{ t: number }> = ({ t }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N_RAIN * 6), 3));
    return g;
  }, []);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cam = camAt(t).pos;
  for (let i = 0; i < N_RAIN; i++) {
    const x = cam[0] - 9 + rnd(i) * 18, z = cam[2] - 16 + rnd(i + 1e4) * 20;
    const H = 9, speed = 9 + rnd(i + 2e4) * 3;
    const y = H - ((rnd(i + 3e4) * H + t * speed) % H);
    const len = 0.32;
    pos.setXYZ(i * 2, x, y, z);
    pos.setXYZ(i * 2 + 1, x - 0.05, y - len, z + 0.015);
  }
  pos.needsUpdate = true;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#6f7f92" transparent opacity={0.06} depthWrite={false} />
    </lineSegments>
  );
};
// mưa sáng rực trong luồng đèn pha: một khối hạt riêng, đặt trong hình nón đèn
const BeamRain: React.FC<{ t: number }> = ({ t }) => {
  const N = 700;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    return g;
  }, []);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < N; i++) {
    const d = 0.3 + rnd(i + 5e4) * 4.0; // khoảng cách trước đèn
    const spread = 0.15 + d * 0.3;
    const lx = (rnd(i + 6e4) - 0.5) * 2 * spread + (i % 2 ? 0.68 : -0.68);
    const H = 2.6, speed = 9.5;
    const ly = H - ((rnd(i + 7e4) * H + t * speed) % H);
    // xe quay ~180°: đầu xe hướng về +z thế giới
    const wx = TRUCK.x + lx + d * Math.sin(TRUCK.yaw), wz = TRUCK.z + 2.75 + d * Math.cos(TRUCK.yaw);
    pos.setXYZ(i * 2, wx, ly, wz);
    pos.setXYZ(i * 2 + 1, wx - 0.04, ly - 0.22, wz);
  }
  pos.needsUpdate = true;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#fff1d8" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </lineSegments>
  );
};
// luồng sáng thấy được trong mưa/sương (hình nón cộng sáng rất nhẹ)
const Beams: React.FC = () => (
  <group position={[TRUCK.x, 0, TRUCK.z]} rotation={[0, TRUCK.yaw, 0]}>
    {[-0.68, 0.68].map((x) => (
      <mesh key={x} position={[x, 0.9, 2.75 + 5]} rotation={[-Math.PI / 2 - deg(2), 0, 0]}>
        <coneGeometry args={[3.2, 10, 40, 1, true]} />
        <meshBasicMaterial color="#ffe2b8" transparent opacity={0.045} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    ))}
  </group>
);

// ---------------------------------------------------------------- POV hand + flashlight
// Tay phải cầm đèn pin, tay áo mưa xanh than #2a3a4f có dải phản quang vàng (Serienbuch).
const PovRig: React.FC<{ t: number }> = ({ t }) => {
  const { pos, yaw, pitch, roll } = camAt(t);
  const target = useMemo(() => new THREE.Object3D(), []);
  const on = t > 0.35; // bật đèn pin ở bước đầu
  const swing = 0.03 * Math.sin(clamp01((t - 0.1) / 1.9) * 4 * Math.PI) * (t < 2 ? 1 : 0);
  const raise = smooth(t, 1.9, 2.5);
  const hx = 0.2 + swing * 0.5, hy = -0.27 + 0.06 * raise + swing, hz = -0.45;
  const sleeve = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#2a3a4f", roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2 }), []);
  const reflect = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8d23a", emissive: "#5a4c08", roughness: 0.4 }), []);
  const skin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#c99a7c", roughness: 0.55, sheen: 0.4 }), []);
  return (
    <group position={pos} rotation={new THREE.Euler(deg(pitch), deg(yaw), deg(roll), "YXZ")}>
      <group position={[hx, hy, hz]} rotation={[deg(8 + 6 * raise), deg(-6), deg(-4)]}>
        {/* đèn pin */}
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.019, 0.24, 20]} /><meshStandardMaterial color="#1a1b1d" metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[0, 0, -0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.024, 0.04, 20]} /><meshStandardMaterial color="#222" metalness={0.9} roughness={0.25} /></mesh>
        {on && <mesh position={[0, 0, -0.151]}><circleGeometry args={[0.025, 20]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>}
        <primitive object={target} position={[0, -0.6, -8]} />
        {on && <spotLight target={target} position={[0, 0, -0.16]} color="#f4f6ff" intensity={70} distance={30} angle={deg(13)} penumbra={0.35} decay={2} />}
        {/* bàn tay nắm đèn */}
        <mesh position={[0.005, -0.012, 0.03]} scale={[0.045, 0.04, 0.06]}><sphereGeometry args={[1, 20, 16]} /><primitive object={skin} attach="material" /></mesh>
        {/* tay áo */}
        <mesh position={[0.06, -0.08, 0.22]} rotation={[deg(65), deg(-12), 0]}><cylinderGeometry args={[0.055, 0.065, 0.42, 20]} /><primitive object={sleeve} attach="material" /></mesh>
        <mesh position={[0.045, -0.05, 0.12]} rotation={[deg(65), deg(-12), 0]}><cylinderGeometry args={[0.057, 0.057, 0.035, 20]} /><primitive object={reflect} attach="material" /></mesh>
      </group>
    </group>
  );
};


// ---------------------------------------------------------------- Người trong cảnh (mô hình FBX chủ kênh gửi)
// woman01.fbx: mô hình tĩnh (không có xương), chất liệu PBR (basecolor/normal/roughness/metallic).
// Tạm đứng vào vị trí của Cole ở C17 để thử mức "người thật". Thở nhẹ bằng cách lắc cả khối rất ít.
const COLE_POS: V3 = [2.25, 0, 4.1];
const PERSON_H = 1.85; // m (Cole: cao, vai rộng)
const PERSON_FILE = "mile14/talk-c.fbx"; // mô hình nam có xương Mixamo, chủ kênh gửi 26.11.2026
// Tải mô hình NGOÀI ThreeCanvas: canvas chỉ vẽ lại theo khung hình, nên mô hình phải có sẵn trước khi chụp.
// Mọi file FBX (người, mũ, xe, cây) dùng chung một LoadingManager → chỉ dựng cảnh khi cả texture nhúng đã tải xong.
const ASSET_FILES = { person: PERSON_FILE, hat: "mile14/hat.fbx", car: "mile14/car.fbx" } as const;
// cây: đã chuyển sẵn thành .bin gọn (scripts/mile14_trees.mjs), không tải FBX gốc 15–27 MB trong trình duyệt
const TREE_FILES = { tree1: "mile14/tree1.bin", tree2: "mile14/tree2.bin" } as const;
type TreeKey = keyof typeof TREE_FILES;
type Assets = Record<keyof typeof ASSET_FILES, THREE.Group> & { trees: Record<TreeKey, THREE.BufferGeometry> };
const loadTreeBin = async (file: string) => {
  const buf = await (await fetch(staticFile(file))).arrayBuffer();
  const [nb, nl] = new Uint32Array(buf, 0, 2);
  const nv = nb + nl;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buf, 8, nv * 3), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Int8Array(buf, 8 + nv * 12, nv * 3), 3, true));
  geo.addGroup(0, nb, 0); geo.addGroup(nb, nl, 1);
  geo.computeBoundingSphere();
  return geo;
};
const useAssets = (on: boolean) => {
  const [obj, setObj] = useState<Assets | null>(null);
  const [handle] = useState(() => (on ? delayRender("FBX assets", { timeoutInMilliseconds: 600000 }) : null));
  useEffect(() => {
    if (handle === null) return;
    // tải lần lượt từng file, mỗi file một LoadingManager riêng (tải song song làm mất texture nhúng của người)
    const loadOne = (file: string) => new Promise<THREE.Group | null>((res) => {
      let g: THREE.Group | null = null;
      const mgr = new THREE.LoadingManager(() => res(g));
      mgr.onError = (u) => console.warn("thiếu file", u); // vd. ảnh không nhúng trong FBX → bỏ qua
      new FBXLoader(mgr).load(staticFile(file), (x) => { g = x; }, undefined, (e) => { console.error(e); res(null); });
    });
    (async () => {
      const out: Partial<Record<keyof typeof ASSET_FILES, THREE.Group>> = {};
      for (const k of Object.keys(ASSET_FILES) as (keyof typeof ASSET_FILES)[]) {
        const g = await loadOne(ASSET_FILES[k]);
        if (!g) { continueRender(handle); return; }
        out[k] = g;
      }
      const trees: Partial<Record<TreeKey, THREE.BufferGeometry>> = {};
      for (const k of Object.keys(TREE_FILES) as TreeKey[]) trees[k] = await loadTreeBin(TREE_FILES[k]);
      setObj({ ...(out as Assets), trees: trees as Record<TreeKey, THREE.BufferGeometry> });
    })();
  }, [handle]);
  useEffect(() => { if (obj && handle !== null) setTimeout(() => continueRender(handle), 1500); }, [obj, handle]);
  return obj;
};
const Person: React.FC<{ t: number; src: THREE.Group; hatSrc: THREE.Group }> = ({ t, src, hatSrc }) => {
  const root = useMemo(() => {
    const r = src; // dùng thẳng (clone làm lệch liên kết xương của file Genesis)
    // bỏ đèn/camera đi kèm trong file FBX (làm cháy sáng cả cảnh)
    const extras: THREE.Object3D[] = [];
    r.traverse((o) => { if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) extras.push(o); });
    extras.forEach((o) => o.parent?.remove(o));
    (r as any).animations = src.animations;
    r.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true; 
      // file FBX không kèm ảnh texture → tự gán chất liệu theo tên: da, áo, quần, mắt, mi
      const conv = (old: THREE.Material) => {
        const n = (old.name || "").toLowerCase();
        const pick = (): THREE.MeshPhysicalMaterialParameters => {
          if (/lash|brow/.test(n)) return { color: "#2a1d16", roughness: 0.8, transparent: true, opacity: 0.6, depthWrite: false };
          if (/cornea|eyemoist|tear/.test(n)) return { color: "#ffffff", roughness: 0.02, transparent: true, opacity: 0.08, depthWrite: false };
          if (/sclera/.test(n)) return { color: "#e9e2da", roughness: 0.3 };
          if (/iris|pupil|eye/.test(n)) return { color: "#7e888e", roughness: 0.2 }; // mắt xám nhạt (Cole)
          if (/shirt|top|tank/.test(n)) return { color: "#2f3d2c", roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }; // xanh rêu, ướt
          if (/boxer|pant|short/.test(n)) return { color: "#1e2226", roughness: 0.6 };
          if (/mouth|teeth|tongue|gum/.test(n)) return { color: "#8a4a44", roughness: 0.4 };
          if (/nail/.test(n)) return { color: "#c9a08c", roughness: 0.35 };
          return { color: "#9c6a50", roughness: 0.6 }; // da bậc 2, hơi ướt mưa
        };
        const o2 = old as THREE.MeshPhongMaterial;
        o2.map = shrinkTex(o2.map); o2.normalMap = shrinkTex(o2.normalMap);
        if (SKIN && /body/.test(n) && o2.map) o2.map = skinTex(o2.map);
        const mat = o2.map
          ? new THREE.MeshPhysicalMaterial({ map: o2.map, normalMap: o2.normalMap ?? null, alphaMap: o2.alphaMap ?? null, transparent: !!o2.alphaMap || /hair|lash/.test(n), alphaTest: /hair|lash/.test(n) ? 0.35 : 0, roughness: /hair/.test(n) ? 0.55 : 0.65, side: /hair|lash/.test(n) ? THREE.DoubleSide : THREE.FrontSide })
          : new THREE.MeshPhysicalMaterial(pick());
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        if (SKIN && /body/.test(n)) {
          // Skinmaterials.blend: Principled, roughness 0.5, subsurface 0.15 màu đỏ cam → giả bằng sheen đỏ ấm
          Object.assign(mat, { roughness: 0.5, sheen: 0.35, sheenRoughness: 0.6, specularIntensity: 0.5 });
          mat.sheenColor = new THREE.Color("#c24a35");
          if (mat.normalMap) mat.normalScale.set(1.2, 1.2);
        }
        mat.name = old.name;
        if (COAT && /top/.test(n)) mat.visible = false; // áo thun nằm dưới áo mưa
        return mat;
      };
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
    });
    // chuẩn hoá: cao 1,68 m, chân chạm đất, tâm ở gốc
    const bb = new THREE.Box3().setFromObject(r);
    const size = bb.getSize(new THREE.Vector3());
    const k = PERSON_H / size.y;
    r.scale.multiplyScalar(k);
    const bb2 = new THREE.Box3().setFromObject(r);
    const c = bb2.getCenter(new THREE.Vector3());
    r.position.sub(new THREE.Vector3(c.x, bb2.min.y, c.z));
    const g = new THREE.Group(); g.add(r);
    const mixer = new THREE.AnimationMixer(r);
    const clip = [...src.animations].sort((a, b) => b.duration - a.duration)[0]; // bỏ "Take 001" rỗng
    if (clip) mixer.clipAction(clip).play();
    // mỗi mảnh lưới (áo, quần, người, mi) có bộ xương riêng trùng tên → giữ tất cả
    const bones: Record<string, THREE.Bone[]> = {};
    r.traverse((o) => { if ((o as THREE.Bone).isBone) (bones[o.name.replace(/^mixamorig\d*:?/, "")] ??= []).push(o as THREE.Bone); });
    const rest = new Map<THREE.Bone, THREE.Quaternion>();
    Object.values(bones).flat().forEach((b) => rest.set(b, b.quaternion.clone()));
    // mũ bucket (bucket-hat.fbx, chủ kênh gửi 26.11.2026) gắn vào xương đầu
    r.updateMatrixWorld(true);
    const headB = (bones["head"] ?? bones["Head"] ?? [])[0];
    if (HAT && headB) {
      const hat = makeHatFbx(hatSrc);
      headB.add(hat);
      const ws = headB.getWorldScale(new THREE.Vector3()).y;
      hat.scale.multiplyScalar(1 / ws);
      hat.position.set(0, HAT_Y / ws, HAT_Z / ws);
    }
    if (COAT) addCoat(bones);
    return { g, mixer, hasAnim: !!src.animations[0], bones, rest };
  }, [src, hatSrc]);
  // đặt lại xương đầu về tư thế gốc trước mỗi khung (động tác không điều khiển xương đầu → phép xoay bên dưới sẽ cộng dồn)
  for (const b of root.bones["Head"] ?? []) b.quaternion.copy(root.rest.get(b)!);
  root.mixer.setTime(ANIM_T ?? (TALK ? talkAnimT(t) : CABIN ? 1.9 + 0.15 * t : t));
  if (TALK) {
    // C19: hất cằm về phía xe (đầu quay trái + ngẩng nhẹ rồi về)
    const nod = smooth(t, 5.0, 5.6) * (1 - smooth(t, 7.0, 7.5));
    for (const b of root.bones["Head"] ?? []) b.rotateX(HEAD_UP + 0.1 * nod); // động tác gốc ngửa đầu ở đoạn này → kéo cằm xuống
  }
  if (POSE_OVERRIDE) {
    // động tác trong file đứng yên ở chữ A: tự hạ tay từ tư thế chữ A xuống buông dọc người, khuỷu hơi gập, thở nhẹ
    const B = root.bones, R = root.rest;
    const set = (name: string, x: number, y: number, z: number) => {
      const key = B[name] ? name : Object.keys(B).find((k) => k.toLowerCase().endsWith(name.toLowerCase()));
      if (!key) return;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
      for (const b of B[key]) b.quaternion.copy(R.get(b)!).multiply(q);
    };
    const br = 0.02 * Math.sin(t * 1.9);
    // xương kiểu Genesis 8 (lShldrBend…) hoặc Mixamo (LeftArm…)
    for (const [l, r] of [["lShldrBend", "rShldrBend"], ["LeftArm", "RightArm"]]) { set(l, 0, 0, -ARM_DOWN - br); set(r, 0, 0, ARM_DOWN + br); }
    for (const [l, r] of [["lForearmBend", "rForearmBend"], ["LeftForeArm", "RightForeArm"]]) { set(l, 0, -0.25, 0); set(r, 0, 0.25, 0); }
    set("chestUpper", br * 0.5, 0, 0); set("Spine1", br * 0.5, 0, 0);
    set("head", -0.05, 0.08 * Math.sin(t * 0.6), 0); set("Head", -0.05, 0.08 * Math.sin(t * 0.6), 0);
  }
  const breathe = root.hasAnim ? 1 : 1 + 0.004 * Math.sin(t * 1.9);
  return (
    <group position={COLE_POS} rotation={[0, Math.atan2(1.1 - COLE_POS[0], 3.4 - COLE_POS[2]) + PERSON_YAW, 0]} scale={[1, breathe, 1]}>
      <primitive object={root.g} />
    </group>
  );
};
let PERSON_YAW = 0;
let ARM_DOWN = 0.72;
let HAT_Y = 0.12; // đáy vành mũ, trên xương đầu
let HAT_Z = 0.01;
const HAT_W = 0.27; // m, rộng vành mũ
const POSE_OVERRIDE = false;
const ANIM_T: number | null = null; // chạy động tác Standing Idle theo thời gian // chỉnh nếu mô hình gốc không nhìn theo +z


// ---------------------------------------------------------------- Áo mưa của Cole (dựng bằng code, gắn vào xương)
// Mỗi mảnh áo là một ống thon gắn vào một xương và hướng về xương con → đi theo mọi động tác.
// Màu theo sổ tay: xanh rêu đậm #2f3d2c, ướt (clearcoat), lưng có chữ SHERIFF phản quang trơn (không huy hiệu thật).
const COAT = false; // chủ kênh 26.11: bỏ áo mưa dựng bằng code
const coatMat = () => new THREE.MeshPhysicalMaterial({ color: "#2f3d2c", roughness: 0.42, clearcoat: 0.9, clearcoatRoughness: 0.18, side: THREE.DoubleSide });
const sheriffTex = () => {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128;
  const c = cv.getContext("2d")!;
  c.clearRect(0, 0, 512, 128);
  c.fillStyle = "#c8ccd0"; c.font = "bold 92px 'DejaVu Sans', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("SHERIFF", 256, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const addCoat = (bones: Record<string, THREE.Bone[]>) => {
  const B = (n: string) => (bones[n] ?? [])[0];
  const mat = coatMat();
  // ống từ xương a tới xương b (b là con/cháu của a), bán kính tính bằng mét thế giới
  const tube = (aName: string, bName: string, r0: number, r1: number, opt: { ex?: number; ez?: number; extend?: number; startBack?: number } = {}) => {
    const a = B(aName), bb = B(bName); if (!a || !bb) return null;
    a.updateMatrixWorld(true);
    const ws = a.getWorldScale(new THREE.Vector3()).y;
    const pa = a.getWorldPosition(new THREE.Vector3()), pb = bb.getWorldPosition(new THREE.Vector3());
    const local = a.worldToLocal(pb.clone()); // điểm cuối trong hệ toạ độ xương a
    const lenLocal = local.length() * (1 + (opt.extend ?? 0));
    const dir = local.clone().normalize();
    const geo = new THREE.CylinderGeometry(r1 / ws, r0 / ws, lenLocal, 28, 1, true);
    geo.translate(0, lenLocal / 2 - (opt.startBack ?? 0) / ws, 0);
    const m = new THREE.Mesh(geo, mat); m.castShadow = true;
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.scale.set(opt.ex ?? 1, 1, opt.ez ?? 1);
    a.add(m);
    void pa;
    return m;
  };
  // thân: hông → ngực → cổ
  tube("Spine", "Spine2", 0.2, 0.215, { ex: 0.98, ez: 0.86, startBack: 0.06 });
  tube("Spine2", "Neck", 0.215, 0.21, { ex: 1.0, ez: 0.86, extend: -0.3, startBack: 0.04 });
  // ách vai: khối bầu dục phủ hai vai và nối liền với cổ áo
  const sp2 = B("Spine2"), nk = B("Neck");
  if (sp2 && nk) {
    const ws = sp2.getWorldScale(new THREE.Vector3()).y;
    const top = sp2.worldToLocal(nk.getWorldPosition(new THREE.Vector3()));
    const yoke = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
    yoke.scale.set(0.245 / ws, 0.13 / ws, 0.165 / ws);
    yoke.position.copy(top).multiplyScalar(0.72);
    sp2.add(yoke);
  }
  // vai: từ xương vai tới cánh tay
  // vai tròn: khớp cầu ở đầu cánh tay
  for (const n of ["LeftArm", "RightArm"]) { const b = B(n); if (b) { const ws = b.getWorldScale(new THREE.Vector3()).y; const sph = new THREE.Mesh(new THREE.SphereGeometry(0.082 / ws, 24, 16), mat); b.add(sph); } }
  // tay áo dài tới cổ tay
  tube("LeftArm", "LeftForeArm", 0.072, 0.064, { extend: 0.06 });
  tube("RightArm", "RightForeArm", 0.072, 0.064, { extend: 0.06 });
  tube("LeftForeArm", "LeftHand", 0.064, 0.058, { extend: -0.04 });
  tube("RightForeArm", "RightHand", 0.064, 0.058, { extend: -0.04 });
  // cổ áo dựng
  tube("Neck", "Head", 0.085, 0.095, { extend: -0.35, ez: 0.9 });
  // vạt áo: từ hông loe xuống ngang gối (gắn vào Hips, chiều theo đường hông → gối trung bình)
  const hips = B("Hips"), lk = B("LeftLeg"), rk = B("RightLeg");
  if (hips && lk && rk) {
    hips.updateMatrixWorld(true);
    const ws = hips.getWorldScale(new THREE.Vector3()).y;
    const knee = lk.getWorldPosition(new THREE.Vector3()).add(rk.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
    const local = hips.worldToLocal(knee.clone());
    const len = local.length() * 1.05;
    const geo = new THREE.CylinderGeometry(0.2 / ws, 0.26 / ws, len, 40, 1, true);
    geo.translate(0, -len / 2 + 0.06 / ws, 0);
    const skirt = new THREE.Mesh(geo, mat); skirt.castShadow = true;
    skirt.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), local.clone().normalize());
    skirt.scale.set(0.98, 1, 0.86);
    hips.add(skirt);
  }
  // chữ SHERIFF trên lưng (Spine2, phía sau = -z)
  const sp = B("Spine2");
  if (sp) {
    const ws = sp.getWorldScale(new THREE.Vector3()).y;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.3 / ws, 0.075 / ws), new THREE.MeshStandardMaterial({ map: sheriffTex(), transparent: true, roughness: 0.3, metalness: 0.6, emissive: "#30343a" }));
    plane.position.set(0, 0.06 / ws, -0.19 / ws);
    plane.rotation.y = Math.PI;
    sp.add(plane);
  }
};

// WebGL phần mềm (render trên cloud) hết bộ nhớ với ảnh 4K của người + cây hàng triệu tam giác → ảnh bị tráo.
// Thu nhỏ mọi ảnh texture về tối đa 1024 px.
export const shrinkTex = (tx: THREE.Texture | null | undefined, max = 1024) => {
  if (!tx) return null;
  const img = tx.image as HTMLImageElement | ImageBitmap | undefined;
  if (!img || !img.width || (img.width <= max && img.height <= max)) return tx;
  const k = max / Math.max(img.width, img.height);
  const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext("2d")!.drawImage(img as CanvasImageSource, 0, 0, cv.width, cv.height);
  const out = new THREE.CanvasTexture(cv);
  out.colorSpace = tx.colorSpace; out.wrapS = tx.wrapS; out.wrapT = tx.wrapT; out.flipY = tx.flipY;
  out.repeat.copy(tx.repeat); out.offset.copy(tx.offset);
  return out;
};

// ---------------------------------------------------------------- Màu da (Skinmaterials.blend, chủ kênh gửi 26.11.2026)
// File Blender là shader thủ tục: RGB gốc (tuyến tính) 0.442, 0.177, 0.091 ≈ #b37555 (da ngăm vừa),
// đốm nhiễu đỏ nâu (ColorRamp 0.27–0.49), subsurface 0.15. Áp lên ảnh da của nhân vật:
// giữ độ sáng tối (mắt, môi, nếp nhăn) nhưng đổi sắc da sang tông của file + đốm nhiễu nhẹ.
const SKIN = true;
const SKIN_RGB = [0xb3, 0x75, 0x55];
const skinCache = new Map<string, THREE.Texture>();
export const skinTex = (tx: THREE.Texture) => {
  const hit = skinCache.get(tx.uuid); if (hit) return hit;
  const img = tx.image as CanvasImageSource & { width: number; height: number };
  const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
  const c = cv.getContext("2d")!; c.drawImage(img, 0, 0);
  const id = c.getImageData(0, 0, cv.width, cv.height), px = id.data;
  const lum = (i: number) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  // độ sáng trung bình của vùng da (pixel ấm: đỏ > xanh dương)
  let sum = 0, cnt = 0;
  for (let i = 0; i < px.length; i += 16) if (px[i] > px[i + 2] + 10 && px[i] > 60) { sum += lum(i); cnt++; }
  const mean = cnt ? sum / cnt : 150;
  const W = cv.width;
  for (let i = 0; i < px.length; i += 4) {
    if (!(px[i] > px[i + 2] + 4)) continue; // chỉ pixel da (ấm), bỏ qua mắt trắng, răng, tóc xám
    const k = lum(i) / mean;
    const x = (i / 4) % W, y = Math.floor(i / 4 / W);
    const blot = 1 + 0.06 * (Math.sin(x * 0.045 + Math.sin(y * 0.031) * 3) * Math.sin(y * 0.052 + Math.cos(x * 0.023) * 2)); // đốm nhiễu
    for (let ch = 0; ch < 3; ch++) px[i + ch] = Math.min(255, 0.25 * px[i + ch] + 0.75 * SKIN_RGB[ch] * k * blot * (ch === 0 ? 1.02 : 1));
  }
  c.putImageData(id, 0, 0);
  const out = new THREE.CanvasTexture(cv);
  out.colorSpace = THREE.SRGBColorSpace; out.wrapS = tx.wrapS; out.wrapT = tx.wrapT; out.flipY = tx.flipY;
  skinCache.set(tx.uuid, out);
  return out;
};

// ---------------------------------------------------------------- Mô hình FBX chủ kênh gửi 26.11.2026 (thư viện: /mnt/project-files/models/)
// chuyển chất liệu Phong của FBX sang PBR, giữ ảnh màu / alpha / normal nếu có
const toPbr = (old: THREE.Material, extra: THREE.MeshPhysicalMaterialParameters = {}) => {
  const o = old as THREE.MeshPhongMaterial;
  const m = new THREE.MeshPhysicalMaterial({ map: o.map ?? null, alphaMap: o.alphaMap ?? null, normalMap: o.normalMap ?? null, roughness: 0.7, ...extra });
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  m.name = old.name;
  return m;
};
const fitObject = (g: THREE.Object3D, axis: "x" | "y" | "z", size: number) => {
  g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g);
  const k = size / bb.getSize(new THREE.Vector3())[axis];
  g.scale.multiplyScalar(k);
  g.updateMatrixWorld(true);
  const bb2 = new THREE.Box3().setFromObject(g);
  const c = bb2.getCenter(new THREE.Vector3());
  g.position.sub(new THREE.Vector3(c.x, bb2.min.y, c.z));
  const wrap = new THREE.Group(); wrap.add(g); return wrap;
};
export const stripExtras = (g: THREE.Object3D) => {
  const ex: THREE.Object3D[] = [];
  g.traverse((o) => { if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) ex.push(o); });
  ex.forEach((o) => o.parent?.remove(o));
};

// mũ bucket: file không nhúng ảnh màu → vải bạt nâu ô liu, ướt mưa
const makeHatFbx = (src: THREE.Group) => {
  const g = src.clone(true);
  stripExtras(g);
  const cloth = new THREE.MeshPhysicalMaterial({ color: "#3a3628", roughness: 0.7, clearcoat: 0.2, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = cloth; m.castShadow = true; } });
  return fitObject(g, "x", HAT_W); // đáy vành mũ ở gốc toạ độ
};

// ô tô xanh cũ (ô-to-xanh-cu.fbx): chất liệu 3ds Max không đọc được màu → gán lại theo số chất liệu
const CAR_LEN = 4.45; // m
const carMats = () => {
  const paint = new THREE.MeshPhysicalMaterial({ color: "#3f7487", metalness: 0.45, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#b4b8bd", metalness: 1, roughness: 0.22 });
  const black = new THREE.MeshStandardMaterial({ color: "#0e0f10", roughness: 0.55, metalness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.85 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#0a0d10", roughness: 0.04, metalness: 0.1, clearcoat: 1, transparent: true, opacity: CABIN ? 0.16 : 0.6, depthWrite: !CABIN });
  const lamp = new THREE.MeshBasicMaterial({ color: "#fff3dc", toneMapped: false });
  const amber = new THREE.MeshStandardMaterial({ color: "#c07a20", emissive: "#5a2c00", roughness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: "#6a0a0a", emissive: "#ff1a1a", emissiveIntensity: 1.6, roughness: 0.3 });
  const byName: Record<string, THREE.Material> = {
    "Material #25": paint, "Material #36": chrome, "Material #26": chrome, "Material #37": chrome, "Material #28": chrome,
    "Material #29": black, "Material #30": black, "Material #32": chrome, "Material #27": rubber,
    "Material #38": glass, "Material #31": glass, "Material #40": lamp, "Material #35": lamp, "Material #34": lamp,
    "Material #33": amber, "Material #39": red,
  };
  return (old: THREE.Material) => byName[old.name] ?? (/licanse/.test(old.name) ? toPbr(old, { roughness: 0.4, color: "#d8d8d8" }) : paint);
};
const CarModel: React.FC<{ t: number; src: THREE.Group }> = ({ t, src }) => {
  const glow = useGlow();
  const car = useMemo(() => {
    const g = src; stripExtras(g);
    const conv = carMats();
    g.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true; m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material); });
    const w = fitObject(g, "z", CAR_LEN);
    // đo chiều cao mặt capô tại chỗ đặt vũng nước
    w.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(PUDDLE_L[0], 5, PUDDLE_L[2]), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(w, true)[0];
    if (hit) HOOD_Y = hit.point.y;
    return w;
  }, [src]);
  const heads = useMemo(() => [0, 1].map(() => {
    const l = new THREE.SpotLight("#ffe8c8", 220, 60, deg(30), 0.5, 2);
    l.target.position.set(0, -2.2, 12); l.add(l.target);
    return l;
  }), []);
  const idle = 0.004 * Math.sin(t * 52); // máy nổ: rung nhẹ
  const k = CAR_LEN / 164; // đơn vị gốc → m
  return (
    <group position={[TRUCK.x, 0, TRUCK.z]} rotation={[0, TRUCK.yaw, deg(-2)]}>
      <group position={[0, idle, 0]}>
        <primitive object={car} />
        <pointLight position={[0.2, 1.2, 0.2]} color="#ffcf8a" intensity={1.6} distance={2.6} decay={2} />
        {[-22, 22].map((x, i) => (
          <group key={x} position={[x * k, 27 * k, 80.5 * k]}>
            <sprite scale={[1.2, 1.2, 1]} position={[0, 0, 0.05]}><spriteMaterial map={glow} color="#ffe6c0" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} /></sprite>
            <primitive object={heads[i]} />
          </group>
        ))}
        {CABIN && <CarInterior t={t} />}
        {CABIN && <HoodPuddle t={t} />}
        {/* vũng nước dưới xe */}
        <mesh position={[0.2, 0.012, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 40]} />
          <meshPhysicalMaterial color="#0c1214" roughness={0.03} metalness={0.1} clearcoat={1} transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- C20–C21: vũng nước trên capô + nội thất xe
// C20 (xe con thay cho xe bán tải → vũng nước nằm trên capô thay cho tấm bạt): gợn MỘT vòng như có gì bên dưới cử động
const HoodPuddle: React.FC<{ t: number }> = ({ t }) => {
  const r = clamp01((t - RIPPLE_T) / 0.75);
  const ring2 = clamp01((t - RIPPLE_T - 0.12) / 0.75);
  return (
    <group position={[PUDDLE_L[0], HOOD_Y + 0.03, PUDDLE_L[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh scale={[1, 0.72, 1]}>
        <circleGeometry args={[0.4, 48]} />
        <meshPhysicalMaterial color="#040607" roughness={0.03} metalness={0.3} clearcoat={1} clearcoatRoughness={0.02} transparent opacity={0.9} />
      </mesh>
      {t > RIPPLE_T && r < 1 && (
        <mesh position={[0.04, 0, 0.002]} scale={[0.02 + r * 0.36, (0.02 + r * 0.36) * 0.72, 1]}>
          <ringGeometry args={[0.85, 1, 64]} />
          <meshBasicMaterial color="#e6eef5" transparent opacity={0.9 * (1 - r)} depthWrite={false} />
        </mesh>
      )}
      {t > RIPPLE_T + 0.12 && ring2 < 1 && (
        <mesh position={[0.04, 0, 0.003]} scale={[0.02 + ring2 * 0.2, (0.02 + ring2 * 0.2) * 0.72, 1]}>
          <ringGeometry args={[0.9, 1, 64]} />
          <meshBasicMaterial color="#b9c8d6" transparent opacity={0.35 * (1 - ring2)} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

// nội thất (file xe không có ghế): sàn, 2 ghế trước, băng ghế sau, táp-lô, vô lăng
// C21: áo khoác vải bạt nâu ướt sũng trên ghế phụ (bên -x), nước nhỏ xuống thảm (GIEO tập 2)
const CarInterior: React.FC<{ t: number }> = ({ t }) => {
  const fabric = useMemo(() => new THREE.MeshStandardMaterial({ color: "#35312c", roughness: 0.95 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#151413", roughness: 0.7 }), []);
  const jacketMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#2b1c10", roughness: 0.6, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: new THREE.Color("#7a5a38") }), []);
  const water = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#cfe0ea", roughness: 0.02, transmission: 0.6, transparent: true, opacity: 0.7, clearcoat: 1 }), []);
  // áo khoác vò nhàu: khối cầu dẹt + nhiễu, một tay áo rủ xuống mép ghế
  const jacket = useMemo(() => {
    const body = new THREE.SphereGeometry(1, 96, 48);
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + 0.12 * Math.sin(x * 7 + z * 3) * Math.cos(z * 6 - y * 4) + 0.06 * Math.sin(x * 15 + y * 9) + 0.035 * Math.sin(x * 31 + z * 23) * Math.sin(z * 27 - x * 11); // nếp nhăn vải
      p.setXYZ(i, x * 0.23 * n, Math.max(y, -0.3) * 0.07 * n, z * 0.25 * n);
    }
    body.computeVertexNormals();
    const sleeve = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 0.04, 0.12), new THREE.Vector3(0.1, 0.03, 0.27), new THREE.Vector3(0.12, -0.08, 0.34), new THREE.Vector3(0.1, -0.2, 0.36),
    ]), 24, 0.045, 12, false);
    return { body, sleeve };
  }, []);
  const SEAT_X = -0.4, CUSH_Y = 0.56, TIP: V3 = [SEAT_X + 0.1, CUSH_Y + 0.07 - 0.2, 0.12 + 0.36];
  // giọt nước rơi từ đầu tay áo xuống thảm (rơi 0,3 s, mỗi 0,55 s một giọt)
  const drips = [0, 1, 2].map((k) => {
    const ph = ((t + k * 0.55) % 1.65) / 1.65 * 3; // 0..3, rơi trong khoảng 0..0,55
    const f = clamp01(ph / 1);
    return { y: TIP[1] - 0.03 - f * f * (TIP[1] - 0.4), vis: ph < 1, grow: ph < 1 ? 1 : 0 };
  });
  return (
    <group>
      <mesh position={[0, 0.37, -0.2]} material={dark}><boxGeometry args={[1.55, 0.04, 2.6]} /></mesh>
      {/* thảm ghế phụ: vết ướt sẫm, bóng */}
      <mesh position={[SEAT_X + 0.05, 0.395, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 32]} />
        <meshPhysicalMaterial color="#0d0c0b" roughness={0.1} clearcoat={1} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <group key={x} position={[x, 0, 0.12]}>
          <mesh position={[0, CUSH_Y, 0]} material={fabric}><boxGeometry args={[0.52, 0.14, 0.52]} /></mesh>
          <mesh position={[0, CUSH_Y + 0.36, -0.28]} rotation={[deg(-12), 0, 0]} material={fabric}><boxGeometry args={[0.52, 0.66, 0.13]} /></mesh>
          <mesh position={[0, CUSH_Y + 0.78, -0.36]} material={fabric}><boxGeometry args={[0.26, 0.18, 0.12]} /></mesh>
        </group>
      ))}
      <mesh position={[0, CUSH_Y - 0.02, -0.85]} material={fabric}><boxGeometry args={[1.4, 0.14, 0.5]} /></mesh>
      <mesh position={[0, CUSH_Y + 0.33, -1.12]} rotation={[deg(-14), 0, 0]} material={fabric}><boxGeometry args={[1.4, 0.6, 0.12]} /></mesh>
      <mesh position={[0, 0.86, 0.86]} material={dark}><boxGeometry args={[1.6, 0.26, 0.42]} /></mesh>
      <mesh position={[0.4, 0.98, 0.58]} rotation={[deg(-62), 0, 0]} material={dark}><torusGeometry args={[0.18, 0.018, 10, 40]} /></mesh>
      {/* áo khoác ướt trên ghế phụ */}
      <group position={[SEAT_X, CUSH_Y + 0.07, 0.12]}>
        <mesh geometry={jacket.body} material={jacketMat} position={[0, 0.03, 0]} rotation={[0, 0.4, 0.05]} />
        <mesh geometry={jacket.sleeve} material={jacketMat} />
        {/* cổ áo nhung sẫm + khoá kéo kim loại */}
        <mesh position={[-0.02, 0.07, -0.16]} rotation={[deg(70), 0, 0.3]}><torusGeometry args={[0.09, 0.025, 8, 24, Math.PI * 1.3]} /><meshStandardMaterial color="#24190f" roughness={0.9} /></mesh>
        <mesh position={[0.02, 0.085, 0.02]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.012, 0.006, 0.3]} /><meshStandardMaterial color="#9a8f80" metalness={0.9} roughness={0.35} /></mesh>
      </group>
      {drips.map((d, i) => d.vis && (
        <mesh key={i} position={[TIP[0], d.y, TIP[2]]} scale={[1, 1.8, 1]} material={water}><sphereGeometry args={[0.008, 10, 8]} /></mesh>
      ))}
    </group>
  );
};

// cây bồ kết Mỹ (gleditsia-triacanthos-*.fbx): vài cây thật gần đường, rừng dựng bằng code lùi ra xa
const NEAR_TREES: { m: TreeKey; x: number; z: number; h: number; yaw: number }[] = [
  { m: "tree1", x: 8.2, z: 6.5, h: 12, yaw: 0.4 },
  { m: "tree2", x: 9.5, z: -3.0, h: 13.5, yaw: 2.1 },
  { m: "tree1", x: 10.5, z: 14.0, h: 14, yaw: 4.0 },
  { m: "tree2", x: -8.5, z: 3.0, h: 12.5, yaw: 1.2 },
  { m: "tree1", x: -9.8, z: -9.0, h: 11.5, yaw: 3.3 },
  { m: "tree2", x: 8.8, z: -14.0, h: 14, yaw: 5.2 },
];
const NearTrees: React.FC<{ trees: Record<TreeKey, THREE.BufferGeometry> }> = ({ trees }) => {
  const mats = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: "#3e342c", roughness: 0.9 }), // vỏ
    new THREE.MeshPhysicalMaterial({ color: "#34482b", roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide }), // lá ướt
  ], []);
  return (
    <group>
      {NEAR_TREES.map((tr, i) => (
        <mesh key={i} geometry={trees[tr.m]} material={mats} position={[tr.x, 0, tr.z]} rotation={[0, tr.yaw, 0]} scale={tr.h} receiveShadow />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- scene
export const Mile14Raw: React.FC<{ at?: number; c17?: boolean; talk?: boolean; cabin?: boolean }> = ({ at, c17, talk, cabin }) => {
  C17 = !!c17 || !!cabin;
  TALK = !!talk;
  CABIN = !!cabin;
  const assets = useAssets(!!c17 || !!cabin);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = at ?? frame / FPS;
  return (
    <AbsoluteFill style={{ background: "#05080c" }}>
      {((!c17 && !cabin) || assets) && <ThreeCanvas width={width} height={height} gl={{ antialias: true }} camera={{ fov: VFOV, near: 0.03, far: 200 }} shadows>
        <CameraRig t={t} />
        {/* ánh trăng xuyên mây rất yếu + ánh trời đêm */}
        <hemisphereLight args={["#2b3a52", "#0b0a08", 0.6]} />
        <directionalLight position={[-20, 30, 10]} color="#6f86ad" intensity={assets ? 0.9 : 0.25} />
        <Ground />
        <Forest far={!!assets} />
        {assets && <NearTrees trees={assets.trees} />}
        {assets ? <CarModel t={t} src={assets.car} /> : <Pickup t={t} />}
        <Cruiser />
        <Beams />
        <Rain t={t} />
        <BeamRain t={t} />
        {(c17 || cabin) && assets && <Person t={t} src={assets.person} hatSrc={assets.hat} />}
        {!c17 && !cabin && <PovRig t={t} />}
        {(talk || cabin) && <HandFlash t={t} />}
      </ThreeCanvas>}
      {/* giọt mưa trên ống kính + vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)", pointerEvents: "none" }} />
      {false && talk && TALK_LINES.filter((l) => t >= l.a && t < l.b + 0.12).map((l) => (
        <div key={l.a} style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center" }}>
          <span style={{ display: "inline-block", background: "rgba(0,0,0,.55)", padding: "8px 18px", borderRadius: 6, color: "#fff", font: "500 34px 'DejaVu Sans', sans-serif" }}>
            <span style={{ font: "700 28px 'DejaVu Sans', sans-serif", color: l.who === "COLE" ? "#e8c27a" : "#9fd0ff", marginRight: 12 }}>{l.who === "COLE" ? "Cole" : "Me"}</span>{l.text}
          </span>
        </div>
      ))}
      <div style={{ position: "absolute", left: 40, top: 30, color: "rgba(255,255,255,.85)", font: "600 34px 'DejaVu Sans Mono', monospace", opacity: t < 2.2 && !c17 ? 1 : 0 }}>2:18 AM</div>
    </AbsoluteFill>
  );
};
