// Mile 14 · Tập 1 · C01–C04 (0–9 s): phòng trực đồn Alder Falls, 2:15 AM. Hướng "gần thật" (PBR + fisheye sau).
// TÔI ngồi (mắt 1,2 m). Điện thoại bàn nhiều line, LINE 2 nháy đỏ. Tay trái nhấc ống nghe (C02),
// ngẩng phắt lên + tay phải chộp bút (C03), viết „MI 14" (C04).
// Đôi tay: lấy từ nhân vật Remy (Mixamo) → ẩn đầu, đặt mắt đúng vị trí camera, IK hai đoạn cho mỗi tay.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { RAW_HFOV, canvasTex, shrinkTex, skinTex, stripExtras } from "./Scene";
import { MARI_ENV } from "./officeEnv";

export const OFFICE_FPS = 30;
export const OFFICE_DURATION_S = 20.4;
type V3 = [number, number, number];
const deg = (d: number) => (d * Math.PI) / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number, a: number, b: number) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const VFOV = (2 * Math.atan(Math.tan(deg(RAW_HFOV / 2)) * (9 / 16)) * 180) / Math.PI;
const rbox = (w: number, h: number, d: number, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, r);

// ---------------------------------------------------------------- thời gian (s) — chỉnh theo độ dài giọng thật
export const TL = {
  ringA: 0.1, ringB: 0.95,          // C01: chuông reo đến lúc nhấc máy
  grabA: 0.55, grabB: 0.95,         // C02: tay trái vươn tới, nắm ống nghe
  liftB: 1.55,                      // ống nghe lên tai
  caller1: [1.2, 3.55] as const,    // "He's standing right next to me."
  jerk: 3.6,                        // C03: ngẩng phắt lên
  penA: 3.85, penB: 4.35,           // tay phải chộp bút
  me1: [3.85, 5.81] as const,        // "Who is? Where are you?"
  writeA: 6.3, writeB: 9.0,         // C04: viết MI 14
  caller2: [6.11, 9.66] as const,     // "Mile fourteen. Don't let the truck leave."
  // ---- C05–C08 (thời gian tính theo độ dài giọng thật: C06 3,87 s · C07 1,80 s · C08 1,72 s)
  dropA: 9.8, dropB: 10.2,          // bút đặt xuống sổ
  hang: 9.95,                       // C05: đèn LINE 2 tắt phụt
  toneA: 9.98, toneB: 10.9,         // tiếng tút trong ống nghe
  putA: 10.3, putB: 10.85,          // đặt ống nghe về giá
  turnA: 10.9, turnB: 11.65,        // C06: quay sang phải nhìn Mari (ghế trượt)
  mari1: [11.7, 15.57] as const,    // "Dropped. No number. But it pinged County Road 9."
  mari2: [15.9, 17.7] as const,     // "Cole's out there already."
  unit7: 15.95,                     // chấm xanh UNIT 7 hiện trên bản đồ
  backA: 17.65, backB: 18.2,        // C08: quay lại bàn
  keyA: 17.95, keyB: 18.4,          // tay phải vơ chùm chìa khoá
  riseA: 18.4, riseB: 19.05,        // bật dậy
  doorA: 18.5, doorB: 19.2,         // xoay về cửa bãi đỗ
  me2: [18.2, 19.92] as const,      // "Tell him to touch nothing."
};

// ---------------------------------------------------------------- bố cục phòng (m), mắt ở (0, 1.2, 0) nhìn -z
const EYE: V3 = [0, 1.2, 0];
const DESK = { y: 0.76, x0: -0.85, x1: 0.85, z0: -0.28, z1: -1.05 };
const PHONE: V3 = [0.0, DESK.y, -0.56];
const PHONE_TILT = deg(14);
const HANDSET_REST: V3 = [-0.135, DESK.y + 0.085, -0.56]; // nằm trên giá bên trái máy, dọc theo trục z
const PAD: V3 = [0.3, DESK.y + 0.004, -0.47];
const PAD_YAW = deg(-12);
const PAD_W = 0.16, PAD_H = 0.22;
const PEN_REST: V3 = [0.47, DESK.y + 0.006, -0.43];

// ---------------------------------------------------------------- camera
const camAt = (t: number) => {
  const br = 0.004 * Math.sin(t * 2.2);
  // C01: nhìn xuống điện thoại (đồng hồ ở mép trên). C02: nghiêng trái theo ống nghe, khựng.
  const lean = smooth(t, 1.0, 1.6);
  // C03: ngẩng phắt lên (nhìn thẳng về tường trước), C04: cúi xuống sổ khi viết
  const jerk = smooth(t, TL.jerk, TL.jerk + 0.22);
  const down = smooth(t, TL.writeA - 0.5, TL.writeA);
  let pitch = -18 + br * 30;
  pitch = lerp(pitch, -2, jerk);
  pitch = lerp(pitch, -34, down);
  let yaw = 2 + 3 * lean;
  yaw = lerp(yaw, -1, jerk);
  yaw = lerp(yaw, -9, down); // sổ nằm bên phải → quay phải nhẹ (yaw âm = phải)
  // C05: nhìn đèn LINE 2 tắt (mắt dán vào máy), C06: quay phải sang Mari, C08: quay lại, bật dậy, xoay về cửa
  const toLED = smooth(t, TL.hang - 0.35, TL.hang + 0.1);
  pitch = lerp(pitch, -20, toLED); yaw = lerp(yaw, 3, toLED);
  const turn = smooth(t, TL.turnA, TL.turnB);
  pitch = lerp(pitch, -2, turn); yaw = lerp(yaw, -90, turn);
  const back = smooth(t, TL.backA, TL.backB);
  pitch = lerp(pitch, -26, back); yaw = lerp(yaw, -6, back);
  const rise = smooth(t, TL.riseA, TL.riseB);
  pitch = lerp(pitch, -3, rise);
  const door = smooth(t, TL.doorA, TL.doorB);
  yaw = lerp(yaw, 118, door);
  const roll = (6 * lean * (1 - 0.4 * down) + (t > TL.jerk && t < TL.jerk + 0.3 ? 1.2 * Math.sin(t * 50) : 0)) * (1 - toLED)
    + 2.5 * Math.sin(Math.PI * turn) + (t > TL.backA ? 2 * Math.sin(Math.PI * back) - 4 * Math.sin(Math.PI * door) : 0);
  const pos: V3 = [
    EYE[0] - 0.03 * lean * (1 - toLED) + 0.8 * turn - 0.7 * back,
    EYE[1] + br - 0.02 * lean * (1 - toLED) + 0.03 * jerk * (1 - down) * (1 - toLED) + 0.4 * rise,
    EYE[2] - 0.08 * down * (1 - toLED) + 0.28 * rise,
  ];
  return { pos, yaw, pitch, roll };
};
const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera, gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.background = new THREE.Color(0x030507);
    const { pos, yaw, pitch, roll } = camAt(t);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...pos);
    cam.rotation.order = "YXZ";
    cam.rotation.set(deg(pitch), deg(yaw), deg(roll));
    cam.fov = VFOV; cam.near = 0.02; cam.far = 80;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }, [camera, gl, scene, t]);
  return null;
};

// ---------------------------------------------------------------- tải nhân vật (tay)
const useRemy = (path = "mile14/idle.fbx") => {
  const [obj, setObj] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender("Remy FBX", { timeoutInMilliseconds: 300000 }));
  useEffect(() => {
    let g: THREE.Group | null = null;
    const mgr = new THREE.LoadingManager(() => { if (g) setObj(g); });
    new FBXLoader(mgr).load(staticFile(path), (x) => { g = x; }, undefined, (e) => { console.error(e); continueRender(handle); });
  }, [handle, path]);
  useEffect(() => { if (obj) setTimeout(() => continueRender(handle), 1500); }, [obj, handle]);
  return obj;
};

