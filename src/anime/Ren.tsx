import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { G, makeOutline, makeToon, setLowPoly, type Kind } from "../character/materials";
import { REN, type AnimeStyle } from "./styles";

type V3 = [number, number, number];
const Ctx = createContext<{ style: AnimeStyle; outlineMul: number } | null>(null);
const useS = () => useContext(Ctx)!;

type PartProps = {
  geo: THREE.BufferGeometry;
  color: string;
  kind?: Kind;
  position?: V3;
  rotation?: V3;
  scale?: V3 | number;
  outline?: number;
  unlit?: boolean;
  doubleSide?: boolean;
  opacity?: number;
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

// Zylinder/Kapsel zwischen zwei Punkten
const along = (a: V3, b: V3) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const m = A.clone().add(B).multiplyScalar(0.5);
  return { position: [m.x, m.y, m.z] as V3, rotation: [e.x, e.y, e.z] as V3, length: dir.length() };
};

const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Anime-Kopfprofil (Radius, Höhe) → spitzes Kinn
const HEAD_PROFILE: [number, number][] = [
  [0.0, -0.25], [0.035, -0.244], [0.075, -0.225], [0.115, -0.19], [0.148, -0.14], [0.172, -0.08],
  [0.186, -0.02], [0.192, 0.04], [0.186, 0.1], [0.165, 0.16], [0.125, 0.205], [0.07, 0.23], [0.0, 0.238],
];
const faceR = (y: number) => {
  for (let i = 0; i < HEAD_PROFILE.length - 1; i++) {
    const [r0, y0] = HEAD_PROFILE[i], [r1, y1] = HEAD_PROFILE[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return 0.15;
};
const ZS = 0.92; // Kopf vorne-hinten gestaucht
const onFace = (yaw: number, y: number, lift = 0.002): V3 => {
  const r = faceR(y) + lift;
  return [r * Math.sin(yaw), y, r * Math.cos(yaw) * ZS];
};

const Hand: React.FC<{ curl: number; spread?: number }> = ({ curl, spread = 0.06 }) => {
  const r = 0.055;
  return (
    <group>
      <Part geo={G.sphere(r)} color={REN.skin} kind="skin" scale={[0.85, 1.15, 0.55]} outline={0.6} />
      {[-1.5, -0.5, 0.5, 1.5].map((i) => (
        <group key={i} position={[i * r * 0.34, -r * 0.95, 0]} rotation={[curl, 0, i * spread]}>
          <Part geo={G.capsule(0.0125, i === 1.5 ? 0.045 : 0.06)} color={REN.skin} kind="skin" position={[0, -0.035, 0]} outline={0.45} />
        </group>
      ))}
      <group position={[r * 0.7, -r * 0.2, r * 0.2]} rotation={[curl * 0.5, 0, 0.85]}>
        <Part geo={G.capsule(0.014, 0.04)} color={REN.skin} kind="skin" position={[0, -0.025, 0]} outline={0.45} />
      </group>
    </group>
  );
};

// Kenngrößen (für Kamera/Framing)
export const REN_RIG = { headY: 2.86, headS: 0.9, top: 3.14 };

export const Ren: React.FC<{ style: AnimeStyle; rotationY?: number; outlineMul?: number }> = ({ style, rotationY = 0, outlineMul = 1 }) => {
  setLowPoly(!!style.texture.facet);
  const { headY, headS } = REN_RIG;
  const hipY = 1.6;
  const legX = 0.135;
  const shoulderY = 2.36;
  const shoulderX = 0.3;
  const upL = 0.48, foL = 0.42, sleeveR = 0.098;

  const Arm = ({ side, sh, el, hand, bracelet }: { side: 1 | -1; sh: V3; el: V3; hand: React.ReactNode; bracelet?: boolean }) => (
    <group position={[side * shoulderX, shoulderY, 0]} rotation={sh}>
      <Part geo={G.capsule(sleeveR * 1.12, upL)} color={REN.hoodie} kind="cloth" position={[0, -upL / 2, 0]} />
      {/* Signatur: zwei weiße Streifen am Oberarm */}
      {[0.32, 0.4].map((t) => (
        <Part key={t} geo={G.cyl(sleeveR * 1.14, 0.016)} color={REN.stripe} kind="cloth" position={[0, -upL * t, 0]} outline={0.5} />
      ))}
      <group position={[0, -upL, 0]} rotation={el}>
        <Part geo={G.cylT(sleeveR * 1.05, sleeveR * 1.12, foL)} color={REN.hoodie} kind="cloth" position={[0, -foL / 2, 0]} />
        <Part geo={G.cyl(sleeveR * 0.92, 0.06)} color={REN.hoodie} kind="cloth" position={[0, -foL - 0.02, 0]} outline={0.6} />
        <Part geo={G.cyl(0.034, 0.07)} color={REN.skin} kind="skin" position={[0, -foL - 0.06, 0]} outline={0} />
        {bracelet && <Part geo={G.torus(0.037, 0.007, Math.PI * 2)} color={REN.red} position={[0, -foL - 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} outline={0.4} />}
        <group position={[0, -foL - 0.13, 0]}>{hand}</group>
      </group>
    </group>
  );

  const strapA: V3 = [-0.2, 2.42, 0.13];
  const strapB: V3 = [0.34, 1.48, 0.17];
  const s1 = along(strapA, strapB);
  const s2 = along([-0.2, 2.42, 0.0], [0.33, 1.52, -0.2]);

  return (
    <Ctx.Provider value={{ style, outlineMul }}>
      <group rotation={[0, rotationY, 0]}>
        {/* ---------- Beine: weite Cargohose ---------- */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * legX, 0, 0]}>
            <Part geo={G.cylT(0.13, 0.118, hipY - 0.13)} color={REN.pants} kind="cloth" position={[0, (hipY + 0.13) / 2, 0]} />
            {/* gestauchter Saum über dem Schuh */}
            <Part geo={G.cylT(0.122, 0.128, 0.07)} color={REN.pants} kind="cloth" position={[0, 0.15, 0]} />
            {/* Cargotasche außen */}
            <Part geo={G.box(0.03, 0.2, 0.15)} color={REN.pants} kind="cloth" position={[sd * 0.125, 0.85, 0.01]} outline={0.6} />
            <Part geo={G.box(0.034, 0.04, 0.152)} color={REN.pants} kind="cloth" position={[sd * 0.127, 0.95, 0.01]} outline={0.6} />
            {/* weiße Sneaker, klobig, rote Fersenlasche */}
            <Part geo={G.sphere(1)} color={REN.shoes} position={[0, 0.085, 0.06]} scale={[0.1, 0.075, 0.19]} />
            <Part geo={G.sphere(1)} color={REN.sole} position={[0, 0.035, 0.06]} scale={[0.112, 0.04, 0.205]} />
            <Part geo={G.box(0.03, 0.06, 0.02)} color={REN.red} position={[0, 0.12, -0.115]} outline={0.5} />
          </group>
        ))}
        <Part geo={G.sphere(1)} color={REN.pants} kind="cloth" position={[0, hipY, 0]} scale={[0.27, 0.16, 0.19]} />

        {/* ---------- Oversize-Hoodie ---------- */}
        <Part geo={G.capsule(0.26, 0.55)} color={REN.hoodie} kind="cloth" position={[0, 2.0, 0]} scale={[1.2, 1, 0.78]} />
        <Part geo={G.cyl(0.255, 0.2)} color={REN.hoodie} kind="cloth" position={[0, 1.6, 0]} scale={[1.2, 1, 0.78]} />
        <Part geo={G.cyl(0.262, 0.07)} color={REN.hoodie} kind="cloth" position={[0, 1.5, 0]} scale={[1.2, 1, 0.78]} outline={0.7} />
        {/* Bauchtasche */}
        <Part geo={G.sphere(1)} color={REN.hoodie} kind="cloth" position={[0, 1.72, 0.19]} scale={[0.2, 0.1, 0.025]} outline={0.6} />
        {/* Kapuze */}
        <Part geo={G.torus(0.16, 0.07, Math.PI)} color={REN.hoodie} kind="cloth" position={[0, 2.5, -0.03]} rotation={[-Math.PI / 2 + 0.35, 0, 0]} />
        <Part geo={G.sphere(1)} color={REN.hoodie} kind="cloth" position={[0, 2.46, -0.15]} scale={[0.2, 0.11, 0.1]} />
        {/* Kordeln */}
        {[-1, 1].map((sd) => (
          <Part key={sd} geo={G.capsule(0.008, 0.2)} color={REN.stripe} position={[sd * 0.06, 2.3, 0.205]} rotation={[0.08, 0, 0]} outline={0.4} />
        ))}
        {/* Hals */}
        <Part geo={G.cyl(0.05, 0.34)} color={REN.skin} kind="skin" position={[0, 2.58, 0]} outline={0.5} />

        {/* ---------- Umhängetasche (rechte Schulter → linke Hüfte) ---------- */}
        <Part geo={G.box(0.05, s1.length, 0.012)} color={REN.strap} position={s1.position} rotation={s1.rotation} outline={0.5} />
        <Part geo={G.box(0.05, s2.length, 0.012)} color={REN.strap} position={s2.position} rotation={s2.rotation} outline={0.5} />
        <Part geo={G.sphere(1)} color={REN.strap} position={[0.37, 1.4, 0.1]} scale={[0.13, 0.095, 0.06]} />
        <Part geo={G.box(0.05, 0.018, 0.004)} color={REN.stripe} position={[0.34, 1.44, 0.162]} outline={0} />

        {/* ---------- Arme ---------- */}
        {/* rechter Arm: Handy */}
        <Arm
          side={-1}
          sh={[-0.12, 0, -0.14]}
          el={[-1.25, 0.25, 0]}
          bracelet
          hand={
            <group>
              <Hand curl={-1.15} />
              <group position={[0, -0.04, 0.035]} rotation={[1.0, 0, 0]}>
                <Part geo={G.box(0.065, 0.13, 0.01)} color="#1b1b22" outline={0.4} />
                <Part geo={G.box(0.056, 0.115, 0.002)} color="#a9d4ff" position={[0, 0, 0.006]} unlit outline={0} />
              </group>
            </group>
          }
        />
        {/* linker Arm: Hand liegt auf der Tasche */}
        <Arm side={1} sh={[0.08, 0, 0.13]} el={[-0.35, 0, -0.1]} hand={<Hand curl={-0.5} />} />

        {/* ---------- KOPF ---------- */}
        <group position={[0, headY, 0]} scale={headS}>
          <group scale={[1, 1, ZS]}>
            <Part geo={G.lathe("renhead", HEAD_PROFILE)} color={REN.skin} kind="skin" />
          </group>
          <Part geo={G.sphere(0.185)} color={REN.skin} kind="skin" position={[0, 0.035, -0.04]} outline={0.8} />
          {/* Ohren + Ohrstecker links */}
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.sphere(1)} color={REN.skin} kind="skin" position={[sd * 0.183, -0.03, -0.02]} scale={[0.022, 0.05, 0.034]} outline={0.6} />
          ))}
          <Part geo={G.sphere(0.008)} color={REN.silver} position={[0.2, -0.068, 0.0]} outline={0} />

          {/* Augen (Anime): Weiß, große Iris, Wimpernlinie, Glanzpunkte */}
          {[-1, 1].map((sd) => {
            const yaw = sd * 0.37;
            const y = -0.012;
            return (
              <group key={sd} position={onFace(yaw, y, 0.001)} rotation={[0, yaw * 0.85, 0]}>
                <Part geo={G.sphere(1)} color="#fbfbfd" kind="eye" scale={[0.043, 0.03, 0.006]} outline={0} />
                <Part geo={G.sphere(1)} color={REN.iris} kind="eye" position={[-sd * 0.004, -0.002, 0.004]} scale={[0.024, 0.031, 0.004]} outline={0} />
                <Part geo={G.circle(1)} color={REN.irisLight} unlit position={[-sd * 0.004, -0.016, 0.0085]} scale={[0.017, 0.009, 1]} opacity={0.85} outline={0} />
                <Part geo={G.circle(1)} color="#121828" unlit position={[-sd * 0.004, 0.0, 0.0088]} scale={[0.011, 0.016, 1]} outline={0} />
                <Part geo={G.circle(1)} color="#ffffff" unlit position={[-sd * 0.004 - 0.009, 0.012, 0.0095]} scale={[0.0075, 0.0075, 1]} outline={0} />
                <Part geo={G.circle(1)} color="#ffffff" unlit position={[-sd * 0.004 + 0.008, -0.012, 0.0095]} scale={[0.0035, 0.0035, 1]} outline={0} />
                {/* obere Wimpernlinie + Schwung außen */}
                <Part geo={G.torus(0.044, 0.0065, Math.PI * 0.78)} color={REN.lash} unlit position={[0, -0.014, 0.008]} rotation={[0, 0, Math.PI * 0.11]} scale={[1, 0.72, 0.4]} outline={0} />
                <group position={[sd * 0.042, 0.004, 0.008]} rotation={[0, 0, -sd * 1.25]}>
                  <Part geo={G.cone(0.007, 0.024)} color={REN.lash} unlit scale={[1, 1, 0.4]} outline={0} />
                </group>
                {/* untere Wimper (kurz, außen) */}
                <Part geo={G.capsule(0.0022, 0.022)} color={REN.lash} unlit position={[sd * 0.02, -0.028, 0.007]} rotation={[0, 0, Math.PI / 2 + sd * 0.15]} opacity={0.75} outline={0} />
              </group>
            );
          })}
          {/* Augenbrauen: gerade, leicht ernst */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={onFace(sd * 0.4, 0.062, 0.003)} rotation={[0, sd * 0.36, Math.PI / 2 + sd * 0.12]}>
              <Part geo={G.capsule(0.0055, 0.05)} color={REN.hair} unlit scale={[1, 1, 0.4]} outline={0} />
            </group>
          ))}
          {/* Nase: nur angedeutet */}
          <Part geo={G.sphere(1)} color={REN.skin} kind="skin" position={onFace(0, -0.075, 0.0)} scale={[0.008, 0.016, 0.012]} outline={0} />
          <Part geo={G.circle(1)} color="#d9a896" unlit position={onFace(0.025, -0.092, 0.004)} rotation={[0, 0.12, 0]} scale={[0.008, 0.004, 1]} outline={0} />
          {/* Mund: kleiner Strich */}
          <group position={onFace(0.012, -0.145, 0.003)} rotation={[0.35, 0.05, 0]}>
            <Part geo={G.capsule(0.0035, 0.026)} color={REN.mouth} unlit rotation={[0, 0, Math.PI / 2 + 0.06]} scale={[1, 1, 0.4]} outline={0} />
          </group>
          {/* Leberfleck unter dem linken Auge */}
          <Part geo={G.circle(0.0045)} color="#3b2a2a" unlit position={onFace(0.47, -0.058, 0.003)} rotation={[0, 0.47, 0]} outline={0} />

          {/* ---------- HAARE: kurz, zerzaust, schwarz ---------- */}
          <Part geo={G.cap(0.228, Math.PI * 0.62)} color={REN.hair} kind="hair" position={[0, 0.025, -0.012]} rotation={[-0.38, 0, 0]} doubleSide outline={0.8} />
          <Part geo={G.cap(0.232, Math.PI * 0.42)} color={REN.hair} kind="hair" position={[0, 0.02, -0.01]} doubleSide outline={0.8} />
          <Part geo={G.cap(0.215, Math.PI * 0.5)} color={REN.hair} kind="hair" position={[0, 0.02, -0.03]} rotation={[-1.35, 0, 0]} doubleSide outline={0.8} />
          {/* Pony: Strähnen nach rechts gekämmt, unterschiedlich lang */}
          {[-0.55, -0.36, -0.18, 0.0, 0.17, 0.34, 0.52].map((yaw, i) => {
            const len = 0.13 + rnd(i) * 0.07;
            const r = 0.2;
            return (
              <group key={i} position={[r * Math.sin(yaw) * 1.02, 0.07 - Math.abs(yaw) * 0.03, r * Math.cos(yaw) * ZS * 1.04]} rotation={[0, yaw, 0]}>
                <Part geo={G.cone(0.04, len)} color={REN.hair} kind="hair" rotation={[Math.PI - 0.42, 0, -0.32 + (rnd(i + 5) - 0.5) * 0.35]} scale={[1, 1, 0.45]} outline={0.6} />
              </group>
            );
          })}
          {/* Seiten über den Ohren */}
          {[-1, 1].map((sd) =>
            [0, 1].map((j) => (
              <group key={`${sd}${j}`} position={[sd * 0.19, 0.06 - j * 0.03, 0.03 - j * 0.07]} rotation={[0, sd * 1.4, 0]}>
                <Part geo={G.cone(0.045, 0.15)} color={REN.hair} kind="hair" rotation={[Math.PI - 0.25, 0, sd * 0.15]} scale={[1, 1, 0.45]} outline={0.6} />
              </group>
            )),
          )}
          {/* Oberkopf: zerzauste Büschel */}
          {Array.from({ length: 12 }).map((_, i) => {
            const yaw = (rnd(i + 30) - 0.5) * 5.2;
            const pitch = 0.75 + rnd(i + 40) * 0.6;
            const r = 0.21;
            return (
              <group key={i} position={[r * Math.cos(pitch) * Math.sin(yaw), 0.03 + r * Math.sin(pitch), r * Math.cos(pitch) * Math.cos(yaw) * ZS - 0.02]} rotation={[0, yaw, 0]}>
                <Part geo={G.cone(0.045, 0.11 + rnd(i + 50) * 0.07)} color={REN.hair} kind="hair" rotation={[-0.5 - rnd(i + 60) * 0.8, 0, (rnd(i + 70) - 0.5) * 0.9]} scale={[1, 1, 0.45]} outline={0.6} />
              </group>
            );
          })}
          {/* Kranz: abstehende Büschel für die zerzauste Silhouette */}
          {Array.from({ length: 11 }).map((_, i) => {
            const yaw = 0.75 + (i / 10) * (2 * Math.PI - 1.5) + (rnd(i + 80) - 0.5) * 0.2;
            const pitch = 0.35 + rnd(i + 90) * 0.35;
            const r = 0.205;
            return (
              <group key={i} position={[r * Math.cos(pitch) * Math.sin(yaw), 0.03 + r * Math.sin(pitch), r * Math.cos(pitch) * Math.cos(yaw) * ZS - 0.015]} rotation={[0, yaw, 0]}>
                <Part geo={G.cone(0.05, 0.13 + rnd(i + 100) * 0.06)} color={REN.hair} kind="hair" rotation={[1.2 + rnd(i + 110) * 0.5, 0, (rnd(i + 120) - 0.5) * 0.6]} scale={[1, 1, 0.45]} outline={0.6} />
              </group>
            );
          })}
          {/* Nacken */}
          {[-0.6, -0.2, 0.2, 0.6].map((yaw, i) => (
            <group key={i} position={[0.19 * Math.sin(Math.PI + yaw), -0.06 + (i % 2) * 0.03, 0.19 * Math.cos(Math.PI + yaw) - 0.03]} rotation={[0, Math.PI + yaw, 0]}>
              <Part geo={G.cone(0.05, 0.14)} color={REN.hair} kind="hair" rotation={[Math.PI - 0.35, 0, 0]} scale={[1, 1, 0.5]} outline={0.6} />
            </group>
          ))}
        </group>
      </group>
    </Ctx.Provider>
  );
};
