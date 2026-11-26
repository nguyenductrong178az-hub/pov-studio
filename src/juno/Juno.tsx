import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { G, makeOutline, makeToon, setLowPoly, type Kind } from "../character/materials";
import { JUNO as C, type JunoStyle } from "./styles";

type V3 = [number, number, number];
const Ctx = createContext<{ style: JunoStyle; outlineMul: number } | null>(null);
const useS = () => useContext(Ctx)!;

type PartProps = {
  geo: THREE.BufferGeometry; color: string; kind?: Kind; position?: V3; rotation?: V3; scale?: V3 | number;
  outline?: number; unlit?: boolean; doubleSide?: boolean; opacity?: number;
};
const Part: React.FC<PartProps> = ({ geo, color, kind = "other", position, rotation, scale, outline = 1, unlit, doubleSide, opacity }) => {
  const { style, outlineMul } = useS();
  const mat = useMemo(
    () =>
      unlit
        ? new THREE.MeshBasicMaterial({ color, transparent: opacity !== undefined, opacity: opacity ?? 1, depthWrite: opacity === undefined, side: THREE.DoubleSide })
        : makeToon(style, color, doubleSide, kind),
    [style, color, unlit, doubleSide, opacity, kind],
  );
  const w = style.outline.width * outline * outlineMul;
  const oMat = useMemo(() => (w > 0 && !unlit ? makeOutline(style, color, w) : null), [style, color, w, unlit]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} material={mat} />
      {oMat && <mesh geometry={geo} material={oMat} />}
    </group>
  );
};

const along = (a: V3, b: V3) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const m = A.clone().add(B).multiplyScalar(0.5);
  return { position: [m.x, m.y, m.z] as V3, rotation: [e.x, e.y, e.z] as V3, length: dir.length() };
};
const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const surf = (r: number, yaw: number, pitch: number): V3 => [r * Math.cos(pitch) * Math.sin(yaw), r * Math.sin(pitch), r * Math.cos(pitch) * Math.cos(yaw)];

const Hand: React.FC<{ curl: number; spread?: number }> = ({ curl, spread = 0.07 }) => {
  const r = 0.05;
  return (
    <group>
      <Part geo={G.sphere(r)} color={C.skin} kind="skin" scale={[0.9, 1.1, 0.6]} outline={0.6} />
      {[-1.5, -0.5, 0.5, 1.5].map((i) => (
        <group key={i} position={[i * r * 0.36, -r * 0.9, 0]} rotation={[curl, 0, i * spread]}>
          <Part geo={G.capsule(0.012, i === 1.5 ? 0.04 : 0.052)} color={C.skin} kind="skin" position={[0, -0.03, 0]} outline={0.45} />
        </group>
      ))}
      <group position={[r * 0.75, -r * 0.15, r * 0.2]} rotation={[curl * 0.5, 0, 0.85]}>
        <Part geo={G.capsule(0.013, 0.036)} color={C.skin} kind="skin" position={[0, -0.022, 0]} outline={0.45} />
      </group>
    </group>
  );
};

export const JUNO_RIG = { headY: 2.1, headR: 0.26, top: 2.56 };