// ---------------------------------------------------------------- IK
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion();
const wpos = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
// xoay xương B (quanh gốc của nó) sao cho xương con C chỉ về điểm X (toạ độ thế giới)
const aim = (B: THREE.Object3D, C: THREE.Object3D, X: THREE.Vector3) => {
  B.updateWorldMatrix(true, true);
  const bw = wpos(B);
  _v1.copy(wpos(C)).sub(bw).normalize();
  _v2.copy(X).sub(bw).normalize();
  if (_v1.lengthSq() < 1e-9 || _v2.lengthSq() < 1e-9) return;
  _q.setFromUnitVectors(_v1, _v2);
  const qb = B.getWorldQuaternion(new THREE.Quaternion());
  const qn = _q.multiply(qb);
  B.parent!.getWorldQuaternion(_qp);
  B.quaternion.copy(_qp.invert().multiply(qn));
  B.updateWorldMatrix(false, true);
};
// xoay B quanh trục chỉ của nó (B→C) để vector "n0" (gắn với xương, hệ thế giới lúc nghỉ) khớp hướng mong muốn
const twistTo = (B: THREE.Object3D, C: THREE.Object3D, nLocal: THREE.Vector3, want: THREE.Vector3) => {
  B.updateWorldMatrix(true, true);
  const axis = wpos(C).sub(wpos(B)).normalize();
  const qb = B.getWorldQuaternion(new THREE.Quaternion());
  const cur = nLocal.clone().applyQuaternion(qb);
  const p = (v: THREE.Vector3) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis))).normalize();
  const a = p(cur), b = p(want);
  let ang = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
  if (a.clone().cross(b).dot(axis) < 0) ang = -ang;
  const qw = new THREE.Quaternion().setFromAxisAngle(axis, ang).multiply(qb);
  B.parent!.getWorldQuaternion(_qp);
  B.quaternion.copy(_qp.invert().multiply(qw));
  B.updateWorldMatrix(false, true);
};
type Arm = { arm: THREE.Bone; fore: THREE.Bone; hand: THREE.Bone; mid: THREE.Bone; palmLocal: THREE.Vector3; fingers: THREE.Bone[][]; thumb: THREE.Bone[] };
const solveArm = (A: Arm, target: THREE.Vector3, pole: THREE.Vector3, fingerDir: THREE.Vector3, palmWant: THREE.Vector3, maxBend = Infinity) => {
  const S = wpos(A.arm), E0 = wpos(A.fore), W0 = wpos(A.hand);
  const a = S.distanceTo(E0), b = E0.distanceTo(W0);
  const dvec = target.clone().sub(S);
  const d = THREE.MathUtils.clamp(dvec.length(), 0.05, (a + b) * 0.999);
  const u = dvec.normalize();
  const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const pp = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const elbow = S.clone().add(u.clone().multiplyScalar(a * cosA)).add(pp.multiplyScalar(a * Math.sqrt(1 - cosA * cosA)));
  aim(A.arm, A.fore, elbow);
  aim(A.fore, A.hand, S.clone().add(u.multiplyScalar(d)));
  // giới hạn góc gập cổ tay so với trục cẳng tay (fore → hand): tối đa maxBend rad
  let fd = fingerDir.clone().normalize();
  if (Number.isFinite(maxBend)) {
    const fa = wpos(A.hand).sub(wpos(A.fore)).normalize();
    const ang = Math.acos(THREE.MathUtils.clamp(fa.dot(fd), -1, 1));
    if (ang > maxBend) {
      const ax = fa.clone().cross(fd).normalize();
      fd = fa.clone().applyAxisAngle(ax, maxBend);
    }
  }
  aim(A.hand, A.mid, wpos(A.hand).add(fd));
  twistTo(A.hand, A.mid, A.palmLocal, palmWant);
};
// nắm tay: g = 0 duỗi … 1 nắm chặt (trục gập của ngón Mixamo: x cục bộ)
const grip = (A: Arm, g: number, thumbG: number, sign: number, per: number[] = [1, 1, 1, 1], thumbSign = sign) => {
  A.fingers.forEach((chain, i) =>
    chain.forEach((b, j) => {
      b.rotateX(sign * g * per[i] * (j === 0 ? 0.85 : 1.05) * (1 + i * 0.05));
    })
  );
  thumbCurl(A, thumbG, thumbSign);
};
let LSIGN: [number, number] = [1, 1]; // dấu gập ngón / ngón cái của TAY TRÁI (xương trái lật gương so với tay phải)
// Khép ngón cái vào trong lòng bàn tay để chụm với đầu ngón trỏ
// dấu xoay ngón cái [Y của Thumb1, X của Thumb1, Z của Thumb2-3]
let THUMB_SIGNS: [number, number, number] = [1, -1, 1]; // chọn sau khi thử 8 tổ hợp (V6)
const thumbCurl = (A: Arm, thumbG: number, sign: number) => {
  const [sy, sx, sz] = THUMB_SIGNS;
  A.thumb.forEach((b, j) => {
    if (j === 0) {
      b.rotateY(sign * sy * thumbG * 0.75);
      b.rotateX(sign * sx * thumbG * 0.45);
    } else {
      b.rotateZ(sign * sz * thumbG * 0.45);
    }
  });
};