export const Juno: React.FC<{ style: JunoStyle; rotationY?: number; outlineMul?: number }> = ({ style, rotationY = 0, outlineMul = 1 }) => {
  setLowPoly(!!style.texture.facet);
  const { headY, headR: R } = JUNO_RIG;
  const hipY = 1.15;
  const shoulderY = 1.67, shoulderX = 0.27;
  const upL = 0.3, foL = 0.28, sleeveR = 0.085;
  const ew = 0.062, eh = 0.07, fz = 0.045;

  const Arm = ({ side, sh, el, hand }: { side: 1 | -1; sh: V3; el: V3; hand: React.ReactNode }) => (
    <group position={[side * shoulderX, shoulderY, 0]} rotation={sh}>
      <Part geo={G.capsule(sleeveR, upL)} color={C.sweater} kind="cloth" position={[0, -upL / 2, 0]} />
      <group position={[0, -upL, 0]} rotation={el}>
        <Part geo={G.cylT(sleeveR * 0.98, sleeveR * 1.05, foL)} color={C.sweater} kind="cloth" position={[0, -foL / 2, 0]} />
        <Part geo={G.cyl(sleeveR * 0.9, 0.06)} color={C.sweater} kind="cloth" position={[0, -foL - 0.02, 0]} outline={0.7} />
        <group position={[0, -foL - 0.085, 0]}>{hand}</group>
      </group>
    </group>
  );

  const st1 = along([-0.17, 1.76, 0.13], [0.32, 1.12, 0.17]);
  const st2 = along([-0.17, 1.76, 0.0], [0.32, 1.12, -0.17]);

  return (
    <Ctx.Provider value={{ style, outlineMul }}>
      <group rotation={[0, rotationY, 0]}>
        {/* ---------- Beine ---------- */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.12, 0, 0]}>
            {/* weite Cargohose mit Umschlag */}
            <Part geo={G.cylT(0.11, 0.12, hipY - 0.3)} color={C.pants} kind="cloth" position={[0, (hipY + 0.3) / 2, 0]} />
            <Part geo={G.cyl(0.126, 0.055)} color={C.pants} kind="cloth" position={[0, 0.32, 0]} />
            <Part geo={G.box(0.03, 0.16, 0.13)} color={C.pants} kind="cloth" position={[sd * 0.115, 0.72, 0.0]} outline={0.6} />
            <Part geo={G.box(0.034, 0.035, 0.132)} color={C.pants} kind="cloth" position={[sd * 0.117, 0.8, 0.0]} outline={0.6} />
            {/* senfgelbe Socken */}
            <Part geo={G.cylT(0.058, 0.062, 0.12)} color={C.socks} kind="cloth" position={[0, 0.25, 0]} outline={0.7} />
            {/* klobige High-Tops */}
            <Part geo={G.cyl(0.075, 0.12)} color={C.shoes} position={[0, 0.17, -0.01]} />
            <Part geo={G.sphere(1)} color={C.shoes} position={[0, 0.09, 0.045]} scale={[0.095, 0.08, 0.175]} />
            <Part geo={G.sphere(1)} color={C.sole} position={[0, 0.1, 0.17]} scale={[0.075, 0.05, 0.055]} />
            <Part geo={G.sphere(1)} color={C.sole} position={[0, 0.035, 0.045]} scale={[0.104, 0.04, 0.188]} />
            <Part geo={G.circle(0.022)} color={C.red} unlit position={[sd * 0.078, 0.17, -0.01]} rotation={[0, sd * Math.PI / 2, 0]} outline={0} />
          </group>
        ))}
        <Part geo={G.sphere(1)} color={C.pants} kind="cloth" position={[0, hipY, 0]} scale={[0.23, 0.12, 0.17]} />

        {/* ---------- Oversize-Strickpullover ---------- */}
        <Part geo={G.capsule(0.23, 0.26)} color={C.sweater} kind="cloth" position={[0, 1.45, 0]} scale={[1.15, 1, 0.85]} />
        <Part geo={G.cyl(0.245, 0.1)} color={C.sweater} kind="cloth" position={[0, 1.13, 0]} scale={[1.15, 1, 0.85]} outline={0.8} />
        <Part geo={G.torus(0.075, 0.025, Math.PI * 2)} color={C.sweater} kind="cloth" position={[0, 1.79, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} outline={0.7} />
        {/* Hals */}
        <Part geo={G.cyl(0.045, 0.2)} color={C.skin} kind="skin" position={[0, 1.83, 0]} outline={0.5} />

        {/* Kopfhörer um den Hals */}
        <group position={[0, 1.75, 0.0]}>
          <Part geo={G.torus(0.14, 0.018, Math.PI)} color={C.phonesDark} rotation={[-Math.PI / 2 + 0.3, 0, 0]} outline={0.6} />
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.cyl(0.062, 0.05)} color={C.phones} position={[sd * 0.145, -0.035, 0.07]} rotation={[0.3, 0, Math.PI / 2 - sd * 0.3]} outline={0.6} />
          ))}
        </group>

        {/* Umhängetasche */}
        <Part geo={G.box(0.04, st1.length, 0.012)} color={C.strap} position={st1.position} rotation={st1.rotation} outline={0.5} />
        <Part geo={G.box(0.04, st2.length, 0.012)} color={C.strap} position={st2.position} rotation={st2.rotation} outline={0.5} />
        <Part geo={G.sphere(1)} color={C.bag} position={[0.34, 1.06, 0.1]} scale={[0.12, 0.09, 0.055]} />
        <Part geo={G.sphere(1)} color={C.bag} position={[0.34, 1.11, 0.13]} scale={[0.115, 0.035, 0.04]} outline={0.6} />

        {/* ---------- Arme ---------- */}
        {/* rechts: Sofortbildkamera vor der Brust */}
        <Arm
          side={-1}
          sh={[-0.42, 0, -0.08]}
          el={[-1.55, 0.45, 0]}
          hand={
            <group>
              <Hand curl={-1.2} />
              <group position={[0.03, -0.03, 0.06]} rotation={[0.15, 0.4, 0]}>
                <Part geo={G.box(0.15, 0.12, 0.085)} color={C.camera} outline={0.6} />
                <Part geo={G.cyl(0.035, 0.03)} color={C.cameraDark} position={[0.01, -0.005, 0.055]} rotation={[Math.PI / 2, 0, 0]} outline={0.5} />
                <Part geo={G.cyl(0.022, 0.032)} color="#3c4a6b" position={[0.01, -0.005, 0.058]} rotation={[Math.PI / 2, 0, 0]} outline={0} />
                <Part geo={G.cyl(0.012, 0.02)} color={C.red} position={[0.055, 0.065, 0.02]} outline={0.4} />
                <Part geo={G.box(0.04, 0.025, 0.005)} color={C.cameraDark} position={[-0.045, 0.035, 0.044]} outline={0} />
              </group>
            </group>
          }
        />
        {/* links: Hand auf der Tasche */}
        <Arm side={1} sh={[0.06, 0, 0.14]} el={[-0.35, 0, -0.08]} hand={<Hand curl={-0.5} />} />

        {/* ---------- KOPF ---------- */}
        <group position={[0, headY, 0]}>
          <Part geo={G.sphere(R)} color={C.skin} kind="skin" scale={[1, 0.97, 0.97]} />
          <Part geo={G.sphere(R * 0.76)} color={C.skin} kind="skin" position={[0, -R * 0.3, R * 0.12]} outline={0} />
          {/* Augen: bauchig, mit halb gesenkten Lidern */}
          {[-1, 1].map((sd) => {
            const yaw = sd * 0.34;
            return (
              <group key={sd} position={surf(R * 0.9, yaw, 0.0)} rotation={[0, yaw * 0.75, 0]}>
                <Part geo={G.sphere(1)} color="#f8f5ef" kind="eye" scale={[ew, eh, fz]} outline={0.5} />
                <Part geo={G.sphere(1)} color={C.iris} kind="eye" position={[-sd * 0.006, -0.006, fz * 0.88]} scale={[ew * 0.58, ew * 0.62, fz * 0.22]} outline={0} />
                <Part geo={G.sphere(1)} color="#140f0c" kind="eye" position={[-sd * 0.006, -0.006, fz * 0.97]} scale={[ew * 0.28, ew * 0.3, fz * 0.16]} outline={0} />
                <Part geo={G.circle(1)} color="#ffffff" unlit position={[-ew * 0.25, eh * 0.18, fz * 1.06]} scale={[ew * 0.11, ew * 0.11, 1]} outline={0} />
                <Part geo={G.cap(1, Math.PI * 0.5)} color={C.skin} kind="skin" rotation={[-0.75, 0, sd * -0.1]} scale={[ew * 1.1, eh * 1.1, fz * 1.15]} doubleSide outline={0.5} />
              </group>
            );
          })}
          {/* runde Brille */}
          {[-1, 1].map((sd) => {
            const yaw = sd * 0.34;
            return (
              <group key={sd} position={surf(R * 1.04, yaw, 0.0)} rotation={[0, yaw * 0.8, 0]}>
                <Part geo={G.torus(0.078, 0.007, Math.PI * 2)} color={C.glasses} outline={0} />
                <Part geo={G.circle(0.076)} color="#ffffff" unlit opacity={0.08} outline={0} />
              </group>
            );
          })}
          <Part geo={G.torus(0.035, 0.006, Math.PI)} color={C.glasses} position={[0, 0.005, R * 1.02]} outline={0} />
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.capsule(0.006, 0.22)} color={C.glasses} position={[sd * R * 0.98, 0.01, R * 0.25]} rotation={[Math.PI / 2, 0, 0]} outline={0} />
          ))}
          {/* Brauen: weich, eine neugierig gehoben */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={[...surf(R * 1.0, sd * 0.34, 0.33)].map((v, i) => (i === 1 ? v + (sd === 1 ? 0.012 : 0) : v)) as V3} rotation={[0, sd * 0.34, Math.PI / 2 + sd * (sd === 1 ? -0.18 : 0.08)]}>
              <Part geo={G.capsule(0.011, 0.05)} color={C.hair} kind="hair" scale={[1, 1, 0.5]} outline={0.4} />
            </group>
          ))}
          {/* Knopfnase */}
          <Part geo={G.sphere(0.034)} color="#eab093" kind="skin" position={surf(R * 0.97, 0, -0.14)} scale={[1.05, 0.9, 1]} outline={0.5} />
          {/* Mund: kleines, schiefes Lächeln */}
          <group position={surf(R * 0.985, 0.04, -0.36)} rotation={[0.36, 0.04, 0.1]}>
            <Part geo={G.torus(0.028, 0.0055, Math.PI * 0.7)} color={C.mouth} unlit rotation={[0, 0, Math.PI + Math.PI * 0.15]} outline={0} />
          </group>
          {/* Sommersprossen */}
          {Array.from({ length: 14 }).map((_, i) => {
            const side = i % 2 ? 1 : -1;
            const yaw = side * (0.1 + rnd(i) * 0.5);
            const pitch = -0.27 - rnd(i + 20) * 0.12;
            return <Part key={i} geo={G.circle(0.0055 + rnd(i + 40) * 0.003)} color={C.freckle} unlit position={surf(R * 1.003, yaw, pitch)} rotation={[-pitch, yaw, 0]} opacity={0.85} outline={0} />;
          })}
          {/* Wangenröte */}
          {style.blush > 0 &&
            [-1, 1].map((sd) => (
              <Part key={sd} geo={G.circle(0.05)} color={C.cheek} unlit position={surf(R * 1.002, sd * 0.56, -0.2)} rotation={[0.2, sd * 0.56, 0]} scale={[1, 0.65, 1]} opacity={style.blush * 0.6} outline={0} />
            ))}

          {/* ---------- Haare: dunkler, zerzauster Bob ---------- */}
          <Part geo={G.cap(R * 1.07, Math.PI * 0.7)} color={C.hair} kind="hair" rotation={[-0.9, 0, 0]} doubleSide outline={0.8} />
          {/* Spitzen, die nach außen flippen */}
          {Array.from({ length: 13 }).map((_, i) => {
            const yaw = (i / 12 - 0.5) * 2 * 2.5 + (rnd(i + 60) - 0.5) * 0.15;
            if (Math.abs(yaw) < 0.95) return null;
            const yy = yaw;
            return (
              <group key={i} position={surf(R * 1.02, Math.PI + (yy > 0 ? Math.PI - yy : -Math.PI - yy), -0.42 - rnd(i + 70) * 0.12)} rotation={[0, yy, 0]}>
                <Part geo={G.cone(0.055, 0.15 + rnd(i + 80) * 0.06)} color={C.hair} kind="hair" rotation={[Math.PI - 0.38 - rnd(i + 90) * 0.2, 0, (rnd(i + 95) - 0.5) * 0.4]} scale={[1, 1, 0.45]} outline={0.6} />
              </group>
            );
          })}
          {/* Pony unter der Mütze */}
          {[-0.42, -0.2, 0.02, 0.24, 0.44].map((yaw, i) => (
            <group key={i} position={surf(R * 1.0, yaw, 0.4)} rotation={[0, yaw, 0]}>
              <Part geo={G.cone(0.045, 0.12 + rnd(i + 3) * 0.05)} color={C.hair} kind="hair" rotation={[Math.PI - 0.5, 0, -0.2 + (rnd(i + 9) - 0.5) * 0.4]} scale={[1, 1, 0.45]} outline={0.6} />
            </group>
          ))}

          {/* ---------- Strickmütze ---------- */}
          <group position={[0, R * 0.12, -R * 0.03]} rotation={[-0.28, 0, 0]}>
            <Part geo={G.cap(R * 1.13, Math.PI * 0.5)} color={C.beanie} kind="cloth" doubleSide />
            <Part geo={G.sphere(1)} color={C.beanie} kind="cloth" position={[0, R * 0.72, -R * 0.38]} scale={[R * 0.78, R * 0.42, R * 0.62]} />
            <Part geo={G.cyl(R * 1.16, R * 0.32)} color={C.beanie} kind="cloth" position={[0, R * 0.1, 0]} outline={0.8} />
            {/* Anstecker */}
            <group position={[Math.sin(0.55) * R * 1.17, R * 0.12, Math.cos(0.55) * R * 1.17]} rotation={[0, 0.55, 0]}>
              <Part geo={G.cyl(0.03, 0.01)} color={C.pin} rotation={[Math.PI / 2, 0, 0]} outline={0.4} />
              <Part geo={G.circle(0.012)} color="#f6e7cf" unlit position={[0, 0, 0.006]} outline={0} />
            </group>
          </group>
        </group>
      </group>
    </Ctx.Provider>
  );
};