// ---------------------------------------------------------------- đôi tay (thân Remy, đầu ẩn)
const PovBody: React.FC<{ t: number; src: THREE.Group; handsetRef: { m: THREE.Matrix4 }; keysRef: { m: THREE.Matrix4; held: boolean } }> = ({ t, src, handsetRef, keysRef }) => {
  const { camera } = useThree();
  const worldGroup = useMemo(() => new THREE.Group(), []);
  const pen = useMemo(() => makePen(), []);
  const rig = useMemo(() => {
    const r = src; stripExtras(r);
    // chất liệu: da theo Skinmaterials.blend, áo thun → áo đồng phục nâu ô liu, ẩn đầu/mắt/tóc/mi
    r.traverse((o) => {
      const m = o as THREE.SkinnedMesh; if (!m.isMesh) return;
      m.frustumCulled = false;
      if (/eye|hair|lash/i.test(m.name)) { m.visible = false; return; }
      const conv = (old: THREE.Material) => {
        const o2 = old as THREE.MeshPhongMaterial; const n = old.name.toLowerCase();
        let map = shrinkTex(o2.map);
        if (/body/.test(n) && map) map = skinTex(map);
        const mat = new THREE.MeshPhysicalMaterial({ map, normalMap: shrinkTex(o2.normalMap) ?? null, roughness: /body/.test(n) ? 0.5 : 0.8 });
        if (map) map.colorSpace = THREE.SRGBColorSpace;
        if (/body/.test(n)) { mat.sheen = 0.35; mat.sheenColor = new THREE.Color("#c24a35"); mat.sheenRoughness = 0.6; }
        if (/top/.test(n)) { mat.color = new THREE.Color("#8f8a62"); } // áo đồng phục ô liu (nhân với ảnh áo xám)
        return mat;
      };
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
    });
    // cao 1,80 m
    r.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(r);
    r.scale.multiplyScalar(1.8 / bb.getSize(new THREE.Vector3()).y);
    r.updateMatrixWorld(true);
    const bones: Record<string, THREE.Bone[]> = {};
    r.traverse((o) => { if ((o as THREE.Bone).isBone) (bones[o.name.replace(/^mixamorig\d*:?/, "")] ??= []).push(o as THREE.Bone); });
    const rest = new Map<THREE.Bone, THREE.Quaternion>();
    Object.values(bones).flat().forEach((b) => rest.set(b, b.quaternion.clone()));
    // Remy có nhiều bộ xương trùng tên (Body có bàn tay, Tops chỉ tới cẳng tay…) → giải IK trên bộ có bàn tay,
    // rồi chép góc xoay sang các bản trùng tên
    const rootOf = (b: THREE.Object3D) => { let o: THREE.Object3D = b; while (o.parent && (o.parent as THREE.Bone).isBone) o = o.parent; return o; };
    const mainRoot = rootOf(bones["LeftHand"][0]);
    const primary: Record<string, THREE.Bone> = {};
    for (const [n, list] of Object.entries(bones)) primary[n] = list.find((b) => rootOf(b) === mainRoot) ?? list[0];
    const mkArm = (side: "Left" | "Right"): Arm => {
      const B = (n: string) => primary[side + n];
      const hand = B("Hand");
      // lòng bàn tay lúc chữ T úp xuống (-y thế giới) → đổi sang hệ cục bộ của xương bàn tay
      const qh = hand.getWorldQuaternion(new THREE.Quaternion());
      const palmLocal = new THREE.Vector3(0, -1, 0).applyQuaternion(qh.invert());
      const F = (f: string) => [1, 2, 3].map((k) => B(`Hand${f}${k}`));
      return { arm: B("Arm"), fore: B("ForeArm"), hand, mid: B("HandMiddle1"), palmLocal, fingers: ["Index", "Middle", "Ring", "Pinky"].map(F), thumb: [1, 2, 3].map((k) => B(`HandThumb${k}`)) };
    };
    const arms = [{ L: mkArm("Left"), R: mkArm("Right") }];
    const syncDup = () => { for (const [n, list] of Object.entries(bones)) for (const b of list) if (b !== primary[n]) b.quaternion.copy(primary[n].quaternion); };
    // mắt giữa hai mắt, ở hệ toạ độ của r (để đặt thân sao cho mắt trùng camera)
    r.position.set(0, 0, 0); r.updateMatrixWorld(true);
    const eyeL = wpos(bones["LeftEye"][0]), eyeR = wpos(bones["RightEye"][0]);
    const eyeMid = eyeL.add(eyeR).multiplyScalar(0.5);
    const g = new THREE.Group(); g.add(r);
    return { r, g, bones, rest, arms, eyeMid, syncDup };
  }, [src]);

  // ---- mỗi khung: đặt thân theo camera (chỉ xoay ngang), ẩn đầu, giải IK hai tay
  const { pos, yaw } = camAt(t);
  const { r, g, bones, rest, arms, eyeMid, syncDup } = rig;
  g.position.set(pos[0], pos[1], pos[2]);
  g.rotation.set(0, deg(yaw) + Math.PI, 0); // nhân vật nhìn +z → quay 180° để nhìn -z như camera
  const leanK = Math.min(1, smooth(t, TL.writeA - 0.6, TL.writeA - 0.2) * (1 - smooth(t, TL.dropB, TL.dropB + 0.4)) + smooth(t, TL.keyA - 0.3, TL.keyA + 0.1) * (1 - smooth(t, TL.riseA, TL.riseB)) + smooth(t, TL.putA - 0.2, TL.putA + 0.1) * (1 - smooth(t, TL.putB, TL.putB + 0.3)));
  r.position.set(-eyeMid.x, -eyeMid.y - 0.0 * leanK, -eyeMid.z - 0.07 + 0.2 * leanK); // lúc viết thân chồm tới 20 cm để tay với tới sổ // mắt (đã tính sau khi đổi tỉ lệ) trùng camera, thân lùi 7 cm
  for (const [b, q] of rest) b.quaternion.copy(q);
  for (const hb of bones["Head"] ?? []) hb.scale.setScalar(0.001); // camera nằm trong đầu → thu nhỏ đầu
  for (const nb of bones["Neck"] ?? []) nb.scale.setScalar(0.4);
  g.updateMatrixWorld(true);

  // điểm đích (thế giới)
  const cam = camera as THREE.PerspectiveCamera;
  const camRel = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorld);
  const ry = deg(yaw);
  const fwd = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry));
  const right = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
  const down = new THREE.Vector3(0, -1, 0);
  const restL = new THREE.Vector3(pos[0], 0.62, pos[2]).add(right.clone().multiplyScalar(-0.3)).add(fwd.clone().multiplyScalar(0.05)); // tay buông trên đùi, ngoài khung
  const restR = new THREE.Vector3(pos[0], 0.62, pos[2]).add(right.clone().multiplyScalar(0.3)).add(fwd.clone().multiplyScalar(0.05));
  const nrm = (v: THREE.Vector3) => v.clone().normalize();
  const mix = (a: THREE.Vector3, b: THREE.Vector3, k: number) => nrm(a.clone().lerp(b, k));

  // ===== TAY TRÁI: vươn → nắm thân giữa ống nghe (ngón vòng dưới, ngón cái trên) → nhấc nhẹ → áp lên tai
  // hệ trục bàn tay trong hệ ống nghe (lúc nắm): f = hướng ngón, n = pháp tuyến lòng bàn tay (hướng vào thân ống nghe)
  const reach = smooth(t, TL.grabA, TL.grabB) * (1 - smooth(t, TL.putB + 0.25, TL.putB + 0.7)), rel = smooth(t, TL.putB, TL.putB + 0.25), // đặt khớp (putB) → mở ngón (rel) → rồi mới rút tay (reach)
     lift = smooth(t, TL.grabB + 0.05, TL.liftB), pd = smooth(t, TL.putA, TL.putB);
  const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(PHONE_TILT, 0, 0));
  const camQ = cam.getWorldQuaternion(new THREE.Quaternion());
  const qEar = camQ.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0))));
  const qH = qTilt.clone().slerp(qEar, lift).slerp(qTilt, smooth(pd, 0, 0.75)); // xoay ống nghe (và bàn tay cứng theo nó); đặt xuống: xoay về nằm ngang
  const fLoc = nrm(new THREE.Vector3(...HS_F)), nLoc = nrm(new THREE.Vector3(...HS_N));
  const fH = fLoc.clone().applyQuaternion(qH), nH = nLoc.clone().applyQuaternion(qH);
  const earPiece = camRel(-0.1, -0.05, 0.06);
  const cEar = earPiece.clone().sub(new THREE.Vector3(0, -0.012, -0.085).applyQuaternion(qEar));
  // đặt xuống: từ tai nâng lên CAO hơn thân máy, tới ngay trên giá rồi mới hạ xuống (không quét ngang qua máy)
  const hsRest = new THREE.Vector3(...HANDSET_REST);
  const cAbove = hsRest.clone().add(new THREE.Vector3(0, 0.15, 0.02));
  const cH = hsRest.clone().lerp(cEar, lift).add(new THREE.Vector3(0, 0.06 * Math.sin(Math.PI * lift), 0)) // nhấc cao hơn mặt máy rồi mới đưa lên tai
    .lerp(cAbove, smooth(pd, 0, 0.55)).lerp(hsRest, smooth(pd, 0.55, 1));
  const wristGrip = cH.clone().sub(fH.clone().multiplyScalar(HS_PALM[0])).sub(nH.clone().multiplyScalar(HS_PALM[1]));
  const fL = reach >= 1 ? fH : mix(nrm(fwd.clone().add(new THREE.Vector3(0, -0.3, 0))), fH, reach);
  const nL = reach >= 1 ? nH : mix(down, nH, reach);
  let tL = reach >= 1 ? wristGrip : restL.clone().lerp(wristGrip, reach).add(new THREE.Vector3(0, 0.06 * Math.sin(reach * Math.PI), 0));

  // ===== TAY PHẢI: chộp bút → kẹp thân dưới bút giữa đầu ngón cái và ngón trỏ (ngón giữa đỡ dưới, áp út + út gập vào lòng bàn tay) → viết "Mile 14"
  // từ lúc cầm lên, cây bút là CON của xương bàn tay (hand.add(pen)): luôn nằm chặt trong tay, không còn di chuyển độc lập
  const pose = penPoseAt(t);
  const attached = t >= TL.penB;
  const pr = smooth(t, TL.penA, TL.penB) * (1 - smooth(t, TL.dropB - 0.05, TL.dropB + 0.4)); // sau khi đặt bút xuống, tay rút về
  const eDrop = smooth(t, TL.dropA, TL.dropB);
  const penDir = attached ? pose.D : pose.dir;
  // Hướng ngón tay chúi xuống mặt sổ và hướng lòng bàn tay úp xuống (-Y) + hơi nghiêng vào trong (-right)
  const qPinch = pose.tip.clone().add(penDir.clone().multiplyScalar(PEN_PINCH)).add(new THREE.Vector3(0, 0.012 * (attached ? 0 : 1), 0));
  // cổ tay thẳng, nối liền cẳng tay: hướng bàn tay = hướng từ vai tới điểm kẹp (không còn gập cổ ngỗng)
  const shoulderR = wpos(arms[0].R.arm);
  const fW = nrm(qPinch.clone().sub(shoulderR).add(right.clone().multiplyScalar(-0.04)));
  const nW = nrm(right.clone().multiplyScalar(-0.75).add(new THREE.Vector3(0, -0.66, 0))); // lòng bàn tay quay trái-xuống, mu bàn tay hướng lên-phải
  let fR = mix(nrm(fwd.clone().add(right.clone().multiplyScalar(-0.35)).add(new THREE.Vector3(0, -0.55, 0))), fW, pr);
  const nR = mix(down, nW, pr);
  let tR = restR.clone().lerp(qPinch.clone().sub(fW.clone().multiplyScalar(0.075)).add(new THREE.Vector3(0, -0.02, 0)), pr);

  // ===== C08: tay phải vơ chùm chìa khoá trên bàn rồi mang theo khi bật dậy
  const kr = smooth(t, TL.keyA, TL.keyB), kc = smooth(t, TL.keyB + 0.05, TL.riseA + 0.3), kc2 = smooth(t, TL.riseB - 0.15, TL.doorB + 0.2); // kc: nhấc chìa khoá lên; kc2: thu tay về sát người, ra ngoài khung
  const kOn = t > TL.keyA - 0.4;
  const cD = camRel(0.05, -0.5, -0.5).sub(camRel(0, 0, 0)).normalize();
  if (kOn) {
    const kW = new THREE.Vector3(...KEYS_POS).add(new THREE.Vector3(0, 0.085, 0)).sub(fwd.clone().multiplyScalar(0.05));
    const kF = nrm(fwd.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, -0.85, 0)));
    tR = tR.lerp(kW, kr).lerp(camRel(0.18, -0.14, -0.36), kc).lerp(camRel(0.2, -0.45, -0.08), kc2);
    fR = mix(mix(fR, kF, kr), cD, kc);
  }
  const L = arms[0].L, R = arms[0].R;
  const polL = down.clone().multiplyScalar(1.4).add(right.clone().multiplyScalar(-0.4)); // khuỷu tay thả thấp: cẳng tay không phải bẻ cổ tay để lên tới ống nghe
  const WRIST_L = 0.25; // cổ tay trái gập tối đa ~14° so với cẳng tay
  solveArm(L, tL, polL, fL, nL, WRIST_L);
  grip(L, 0.15 + 0.75 * reach * (1 - rel), 0.4 * reach * (1 - rel), LSIGN[0], [1, 1, 1, 1], LSIGN[1]);
  // ống nghe bám theo bàn tay THẬT (sau khi giới hạn cổ tay): hệ trục tay → hệ ống nghe; lặp để tâm ống nghe trùng vị trí mong muốn
  const bLoc = new THREE.Matrix4().makeBasis(fLoc, nLoc, fLoc.clone().cross(nLoc));
  const handsetFromHand = () => {
    L.hand.updateWorldMatrix(true, false);
    const w = wpos(L.hand);
    const fA = nrm(wpos(L.mid).sub(w));
    let nA = L.palmLocal.clone().applyQuaternion(L.hand.getWorldQuaternion(new THREE.Quaternion()));
    nA = nrm(nA.sub(fA.clone().multiplyScalar(nA.dot(fA))));
    const bH = new THREE.Matrix4().makeBasis(fA, nA, fA.clone().cross(nA));
    const Q = new THREE.Quaternion().setFromRotationMatrix(bH.multiply(bLoc.clone().transpose()));
    return { Q, c: w.clone().add(fA.clone().multiplyScalar(HS_PALM[0])).add(nA.clone().multiplyScalar(HS_PALM[1])) };
  };
  if (reach >= 1) for (let k = 0; k < 2; k++) {
    g.updateMatrixWorld(true);
    tL = tL.add(cH.clone().sub(handsetFromHand().c).multiplyScalar(0.8));
    solveArm(L, tL, polL, fL, nL, WRIST_L);
  }
  const polR = down.clone().multiplyScalar(1.2).add(right.clone().multiplyScalar(0.8)); // khuỷu tay hạ thấp, ra ngoài
  solveArm(R, tR, polR, fR, nR);
  // Ngón trỏ gập vừa (0.65) để kẹp thân bút cùng ngón cái, ngón giữa đỡ dưới (1.05), áp út & út cuộn gọn (1.65, 1.85)
  grip(R, 0.15 + 0.75 * pr, THUMB_G * pr, 1, [0.65, 1.05, 1.65, 1.85]);
  const gK = smooth(t, TL.keyB - 0.18, TL.keyB);
  if (kOn) grip(R, 0.85 * gK, 0.4 * gK, 1);
  // hiệu chỉnh: điểm kẹp (giữa đầu ngón trỏ và đầu ngón cái) trùng điểm kẹp trên thân bút
  g.updateMatrixWorld(true);
  const pinchNow = () => wpos(R.fingers[0][2]).add(wpos(R.thumb[2])).multiplyScalar(0.5).add(fR.clone().multiplyScalar(0.012));
  for (let k = 0; k < 3; k++) { // lặp 3 lần cho điểm kẹp trùng khít điểm kẹp trên thân bút (ngòi chạm đúng chỗ trên giấy)
    tR = tR.add(qPinch.clone().sub(pinchNow()).multiplyScalar(0.5 * pr)); // hệ số nhỏ để không kéo cổ tay bật ngược lên
    solveArm(R, tR, polR, fR, nR, WRIST_MAX);
    g.updateMatrixWorld(true);
  }
  syncDup();
  g.updateMatrixWorld(true);
  // gắn bút
  const handR = R.fingers[0][1]; // bút là con của đốt giữa ngón trỏ → bám theo ngón khi gập và khi viết
  if (attached) {
    const tipW = pinchNow().sub(penDir.clone().multiplyScalar(PEN_PINCH));
    if (eDrop < 1e-4) {
      const penW = new THREE.Matrix4().compose(tipW, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), penDir), new THREE.Vector3(1, 1, 1));
      if (pen.parent !== handR) handR.add(pen);
      pen.matrixAutoUpdate = false;
      pen.matrix.copy(handR.matrixWorld).invert().multiply(penW); // toạ độ cục bộ trong xương bàn tay
    } else { // đặt bút xuống sổ: từ tư thế cầm → nằm ngang trên giấy (cuối nét viết)
      const lyTip = tipWorld(TL.writeB).clone(); lyTip.y = DESK.y + 0.0065;
      if (pen.parent !== worldGroup) worldGroup.add(pen);
      pen.matrixAutoUpdate = true; pen.scale.set(1, 1, 1);
      pen.position.copy(tipW.clone().lerp(lyTip, eDrop));
      pen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), penDir.clone().lerp(PEN_REST_DIR, eDrop).normalize());
    }
  } else {
    if (pen.parent !== worldGroup) worldGroup.add(pen);
    pen.matrixAutoUpdate = true; pen.scale.set(1, 1, 1);
    pen.position.copy(pose.tip); pen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pose.dir);
  }
  pen.updateMatrixWorld(true);
  // ống nghe bám theo bàn tay (giữ nguyên vị trí tương đối đã nắm)
  if (reach >= 1) {
    const hh = handsetFromHand();
    if (t >= TL.putB) handsetRef.m.identity(); // đã nằm khít trong khe gác: ống nghe thành vật đứng yên, tay chỉ còn mở ngón
    else { // hạ vào khe: vị trí và trục ống nghe hội tụ về đúng khe gác (trục thẳng hàng với thân máy)
      const sr = smooth(pd, 0.6, 1);
      handsetRef.m.compose(hh.c.lerp(hsRest, sr), hh.Q.slerp(qTilt, sr), new THREE.Vector3(1, 1, 1));
    }
  } else handsetRef.m.identity();
  // chùm chìa khoá: nằm trên bàn đến lúc tay phải nắm, rồi lủng lẳng trong tay
  keysRef.held = t >= TL.keyB;
  if (keysRef.held) {
    const sw = 0.25 * Math.sin((t - TL.keyB) * 11) * Math.exp(-(t - TL.keyB) * 0.6);
    const hp = wpos(R.hand).add(fR.clone().multiplyScalar(0.075)).add(new THREE.Vector3(0, -0.03, 0));
    keysRef.m.compose(hp, new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + sw, 0, 0.5 * sw)), new THREE.Vector3(1, 1, 1));
  }
  return <><primitive object={g} /><primitive object={worldGroup} /></>;
};
// vị trí ống nghe / bút trong hệ toạ độ xương bàn tay (đơn vị xương, đã chia tỉ lệ) — chỉnh bằng ảnh thử
// tư thế nắm ống nghe, tính trong hệ toạ độ ống nghe: f = hướng ngón (xuống, hơi ra ngoài), n = lòng bàn tay hướng vào thân từ bên trái
const MARI_DESK_X = 2.1, MARI_X = 2.76, MARI_Z = 0.0; // bàn, hông Mari, trục z
const KEYS_POS: V3 = [0.6, DESK.y + 0.006, -0.33]; // chùm chìa khoá trên bàn, bên phải
const HS_F: V3 = [0.35, -0.9, 0], HS_N: V3 = [0.9, 0.35, 0];
const HS_PALM = [0.12, 0.028]; // cổ tay → tâm thân ống nghe: dọc ngón / theo pháp tuyến lòng bàn tay (m)
const THUMB_VARIANTS: [number, number, number][] = [[1, 1, -1], [-1, 1, -1], [1, -1, -1], [1, 1, 1], [-1, -1, 1], [-1, -1, -1], [1, -1, 1], [-1, 1, 1]];
const THUMB_G = 0.5; // độ khép ngón cái (vừa phải 0.35–0.5)
const WRIST_MAX = 0.35; // góc gập cổ tay tối đa so với cẳng tay (rad ≈ 20°)
const PEN_PINCH = 0.04; // điểm kẹp cách đầu bút (m)

// ---------------------------------------------------------------- phòng
const useTex = () => useMemo(() => ({
  wall: canvasTex(512, 512, (c) => { c.fillStyle = "#b9b19c"; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 4000; i++) { c.fillStyle = rnd(i) > 0.5 ? "rgba(0,0,0,.035)" : "rgba(255,255,255,.03)"; c.fillRect(rnd(i + 1) * 512, rnd(i + 2) * 512, 2, 2); } }),
  floor: canvasTex(512, 512, (c) => { c.fillStyle = "#5a5446"; c.fillRect(0, 0, 512, 512); c.strokeStyle = "rgba(0,0,0,.25)"; for (let k = 0; k <= 512; k += 128) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 512); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(512, k); c.stroke(); } for (let i = 0; i < 3000; i++) { c.fillStyle = "rgba(0,0,0,.05)"; c.fillRect(rnd(i + 5) * 512, rnd(i + 6) * 512, 3, 3); } }),
  wood: canvasTex(512, 256, (c) => { c.fillStyle = "#6b4a2e"; c.fillRect(0, 0, 512, 256); for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(40,22,10,${0.08 + rnd(i) * 0.12})`; c.lineWidth = 1 + rnd(i + 3) * 2; c.beginPath(); const y = rnd(i + 7) * 256; c.moveTo(0, y); c.bezierCurveTo(170, y + 6 * Math.sin(i), 340, y - 6, 512, y + 3); c.stroke(); } }),
  clock: canvasTex(256, 256, (c) => { c.fillStyle = "#f2efe6"; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill(); c.fillStyle = "#1c1c1c"; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.save(); c.translate(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); c.rotate(a); c.fillRect(-3, -10, 6, 20); c.restore(); } c.font = "bold 22px 'DejaVu Sans'"; c.textAlign = "center"; c.fillText("12", 128, 52); c.fillText("3", 210, 136); c.fillText("6", 128, 222); c.fillText("9", 46, 136); }),
}), []);

// mưa chảy trên kính (vẽ lại mỗi khung)
const useRainGlass = (t: number) => {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 512;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }, []);
  const cv = tex.image as HTMLCanvasElement, c = cv.getContext("2d")!;
  c.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { // giọt đọng
    const x = rnd(i) * 512, y = rnd(i + 900) * 512, r = 1.2 + rnd(i + 40) * 3.2;
    c.fillStyle = "rgba(210,225,235,.22)"; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x - r * 0.35, y - r * 0.45, 1.2, 1.2);
  }
  for (let i = 0; i < 26; i++) { // vệt chảy
    const sp = 60 + rnd(i + 70) * 140, x = rnd(i + 300) * 512 + 4 * Math.sin(t * 2 + i);
    const y = ((rnd(i + 500) * 700 + t * sp) % 700) - 100;
    const grad = c.createLinearGradient(x, y - 90, x, y);
    grad.addColorStop(0, "rgba(200,220,235,0)"); grad.addColorStop(1, "rgba(220,235,245,.4)");
    c.strokeStyle = grad; c.lineWidth = 2 + rnd(i) * 2; c.beginPath(); c.moveTo(x, y - 90); c.lineTo(x + 2 * Math.sin(i), y); c.stroke();
    c.fillStyle = "rgba(235,245,255,.55)"; c.beginPath(); c.arc(x, y, 3 + rnd(i) * 2, 0, Math.PI * 2); c.fill();
  }
  tex.needsUpdate = true;
  return tex;
};

const Room: React.FC<{ t: number }> = ({ t }) => {
  const T = useTex();
  const glass = useRainGlass(t);
  const wallM = useMemo(() => new THREE.MeshStandardMaterial({ map: T.wall, roughness: 0.92 }), [T]);
  const wood = useMemo(() => new THREE.MeshPhysicalMaterial({ map: T.wood, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35 }), [T]);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3d4044", metalness: 0.7, roughness: 0.45 }), []);
  const sec = (2 * 60 + 15) * 60 + 7 + t; // 2:15:07…
  const minA = ((sec / 60) % 60) / 60 * Math.PI * 2, hrA = ((sec / 3600) % 12) / 12 * Math.PI * 2, sA = (Math.floor(sec) % 60) / 60 * Math.PI * 2;
  return (
    <group>
      {/* sàn, trần, tường */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.3, 0, 0]}><planeGeometry args={[5, 4]} /><meshStandardMaterial map={T.floor} roughness={0.75} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[1.3, 2.7, 0]}><planeGeometry args={[5, 4]} /><meshStandardMaterial color="#d8d4c8" roughness={0.95} /></mesh>
      <mesh position={[1.3, 1.35, -1.5]} material={wallM}><planeGeometry args={[5, 2.7]} /></mesh>
      <mesh position={[3.8, 1.35, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallM}><planeGeometry args={[4, 2.7]} /></mesh>
      <mesh position={[1.3, 1.35, 2]} rotation={[0, Math.PI, 0]} material={wallM}><planeGeometry args={[5, 2.7]} /></mesh>
      {/* tường trái có cửa sổ (y 0.95–2.05, z -0.2…-1.3) */}
      <mesh position={[-1.2, 0.475, 0.25]} rotation={[0, Math.PI / 2, 0]} material={wallM}><planeGeometry args={[3.5, 0.95]} /></mesh>
      <mesh position={[-1.2, 2.375, 0.25]} rotation={[0, Math.PI / 2, 0]} material={wallM}><planeGeometry args={[3.5, 0.65]} /></mesh>
      <mesh position={[-1.2, 1.5, 0.9]} rotation={[0, Math.PI / 2, 0]} material={wallM}><planeGeometry args={[2.2, 1.1]} /></mesh>
      <mesh position={[-1.2, 1.5, -1.4]} rotation={[0, Math.PI / 2, 0]} material={wallM}><planeGeometry args={[0.2, 1.1]} /></mesh>
      {/* khung cửa sổ nhôm + kính có mưa */}
      {([[0, 0.95, -0.75, 1.1, 0.05], [0, 2.05, -0.75, 1.1, 0.05], [0, 1.5, -0.2, 0.05, 1.1], [0, 1.5, -1.3, 0.05, 1.1], [0, 1.5, -0.75, 0.035, 1.1]] as number[][]).map(([, y, z, w, h], i) => (
        <mesh key={i} position={[-1.19, y, z]} rotation={[0, Math.PI / 2, 0]} material={metal}><boxGeometry args={[w, h, 0.05]} /></mesh>
      ))}
      <mesh position={[-1.18, 1.5, -0.75]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshPhysicalMaterial map={glass} transparent roughness={0.05} clearcoat={1} color="#ffffff" opacity={1} depthWrite={false} />
      </mesh>
      {/* ngoài cửa sổ: bãi đỗ ướt, đèn đường natri, xe tuần tra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8, -0.3, -1]}><planeGeometry args={[14, 14]} /><meshPhysicalMaterial color="#0d0e10" roughness={0.12} clearcoat={1} /></mesh>
      <group position={[-6.5, -0.3, -3.2]}>
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.06, 0.08, 5, 12]} /><meshStandardMaterial color="#2a2c2e" /></mesh>
        <mesh position={[0.35, 4.95, 0]}><boxGeometry args={[0.7, 0.12, 0.25]} /><meshStandardMaterial color="#2a2c2e" /></mesh>
        <mesh position={[0.55, 4.88, 0]}><boxGeometry args={[0.3, 0.02, 0.18]} /><meshBasicMaterial color="#ffb259" toneMapped={false} /></mesh>
        <pointLight position={[0.55, 4.6, 0]} color="#ff9e45" intensity={60} distance={14} decay={2} />
      </group>
      <group position={[-5.2, -0.3, -0.6]} rotation={[0, deg(70), 0]}>
        <mesh position={[0, 0.65, 0]}><boxGeometry args={[1.85, 0.75, 4.8]} /><meshPhysicalMaterial color="#d9dcdf" roughness={0.35} clearcoat={1} /></mesh>
        <mesh position={[0, 1.25, -0.2]}><boxGeometry args={[1.6, 0.55, 2.2]} /><meshPhysicalMaterial color="#0b0e12" roughness={0.2} clearcoat={1} /></mesh>
        <mesh position={[0, 1.58, -0.2]}><boxGeometry args={[1.2, 0.1, 0.25]} /><meshStandardMaterial color="#3a0c0c" /></mesh>
      </group>
      <OutsideRain t={t} />
      {/* đồng hồ treo tường 2:15 */}
      <group position={[0.38, 1.52, -1.48]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.165, 0.165, 0.04, 48]} /><meshStandardMaterial color="#1d1d1f" metalness={0.3} roughness={0.5} /></mesh>
        <mesh position={[0, 0, 0.021]} rotation={[0, 0, 0]}><circleGeometry args={[0.15, 48]} /><meshStandardMaterial map={T.clock} roughness={0.6} /></mesh>
        <mesh position={[0, 0, 0.026]} rotation={[0, 0, -hrA]}><planeGeometry args={[0.014, 0.08]} onUpdate={(g) => g.translate(0, 0.035, 0)} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, 0, 0.028]} rotation={[0, 0, -minA]}><planeGeometry args={[0.009, 0.12]} onUpdate={(g) => g.translate(0, 0.055, 0)} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, 0, 0.03]} rotation={[0, 0, -sA]}><planeGeometry args={[0.003, 0.14]} onUpdate={(g) => g.translate(0, 0.05, 0)} /><meshBasicMaterial color="#b51e1e" /></mesh>
      </group>
      {/* bảng ghim + tủ hồ sơ */}
      <mesh position={[-0.55, 1.6, -1.49]}><boxGeometry args={[0.9, 0.6, 0.02]} /><meshStandardMaterial color="#8a6a45" roughness={0.95} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.85 + rnd(i) * 0.6, 1.45 + rnd(i + 9) * 0.3, -1.475]} rotation={[0, 0, (rnd(i + 4) - 0.5) * 0.2]}><planeGeometry args={[0.14 + rnd(i + 2) * 0.06, 0.18]} /><meshStandardMaterial color={["#efe9da", "#f3e7a8", "#e9eef2", "#efe9da", "#f6d6c8"][i]} roughness={0.9} /></mesh>
      ))}
      <mesh position={[1.2, 0.65, -1.25]} material={metal}><boxGeometry args={[0.5, 1.3, 0.5]} /></mesh>
      {/* bàn TÔI */}
      <mesh position={[(DESK.x0 + DESK.x1) / 2, DESK.y - 0.02, (DESK.z0 + DESK.z1) / 2]} material={wood} geometry={rbox(DESK.x1 - DESK.x0, 0.04, DESK.z0 - DESK.z1 + 0.0, 0.008)} />
      <mesh position={[0, DESK.y / 2, DESK.z1 + 0.02]} material={wood}><boxGeometry args={[1.6, DESK.y - 0.05, 0.02]} /></mesh>
      <mesh position={[DESK.x0 + 0.2, DESK.y / 2, -0.66]} material={wood}><boxGeometry args={[0.4, DESK.y - 0.05, 0.74]} /></mesh>
      {/* bàn điều phối của Mari (bên phải): Mari ngồi quay về phía TÔI, hai màn hình quay lưng ra, bản đồ lớn treo trên tường phải */}
      <group position={[MARI_DESK_X, 0, MARI_Z]}>
        <mesh position={[0, 0.74, 0]} material={wood}><boxGeometry args={[0.7, 0.04, 1.5]} /></mesh>
        <mesh position={[-0.3, 0.37, 0]} material={wood}><boxGeometry args={[0.04, 0.72, 1.4]} /></mesh>
        {[-1, 1].map((k) => (
          <group key={k} position={[-0.12, 1.0, k * 0.45]} rotation={[0, deg(90 + k * 18), 0]}>
            <mesh><boxGeometry args={[0.56, 0.36, 0.03]} /><meshStandardMaterial color="#17181a" roughness={0.6} /></mesh>
            <mesh position={[0, 0, 0.016]}><planeGeometry args={[0.52, 0.32]} /><meshBasicMaterial color="#1d3a55" toneMapped={false} /></mesh>
            <mesh position={[0, -0.24, -0.04]}><boxGeometry args={[0.05, 0.12, 0.05]} /><meshStandardMaterial color="#17181a" /></mesh>
          </group>
        ))}
        <mesh position={[0.2, 0.757, 0]}><boxGeometry args={[0.15, 0.015, 0.42]} /><meshStandardMaterial color="#25272a" roughness={0.6} /></mesh>
        <mesh position={[0.2, 0.7655, 0.1]} rotation={[0, 0, 0]}><boxGeometry args={[0.13, 0.002, 0.2]} /><meshStandardMaterial color="#3a3d42" roughness={0.5} /></mesh>
        <mesh position={[0.2, 0.7655, -0.1]}><boxGeometry args={[0.13, 0.002, 0.2]} /><meshStandardMaterial color="#3a3d42" roughness={0.5} /></mesh>
        <pointLight position={[0.35, 1.1, 0]} color="#6a9ad0" intensity={0.5} distance={2} decay={2} />
      </group>
      <mesh position={[MARI_X + 0.05, 0.46, MARI_Z]} material={metal}><boxGeometry args={[0.46, 0.06, 0.46]} /></mesh>
      <mesh position={[MARI_X + 0.3, 0.76, MARI_Z]} material={metal}><boxGeometry args={[0.06, 0.52, 0.44]} /></mesh>
      <mesh position={[MARI_X + 0.05, 0.24, MARI_Z]} material={metal}><cylinderGeometry args={[0.03, 0.03, 0.4, 10]} /></mesh>
      <MapScreen t={t} />
      <pointLight position={[1.8, 2.3, -0.1]} color="#ffd9a8" intensity={1.6} distance={5} decay={2} />
      {/* cửa bãi đỗ xe trên tường trái, phía sau ghế TÔI */}
      <group position={[-1.19, 0, 1.0]}>
        <mesh position={[0, 1.03, 0]}><boxGeometry args={[0.07, 2.08, 1.04]} /><meshStandardMaterial color="#25282b" roughness={0.6} /></mesh>
        <mesh position={[0.03, 1.0, 0]}><boxGeometry args={[0.04, 2.0, 0.88]} /><meshStandardMaterial color="#4a5058" roughness={0.5} metalness={0.4} /></mesh>
        <mesh position={[0.055, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.2, 0.5]} /><meshBasicMaterial color="#d98a3a" toneMapped={false} /></mesh>
        <mesh position={[0.06, 1.0, 0.32]}><boxGeometry args={[0.03, 0.04, 0.26]} /><meshStandardMaterial color="#c9ccd0" metalness={1} roughness={0.3} /></mesh>
        <mesh position={[0.05, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.34, 0.14]} /><meshBasicMaterial color="#e0301f" toneMapped={false} /></mesh>
        <pointLight position={[0.5, 1.4, 0]} color="#ff9e45" intensity={1.2} distance={2.5} decay={2} />
      </group>
      {/* đèn bàn: tay đèn, chao, ánh vàng */}
      <DeskLamp />
      {/* đồ trên bàn: cốc cà phê, chùm chìa khoá, khay giấy */}
      <group position={[0.6, DESK.y, -0.78]}>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.04, 0.036, 0.1, 32, 1, true]} /><meshPhysicalMaterial color="#e9e4d8" roughness={0.25} clearcoat={0.8} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.037, 32]} /><meshPhysicalMaterial color="#1d120a" roughness={0.05} clearcoat={1} /></mesh>
        <mesh position={[0.045, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.022, 0.006, 8, 20, Math.PI]} /><meshPhysicalMaterial color="#e9e4d8" roughness={0.25} /></mesh>
      </group>
      <mesh position={[-0.42, DESK.y + 0.02, -0.88]} rotation={[0, deg(8), 0]}><boxGeometry args={[0.24, 0.04, 0.32]} /><meshStandardMaterial color="#222426" roughness={0.6} /></mesh>
      <mesh position={[-0.42, DESK.y + 0.045, -0.88]} rotation={[-Math.PI / 2, 0, deg(8)]}><planeGeometry args={[0.21, 0.29]} /><meshStandardMaterial color="#cfcbc0" roughness={0.9} /></mesh>
    </group>
  );
};

const OutsideRain: React.FC<{ t: number }> = ({ t }) => {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const N = 600;
  const pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    const x = -1.6 - rnd(i) * 9, z = 1 - rnd(i + 1) * 7, sp = 9;
    const y = 5 - ((rnd(i + 2) * 6 + t * sp) % 6);
    pos.set([x, y, z, x + 0.02, y - 0.22, z], i * 6);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return <lineSegments geometry={geo}><lineBasicMaterial color="#c9b49a" transparent opacity={0.22} /></lineSegments>;
};

const DeskLamp: React.FC = () => {
  const spot = useMemo(() => { const l = new THREE.SpotLight("#ffd39a", 3.2, 4, deg(50), 0.7, 2); l.target.position.set(0.55, -0.55, 0.3); l.add(l.target); return l; }, []);
  const glow = useMemo(() => canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,230,180,1)"); g.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }), []);
  const m = <meshStandardMaterial color="#1b4a3a" metalness={0.6} roughness={0.35} />;
  return (
    <group position={[-0.62, DESK.y, -0.86]}>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.09, 0.1, 0.024, 32]} />{m}</mesh>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, deg(-8)]}><cylinderGeometry args={[0.01, 0.01, 0.38, 10]} />{m}</mesh>
      <mesh position={[0.1, 0.39, 0.05]} rotation={[deg(10), 0, deg(-62)]}><cylinderGeometry args={[0.01, 0.01, 0.3, 10]} />{m}</mesh>
      <group position={[0.24, 0.44, 0.1]} rotation={[deg(20), 0, deg(-40)]}>
        <mesh position={[0, -0.03, 0]}><coneGeometry args={[0.09, 0.14, 32, 1, true]} /><meshStandardMaterial color="#1b4a3a" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.08, 0]}><sphereGeometry args={[0.03, 16, 12]} /><meshBasicMaterial color="#fff0d0" toneMapped={false} /></mesh>
        <sprite position={[0, -0.1, 0]} scale={[0.35, 0.35, 1]}><spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.5} /></sprite>
        <primitive object={spot} position={[0, -0.08, 0]} />
      </group>
      <pointLight position={[0.24, 0.3, 0.15]} color="#ffcf8a" intensity={0.5} distance={3} decay={2} />
    </group>
  );
};

const Keys: React.FC<{ kref: { m: THREE.Matrix4; held: boolean } }> = ({ kref }) => {
  const metalK = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b9b3a6", metalness: 1, roughness: 0.3 }), []);
  const g = useMemo(() => new THREE.Group(), []);
  g.matrixAutoUpdate = !kref.held;
  if (kref.held) g.matrix.copy(kref.m);
  else { g.position.set(...KEYS_POS); g.rotation.set(0, deg(-20), 0); }
  return (
    <primitive object={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={metalK}><torusGeometry args={[0.018, 0.0022, 8, 28]} /></mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, deg(-25 + i * 32), 0]}>
          <mesh position={[0, 0, -0.045]} material={metalK}><boxGeometry args={[0.012, 0.002, 0.05]} /></mesh>
          <mesh position={[0, 0.002, -0.015]}><boxGeometry args={[0.024, 0.006, 0.022]} /><meshStandardMaterial color={i === 0 ? "#111" : "#5a5a5a"} roughness={0.5} /></mesh>
        </group>
      ))}
    </primitive>
  );
};

// ---------------------------------------------------------------- điện thoại bàn nhiều line
const usePhoneTex = () => useMemo(() => ({
  lcd: canvasTex(256, 64, (c) => { c.fillStyle = "#9db08a"; c.fillRect(0, 0, 256, 64); c.fillStyle = "#1e2a18"; c.font = "bold 26px 'DejaVu Sans Mono'"; c.fillText("LINE 2   2:15", 12, 42); }),
  keys: canvasTex(256, 320, (c) => { c.fillStyle = "#26282b"; c.fillRect(0, 0, 256, 320); const L = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]; c.font = "bold 34px 'DejaVu Sans'"; c.textAlign = "center"; L.forEach((k, i) => { const x = 42 + (i % 3) * 86, y = 40 + Math.floor(i / 3) * 78; c.fillStyle = "#4a4d52"; c.fillRect(x - 34, y - 28, 68, 58); c.fillStyle = "#e8e8e8"; c.fillText(k, x, y + 12); }); }),
  lines: canvasTex(128, 256, (c) => { c.fillStyle = "#26282b"; c.fillRect(0, 0, 128, 256); c.font = "bold 20px 'DejaVu Sans'"; c.fillStyle = "#d8d8d8"; ["LINE 1", "LINE 2", "LINE 3", "LINE 4"].forEach((s, i) => c.fillText(s, 46, 40 + i * 60)); }),
}), []);
const Phone: React.FC<{ t: number; handset: THREE.Matrix4 }> = ({ t, handset }) => {
  const T = usePhoneTex();
  const plastic = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1f2124", roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 }), []);
  // LINE 2: nháy đỏ khi đổ chuông (2 lần/s), sáng đứng khi đang nghe
  const ringing = t < TL.grabB;
  const on = t >= TL.hang ? false : ringing ? Math.floor(t * 4) % 2 === 0 : true; // C05: tắt phụt khi người gọi cúp máy
  const free = handset.elements[15] === 1 && handset.elements[0] === 1 && handset.elements[5] === 1; // ma trận đơn vị = còn nằm trên giá
  const ringShake = ringing && t > TL.ringA ? 0.0008 * Math.sin(t * 160) : 0;
  return (
    <group>
      <group position={PHONE} rotation={[PHONE_TILT, 0, 0]}>
        <mesh position={[0, 0.035 + ringShake, 0]} material={plastic} geometry={rbox(0.24, 0.07, 0.21, 0.015)} />
        <mesh position={[0.025, 0.0705, -0.04]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.1, 0.025]} /><meshStandardMaterial map={T.lcd} emissive="#9db08a" emissiveIntensity={0.25} emissiveMap={T.lcd} /></mesh>
        <mesh position={[0.025, 0.0705, 0.035]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.08, 0.1]} /><meshStandardMaterial map={T.keys} roughness={0.5} /></mesh>
        <mesh position={[0.095, 0.0705, 0.0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.04, 0.16]} /><meshStandardMaterial map={T.lines} roughness={0.5} /></mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.083, 0.072, -0.063 + i * 0.0375]}>
            <boxGeometry args={[0.007, 0.004, 0.007]} />
            {i === 1 ? <meshBasicMaterial color={on ? "#ff2a1a" : "#3a0a08"} toneMapped={false} /> : <meshStandardMaterial color="#202020" />}
          </mesh>
        ))}
        {on && <pointLight position={[0.083, 0.09, -0.025]} color="#ff2a1a" intensity={on ? 0.05 : 0} distance={0.4} decay={2} />}
        {/* giá đặt ống nghe */}
        <mesh position={[-0.135, 0.06, 0]} material={plastic} geometry={rbox(0.06, 0.03, 0.2, 0.01)} />
      </group>
      <Handset matrix={free ? null : handset} plastic={plastic} />
      <Cord handset={free ? null : handset} />
    </group>
  );
};
// ống nghe: tay cầm cong + hai đầu loa/micro; nằm dọc trục z, tâm ở gốc
const handsetGeo = () => {
  const g = new THREE.Group();
  return g;
};
const Handset: React.FC<{ matrix: THREE.Matrix4 | null; plastic: THREE.Material }> = ({ matrix, plastic }) => {
  const obj = useMemo(() => {
    const g = handsetGeo();
    const grip = new THREE.Mesh(rbox(0.04, 0.03, 0.15, 0.012), plastic); g.add(grip);
    const ear = new THREE.Mesh(rbox(0.052, 0.04, 0.06, 0.014), plastic); ear.position.set(0, -0.012, -0.085); g.add(ear);
    const mic = new THREE.Mesh(rbox(0.05, 0.04, 0.055, 0.014), plastic); mic.position.set(0, -0.012, 0.085); g.add(mic);
    return g;
  }, [plastic]);
  if (matrix) { obj.matrixAutoUpdate = false; obj.matrix.copy(matrix); }
  else { obj.matrixAutoUpdate = true; obj.position.set(...HANDSET_REST); obj.rotation.set(PHONE_TILT, 0, 0); obj.updateMatrix(); }
  return <primitive object={obj} />;
};
// dây xoắn: từ cạnh trái máy tới đầu micro ống nghe
const Cord: React.FC<{ handset: THREE.Matrix4 | null }> = ({ handset }) => {
  const a = new THREE.Vector3(-0.15, DESK.y + 0.02, -0.47);
  const b = handset ? new THREE.Vector3(0, -0.015, 0.11).applyMatrix4(handset) : new THREE.Vector3(HANDSET_REST[0] - 0.01, HANDSET_REST[1] - 0.02, HANDSET_REST[2] + 0.1);
  const sag = Math.max(0.05, 0.25 - a.distanceTo(b) * 0.3);
  const N = 400, turns = 70;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = a.clone().lerp(b, u); p.y -= sag * Math.sin(u * Math.PI) * (handset ? 1 : 0.2);
    const ang = u * turns * Math.PI * 2;
    p.x += 0.003 * Math.cos(ang); p.y += 0.003 * Math.sin(ang);
    pts.push(p);
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, 0.0012, 6, false);
  return <mesh geometry={geo}><meshPhysicalMaterial color="#1a1b1d" roughness={0.4} clearcoat={0.5} /></mesh>;
};

// ---------------------------------------------------------------- sổ + bút + nét chữ „MI 14"
// chữ „Mile 14" viết thẳng hàng trên một dòng kẻ của sổ (toạ độ điểm ảnh của canvas 512×704; đường cơ sở y = 188 nằm trên dòng kẻ thứ tư)
const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 10): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as [number, number]; });
const BL = 188, CAP = 156, XH = 170;
const STROKES_PX: [number, number][][] = [
  [[76, BL], [76, CAP], [98, BL - 4], [120, CAP], [120, BL]],                       // M
  [[138, XH], [138, BL]], [[138, CAP + 5], [138.5, CAP + 7]],                       // i (thân + chấm)
  [[156, CAP], [156, BL]],                                                          // l
  [[170, BL - 9], [188, BL - 9], ...arcPts(179, BL - 9, 9, 9, -0.1, -Math.PI * 1.75, 10)], // e
  [[236, CAP + 7], [246, CAP], [246, BL]],                                          // 1
  [[286, CAP], [262, BL - 9], [292, BL - 9]], [[281, CAP + 4], [281, BL]],          // 4
];
// phóng to chữ (×1.3), đặt đường cơ sở đúng lên dòng kẻ y = 200 như ảnh mẫu
const TXT_S = 1.3, TXT_X0 = 70, TXT_BL = 200;
const STROKES: [number, number][][] = STROKES_PX.map((st) => st.map(([x, y]) => [(TXT_X0 + (x - 76) * TXT_S) / 512, (TXT_BL - (BL - y) * TXT_S) / 704] as [number, number]));
const strokeLens = STROKES.map((s) => s.slice(1).reduce((L, p, i) => L + Math.hypot(p[0] - s[i][0], p[1] - s[i][1]), 0));
const TOTAL_LEN = strokeLens.reduce((a, b) => a + b, 0);
const GAP = 0.12; // thời gian nhấc bút giữa nét (tỉ lệ)
// trả về điểm đang viết + bút có chạm giấy không, theo tiến độ 0..1
const penAt = (k: number) => {
  const segs = STROKES.length; const total = TOTAL_LEN + GAP * (segs - 1);
  let d = k * total;
  for (let s = 0; s < segs; s++) {
    if (d <= strokeLens[s]) {
      const pts = STROKES[s]; let dd = d;
      for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (dd <= L) { const f = dd / L; return { u: lerp(pts[i - 1][0], pts[i][0], f), v: lerp(pts[i - 1][1], pts[i][1], f), down: true, s, done: d }; } dd -= L; }
      return { u: pts[pts.length - 1][0], v: pts[pts.length - 1][1], down: true, s, done: d };
    }
    d -= strokeLens[s];
    if (s < segs - 1) { if (d <= GAP) { const f = d / GAP, A = STROKES[s][STROKES[s].length - 1], B = STROKES[s + 1][0]; return { u: lerp(A[0], B[0], f), v: lerp(A[1], B[1], f), down: false, s, done: 0 }; } d -= GAP; }
  }
  const L = STROKES[segs - 1]; return { u: L[L.length - 1][0], v: L[L.length - 1][1], down: false, s: segs, done: 0 };
};
const padToWorld = (u: number, v: number, lift = 0) => {
  const lx = (u - 0.5) * PAD_W, lz = (v - 0.5) * PAD_H;
  const c = Math.cos(PAD_YAW), s = Math.sin(PAD_YAW);
  return new THREE.Vector3(PAD[0] + lx * c + lz * s, PAD[1] + 0.002 + lift, PAD[2] - lx * s + lz * c);
};
const writeK = (t: number) => clamp01((t - TL.writeA) / (TL.writeB - TL.writeA));
const Notepad: React.FC<{ t: number }> = ({ t }) => {
  const tex = useMemo(() => { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 704; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; }, []);
  const c = (tex.image as HTMLCanvasElement).getContext("2d")!;
  c.fillStyle = "#f2e48f"; c.fillRect(0, 0, 512, 704);
  c.strokeStyle = "rgba(90,120,170,.45)"; c.lineWidth = 2; for (let y = 90; y < 704; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  c.strokeStyle = "rgba(190,60,60,.5)"; c.beginPath(); c.moveTo(60, 0); c.lineTo(60, 704); c.stroke();
  // vài dòng ghi chép cũ (tối nay)
  c.fillStyle = "rgba(30,40,80,.75)"; c.font = "italic 19px 'DejaVu Sans'"; c.fillText("2:40  noise compl. — Elm St.", 72, 130); c.fillText("2:58  log off", 72, 152);
  // nét mực theo tiến độ, run tay
  const k = writeK(t);
  const total = TOTAL_LEN + GAP * (STROKES.length - 1);
  let budget = k * total;
  c.strokeStyle = "#16203f"; c.lineWidth = 5.2; c.lineCap = "round"; c.lineJoin = "round";
  for (let s = 0; s < STROKES.length && budget > 0; s++) {
    const pts = STROKES[s]; c.beginPath();
    const P = (p: [number, number], i: number) => [p[0] * 512 + 0.5 * Math.sin(i * 7.3 + s), p[1] * 704 + 0.5 * Math.cos(i * 5.1 + s)];
    let [x, y] = P(pts[0], 0); c.moveTo(x, y);
    for (let i = 1; i < pts.length && budget > 0; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const f = Math.min(1, budget / L);
      const steps = 4;
      for (let j = 1; j <= Math.ceil(steps * f); j++) {
        const ff = Math.min(f, j / steps);
        const a = P(pts[i - 1], i * 10 + j), b = P(pts[i], i * 10 + j);
        [x, y] = [lerp(a[0], b[0], ff), lerp(a[1], b[1], ff)];
        c.lineTo(x, y);
      }
      budget -= L;
    }
    c.stroke(); budget -= GAP;
  }
  tex.needsUpdate = true;
  return (
    <group position={PAD} rotation={[0, PAD_YAW, 0]}>
      <mesh position={[0, -0.002, 0]}><boxGeometry args={[PAD_W + 0.004, 0.006, PAD_H + 0.004]} /><meshStandardMaterial color="#e7d986" roughness={0.9} /></mesh>
      <mesh position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[PAD_W, PAD_H]} /><meshStandardMaterial map={tex} roughness={0.85} /></mesh>
      <mesh position={[0, 0.002, -PAD_H / 2 + 0.008]}><boxGeometry args={[PAD_W + 0.006, 0.008, 0.018]} /><meshStandardMaterial color="#7a1f1f" roughness={0.7} /></mesh>
    </group>
  );
};
// toạ độ trang của nét chữ dùng cùng phép đổi với canvas: v_canvas = (v + 0.3) * 0.62
const tipWorld = (t: number) => {
  const p = penAt(writeK(t));
  const lift = p.down ? 0 : 0.012;
  return padToWorld(p.u, p.v, lift);
};
// tư thế bút theo thời gian — dùng chung cho thân bút và bàn tay: nằm trên bàn (đầu bút hướng trái, về phía sổ) → cầm lên → viết
const PEN_REST_DIR = new THREE.Vector3(0.94, 0, 0.342).normalize();
const penPoseAt = (t: number) => {
  const ry = deg(camAt(t).yaw);
  const right = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
  const fwd = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry));
  const Y = new THREE.Vector3(0, 1, 0);
  // tư thế viết: thân bút nghiêng về phía phải–sau–lên, tựa vào kẽ giữa ngón cái và ngón trỏ
  const D = right.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, 0.68, 0)).add(fwd.clone().multiplyScalar(0.15)).normalize(); // bút nghiêng ~40° so với mặt sổ, đuôi bút chếch lên-phải như ảnh mẫu
  const idle = new THREE.Vector3(0.27, DESK.y + 0.09, -0.36);
  const w = smooth(t, TL.writeA - 0.45, TL.writeA);
  const hold = idle.lerp(tipWorld(t), w);
  const s = smooth(t, TL.penB, TL.penB + 0.45);
  const tip = new THREE.Vector3(PEN_REST[0], DESK.y + 0.0055, PEN_REST[2]).lerp(hold, s);
  const q0 = new THREE.Quaternion().setFromUnitVectors(Y, PEN_REST_DIR), q1 = new THREE.Quaternion().setFromUnitVectors(Y, D);
  const dir = Y.clone().applyQuaternion(q0.slerp(q1, s));
  return { tip, dir, s, D };
};
const makePen = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.12, 16), new THREE.MeshPhysicalMaterial({ color: "#1d2a5a", roughness: 0.3, clearcoat: 0.8 })); body.position.y = 0.07; g.add(body);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.012, 16), new THREE.MeshStandardMaterial({ color: "#c9c9c9", metalness: 1, roughness: 0.3 })); cone.rotation.x = Math.PI; cone.position.y = 0.006; g.add(cone);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.04, 0.003), new THREE.MeshStandardMaterial({ color: "#c9c9c9", metalness: 1, roughness: 0.3 })); clip.position.set(0, 0.11, 0.005); g.add(clip);
  return g; // đầu bút ở gốc, thân dọc +y
};


// ---------------------------------------------------------------- bản đồ điều phối trên tường phải (UNIT 7 đứng im đúng MI 14)
const useMapTex = (t: number) => {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 576;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }, []);
  const c = (tex.image as HTMLCanvasElement).getContext("2d")!;
  c.fillStyle = "#0a1623"; c.fillRect(0, 0, 1024, 576);
  c.strokeStyle = "rgba(90,140,190,.16)"; c.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 576); c.stroke(); }
  for (let y = 0; y <= 576; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
  c.strokeStyle = "#1c4466"; c.lineWidth = 14; c.beginPath(); c.moveTo(0, 470); c.bezierCurveTo(250, 380, 420, 540, 1024, 430); c.stroke(); // sông
  c.strokeStyle = "#5d7690"; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 190); c.lineTo(1024, 150); c.stroke(); // quốc lộ
  c.lineWidth = 5; c.beginPath(); c.moveTo(210, 170); c.lineTo(420, 330); c.lineTo(620, 330); c.lineTo(960, 90); c.stroke(); // County Road 9
  c.beginPath(); c.moveTo(120, 560); c.lineTo(260, 330); c.lineTo(420, 330); c.stroke();
  c.fillStyle = "#8fb0cc"; c.font = "bold 30px 'DejaVu Sans'";
  c.fillText("STATE HWY 20", 40, 150); c.fillText("COUNTY RD 9", 640, 300);
  c.fillStyle = "#cfe3f5"; c.fillRect(196, 150, 28, 28); c.font = "bold 24px 'DejaVu Sans'"; c.fillText("ALDER FALLS PD", 150, 200);
  const mx = 620, my = 330; // MI 14
  c.fillStyle = "#cfe3f5"; c.font = "bold 40px 'DejaVu Sans'"; c.fillText("MI 14", mx + 26, my + 62);
  // C06: cuộc gọi vừa rớt ping vào County Road 9 (vòng đỏ nhấp nháy)
  if (t > TL.mari1[0] + 2.3) {
    const k = ((t - TL.mari1[0] - 2.3) * 1.2) % 1;
    c.strokeStyle = `rgba(255,70,50,${1 - k})`; c.lineWidth = 6; c.beginPath(); c.arc(mx, my, 14 + 90 * k, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "#ff4632"; c.beginPath(); c.arc(mx, my, 9, 0, Math.PI * 2); c.fill();
  }
  // C07: UNIT 7 (chấm xanh) đứng im đúng chỗ đó
  if (t > TL.unit7) {
    const a = Math.min(1, (t - TL.unit7) / 0.15);
    c.fillStyle = `rgba(70,160,255,${a})`; c.beginPath(); c.arc(mx, my, 17, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(190,225,255,${a})`; c.lineWidth = 4; c.beginPath(); c.arc(mx, my, 17, 0, Math.PI * 2); c.stroke();
    c.fillStyle = `rgba(110,185,255,${a})`; c.font = "bold 46px 'DejaVu Sans'"; c.fillText("UNIT 7", mx - 215, my - 26);
  }
  tex.needsUpdate = true;
  return tex;
};
const MapScreen: React.FC<{ t: number }> = ({ t }) => {
  const tex = useMapTex(t);
  return (
    <group position={[3.785, 1.8, MARI_Z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.012]}><boxGeometry args={[1.62, 0.93, 0.02]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh><planeGeometry args={[1.5, 0.84]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Mari (model nữ Mixamo Ch02 + clip Typing: ngồi gõ phím; tai nghe có mic dựng bằng code; miệng theo âm lượng file giọng)
const MARI_ENV_SPANS: [string, readonly [number, number]][] = [["C06", TL.mari1], ["C07", TL.mari2]];
const mariOpen = (t: number) => {
  for (const [k, [a, b]] of MARI_ENV_SPANS) if (t >= a - 0.05 && t <= b + 0.3) { const e = MARI_ENV[k]; const f = (t - a) * 30; const i = Math.floor(f); const v = (e[i] ?? 0) * (1 - (f - i)) + (e[i + 1] ?? 0) * (f - i); return Math.min(1, v * 1.25); }
  return 0;
};
const tubeBetween = (a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
};
const MARI_CLIP_T0 = 1.0, MARI_CLIP_AT = 10.9; // clip Typing chạy từ giây 1,0 tại thời điểm 10,9 s của cảnh
const Mari: React.FC<{ t: number; src: THREE.Group }> = ({ t, src }) => {
  const rig = useMemo(() => {
    const r = src; stripExtras(r);
    r.traverse((o) => {
      const m = o as THREE.SkinnedMesh; if (!m.isMesh) return;
      m.frustumCulled = false;
      const conv = (old: THREE.Material) => {
        const o2 = old as THREE.MeshPhongMaterial; const n = old.name.toLowerCase();
        const map = shrinkTex(o2.map);
        if (map) map.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshPhysicalMaterial({ map, normalMap: shrinkTex(o2.normalMap) ?? null, roughness: /body/.test(n) ? 0.55 : 0.85 });
        if (/hair|lash/.test(n)) { mat.alphaTest = 0.45; mat.side = THREE.DoubleSide; mat.roughness = 1; }
        return mat;
      };
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
    });
    r.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(r);
    r.scale.multiplyScalar(1.68 / bb.getSize(new THREE.Vector3()).y);
    r.updateMatrixWorld(true);
    const bones: Record<string, THREE.Bone> = {};
    r.traverse((o) => { if ((o as THREE.Bone).isBone) { const n = o.name.replace(/^mixamorig\d*:?/, ""); bones[n] ??= o as THREE.Bone; } });
    const mixer = new THREE.AnimationMixer(r);
    mixer.clipAction(src.animations[0]).play();
    const headBindQ = bones["Head"].getWorldQuaternion(new THREE.Quaternion());
    const g = new THREE.Group(); g.add(r);
    const gear = new THREE.Group();
    const blackM = new THREE.MeshStandardMaterial({ color: "#15161a", roughness: 0.5 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R * 1.15, 0.006, 8, 40, Math.PI), blackM); band.position.set(0, HEAD_Y - 0.005, 0.01); gear.add(band);
    for (const sx of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.022, 20), blackM); cup.rotation.z = Math.PI / 2; cup.position.set(sx * HEAD_R * 1.15, HEAD_Y - 0.01, 0.01); gear.add(cup); }
    gear.add(tubeBetween(new THREE.Vector3(HEAD_R * 1.18, HEAD_Y - 0.02, 0.02), new THREE.Vector3(0.035, MOUTH_Y - 0.01, MOUTH_Z + 0.025), 0.0032, blackM));
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), blackM); mic.position.set(0.035, MOUTH_Y - 0.01, MOUTH_Z + 0.025); gear.add(mic);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: "#3c1414", roughness: 0.9 })); mouth.position.set(0, MOUTH_Y, MOUTH_Z); gear.add(mouth);
    return { r, g, bones, mixer, headBindQ, gear, mouth };
  }, [src]);
  const { g, bones, mixer, headBindQ, gear, mouth } = rig;
  g.position.set(MARI_X, MARI_DY, MARI_Z); g.rotation.set(0, -Math.PI / 2, 0); // nhìn về -x, tức về phía TÔI
  const clipT = MARI_CLIP_T0 + ((Math.max(0, t - MARI_CLIP_AT)) % (src.animations[0].duration - MARI_CLIP_T0 - 0.1));
  mixer.setTime(clipT);
  g.updateMatrixWorld(true);
  const open = mariOpen(t);
  const hq = bones["Head"].getWorldQuaternion(new THREE.Quaternion());
  gear.position.copy(wpos(bones["Head"]));
  gear.quaternion.copy(hq.multiply(headBindQ.clone().invert()));
  mouth.scale.set(0.021, 0.004 + 0.024 * open, 0.007);
  return <><primitive object={g} /><primitive object={gear} /></>;
};
const HEAD_R = 0.09, HEAD_Y = 0.1, MOUTH_Y = 0.045, MOUTH_Z = 0.093; // kích thước đầu / vị trí miệng so với gốc xương đầu (m) — chỉnh bằng ảnh thử
const MARI_DY = 0.05; // nâng người để cổ tay chạm bàn phím

// ---------------------------------------------------------------- toàn cảnh
export const Mile14OfficeRaw: React.FC<{ at?: number; tv?: number; ls?: [number, number] }> = ({ at, tv, ls }) => {
  if (ls) LSIGN = ls;
  if (tv !== undefined) THUMB_SIGNS = THUMB_VARIANTS[tv];
  const remy = useRemy();
  const remy2 = useRemy("mile14/mari_typing.fbx");
  const frame = useCurrentFrame();
  const t = at ?? frame / OFFICE_FPS;
  const handsetRef = useMemo(() => ({ m: new THREE.Matrix4() }), []);
  const keysRef = useMemo(() => ({ m: new THREE.Matrix4(), held: false }), []);
  return (
    <AbsoluteFill style={{ background: "#030507" }}>
      {remy && remy2 && (
        <ThreeCanvas width={1920} height={1080} gl={{ antialias: true }} camera={{ fov: VFOV, near: 0.02, far: 80 }}>
          <CameraRig t={t} />
          <hemisphereLight args={["#3a4152", "#1a1510", 0.35]} />
          <Room t={t} />
          <PovBody t={t} src={remy} handsetRef={handsetRef} keysRef={keysRef} />
          <Keys kref={keysRef} />
          <Mari t={t} src={remy2} />
          <Phone t={t} handset={handsetRef.m} />
          <Notepad t={t} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%)" }} />
    </AbsoluteFill>
  );
};
