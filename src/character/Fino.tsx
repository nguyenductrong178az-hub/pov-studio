import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { G, makeOutline, makeToon, setLowPoly, type Kind } from "./materials";
import type { CharStyle } from "./styles";

type V3 = [number, number, number];
const Ctx = createContext<{ style: CharStyle; outlineMul: number } | null>(null);
const useS = () => useContext(Ctx)!;

const mixHex = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

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

const Part: React.FC<PartProps> = ({ geo, color, kind, position, rotation, scale, outline = 1, unlit, doubleSide, opacity }) => {
  const { style, outlineMul } = useS();
  const p = style.palette;
  const k: Kind =
    kind ?? (color === p.skin ? "skin" : color === p.hoodie || color === p.pants ? "cloth" : color === p.hair ? "hair" : "other");
  const mat = useMemo(
    () =>
      unlit
        ? new THREE.MeshBasicMaterial({ color, transparent: opacity !== undefined, opacity: opacity ?? 1, depthWrite: opacity === undefined })
        : makeToon(style, color, doubleSide, k),
    [style, color, unlit, doubleSide, opacity, k],
  );
  const w = style.outline.width * outline * outlineMul;
  const oMat = useMemo(() => (w > 0 ? makeOutline(style, color, w) : null), [style, color, w]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} material={mat} />
      {oMat && <mesh geometry={geo} material={oMat} />}
    </group>
  );
};

const surf = (r: number, yaw: number, pitch: number): V3 => [
  r * Math.cos(pitch) * Math.sin(yaw),
  r * Math.sin(pitch),
  r * Math.cos(pitch) * Math.cos(yaw),
];

// Deterministische Pseudo-Zufallszahlen (gleiches Bild bei jedem Render)
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const Hand: React.FC<{ r: number; curl: number; spread: number }> = ({ r, curl, spread }) => {
  const { style } = useS();
  const skin = style.palette.skin;
  const fr = r * 0.24;
  return (
    <group>
      <Part geo={G.sphere(r)} color={skin} scale={[1, 1.1, 0.6]} outline={0.6} />
      {[-1.5, -0.5, 0.5, 1.5].map((i) => (
        <group key={i} position={[i * r * 0.4, -r * 0.85, 0]} rotation={[curl, 0, i * spread]}>
          <Part geo={G.capsule(fr, r * (i === 1.5 ? 0.6 : 0.8))} color={skin} position={[0, -r * 0.45, 0]} outline={0.45} />
        </group>
      ))}
      <group position={[r * 0.85, -r * 0.1, r * 0.2]} rotation={[curl * 0.5, 0, 0.9]}>
        <Part geo={G.capsule(fr * 1.1, r * 0.55)} color={skin} position={[0, -r * 0.35, 0]} outline={0.45} />
      </group>
    </group>
  );
};

export const getRig = (s: CharStyle) => {
  const P = s.proportions;
  const legR = 0.1 * P.chunk;
  const legL = 0.42 * P.limb;
  const hipY = 0.1 + legL + legR * 1.6;
  const tR = 0.3 * P.body;
  const tL = 0.3 * P.body;
  const torsoY = hipY + tL / 2 + tR * 0.55;
  const neckY = torsoY + tL / 2 + tR * 0.9;
  const neckLen = 0.1 * P.neckLen;
  const headR = 0.42 * P.head;
  const headY = neckY + neckLen + headR * 1.0;
  return { legR, legL, hipY, tR, tL, torsoY, neckY, neckLen, headR, headY, top: headY + headR * 1.4 };
};

export const Fino: React.FC<{ style: CharStyle; outlineMul?: number; rotationY?: number; position?: V3 }> = ({
  style,
  outlineMul = 1,
  rotationY = 0,
  position = [0, 0, 0],
}) => {
  setLowPoly(!!style.texture.facet);
  const p = style.palette;
  const P = style.proportions;
  const o = style.outfit;
  const ov = o?.oversize ?? 1;
  const R = getRig(style);
  const { legR, legL, hipY, tR, tL, torsoY, neckY, neckLen, headR, headY } = R;
  const hs = headR / 0.42; // Kopf-Maßstab für Gesichtsdetails
  const armR = 0.075 * P.chunk;
  const armLimb = 1 + (P.limb - 1) * 0.5; // Arme wachsen langsamer mit als Beine
  const upL = 0.24 * armLimb;
  const foL = 0.22 * armLimb;
  const handR = 0.09 * Math.max(P.chunk, 0.8);
  const shoulderY = torsoY + tL / 2 + tR * 0.35;
  const shoulderX = tR * 1.02 * ov;
  const ew = 0.085 * P.eye * hs;
  const eh = ew * 1.12;
  const earColor = mixHex(p.skin, "#ff7a6e", P.earRed);
  const bagColor = mixHex(p.skin, "#5b3a5e", 0.32);
  const sh = P.shoe;

  const Arm = ({ side, s, el, hand }: { side: 1 | -1; s: V3; el: V3; hand: React.ReactNode }) => (
    <group position={[side * shoulderX, shoulderY, 0]} rotation={s}>
      <Part geo={G.capsule(armR * 1.25 * ov, upL)} color={p.hoodie} position={[0, -upL / 2, 0]} />
      <group position={[0, -upL - armR * 0.3, 0]} rotation={el}>
        {o?.wideSleeve ? (
          <>
            {/* weiter, kurzer Ärmel bis knapp unter den Ellbogen, darunter nackter Unterarm */}
            <Part geo={G.cyl(armR * 1.45 * ov, foL * 0.42)} color={p.hoodie} position={[0, -foL * 0.12, 0]} />
            <Part geo={G.capsule(armR * 0.7, foL)} color={p.skin} position={[0, -foL / 2, 0]} outline={0.6} />
          </>
        ) : (
          <>
            <Part geo={G.capsule(armR * 1.2, foL)} color={p.hoodie} position={[0, -foL / 2, 0]} />
            <Part geo={G.cyl(armR * 1.3, armR * 0.8)} color={p.hoodie} position={[0, -foL - armR * 0.2, 0]} outline={0.6} />
          </>
        )}
        {/* Handgelenk */}
        <Part geo={G.cyl(armR * 0.6, armR * 1.2)} color={p.skin} position={[0, -foL - armR * 0.9, 0]} outline={0} />
        <group position={[0, -foL - armR * 1.1 - handR * 0.7, 0]}>{hand}</group>
      </group>
    </group>
  );

  return (
    <Ctx.Provider value={{ style, outlineMul }}>
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* Beine & klobige Sneaker */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * Math.max(tR * 0.45, o ? legR * o.widePants * 1.08 : 0), 0, 0]}>
            {o ? (
              <>
                {/* weite, gerade, gekürzte Hose mit Umschlag + Socke */}
                <Part geo={G.cyl(legR * o.widePants, hipY - o.crop)} color={p.pants} position={[0, (hipY + o.crop) / 2, 0]} />
                <Part geo={G.cyl(legR * o.widePants * 1.07, 0.055)} color={p.pants} position={[0, o.crop + 0.027, 0]} />
                <Part geo={G.cyl(legR * 0.62, o.crop - 0.06)} color={o.sock} position={[0, (o.crop + 0.06) / 2, 0]} />
              </>
            ) : (
              <>
                <Part geo={G.capsule(legR, legL)} color={p.pants} position={[0, 0.12 + legL / 2 + legR, 0]} />
                {/* hochgekrempelter Saum */}
                <Part geo={G.cyl(legR * 1.25, 0.05)} color={mixHex(p.pants, "#ffffff", 0.12)} position={[0, 0.17 + legR * 0.5, 0]} kind="cloth" />
              </>
            )}
            <Part geo={G.sphere(1)} color={p.shoes} position={[0, 0.085 * sh, 0.06 * sh]} scale={[0.12 * sh, 0.085 * sh, 0.2 * sh]} />
            <Part geo={G.sphere(1)} color={p.sole} position={[0, 0.035 * sh, 0.06 * sh]} scale={[0.13 * sh, 0.04 * sh, 0.215 * sh]} />
          </group>
        ))}
        <Part geo={G.sphere(1)} color={p.pants} position={[0, hipY, 0]} scale={[tR * 0.95, 0.15, tR * 0.72]} />
        {/* Hoodie */}
        <Part geo={G.capsule(tR, tL)} color={p.hoodie} position={[0, torsoY, 0]} scale={[1.08 * ov, 1, 0.8 * ov]} />
        {o && (
          // heraushängender Shirt-Saum
          <Part geo={G.cyl(1, 1)} color={o.hemColor} position={[0, torsoY - tL / 2 - tR * 0.72, 0]} scale={[tR * 0.82 * ov, 0.035, tR * 0.62 * ov]} />
        )}
        <Part geo={G.sphere(1)} color={p.hoodie} position={[0, torsoY - tL * 0.35, tR * 0.72]} scale={[tR * 0.62, tL * 0.3, 0.05]} outline={0.6} />
        <Part geo={G.torus(tR * 0.6, 0.08 * Math.max(P.chunk, 0.8), Math.PI)} color={p.hoodie} position={[0, neckY - 0.03, -0.04]} rotation={[-Math.PI / 2 + 0.35, 0, 0]} />
        {[-1, 1].map((sd) => (
          <Part key={sd} geo={G.capsule(0.011, tL * 0.45)} color={p.shoes} position={[sd * tR * 0.22, neckY - tL * 0.45, tR * 0.78]} rotation={[0.15, 0, 0]} outline={0.4} />
        ))}
        {/* Kopfhörer um den Hals */}
        <group position={[0, neckY - 0.03, 0.02]}>
          <Part geo={G.torus(tR * 0.6, 0.024, Math.PI)} color={p.accent} rotation={[-Math.PI / 2 + 0.25, 0, 0]} />
          {[-1, 1].map((sd) => (
            <Part key={sd} geo={G.cyl(0.08, 0.055)} color={p.accent} position={[sd * tR * 0.62, -0.04, 0.08]} rotation={[0.3, 0, Math.PI / 2 - sd * 0.25]} />
          ))}
        </group>
        {/* dünner Hals */}
        <Part geo={G.cyl(0.07 * P.neckR, neckLen + 0.2)} color={p.skin} position={[0, neckY + neckLen / 2, 0]} outline={0} />

        {/* Rechter Arm: Handy */}
        <Arm
          side={-1}
          s={[-0.25, 0, -0.16]}
          el={[-1.35, 0.3, 0]}
          hand={
            <group>
              <Hand r={handR} curl={-1.1} spread={0.05} />
              <group position={[0, -handR * 0.6, handR * 0.55]} rotation={[1.0, 0, 0]}>
                <Part geo={G.box(0.1, 0.19, 0.016)} color="#1d1d24" outline={0} />
                <Part geo={G.box(0.088, 0.17, 0.002)} color="#9be7ff" position={[0, 0, 0.009]} unlit outline={0} />
              </group>
            </group>
          }
        />
        {/* Linker Arm: winkt */}
        <Arm side={1} s={[0, 0, 2.35]} el={[0, 0, 0.6]} hand={<Hand r={handR} curl={0.1} spread={0.12} />} />

        {/* KOPF */}
        <group position={[0, headY, 0]} scale={[1.0, 0.98, 0.96]}>
          <Part geo={G.sphere(headR)} color={p.skin} />
          {/* Kinn/Wangen-Volumen */}
          <Part geo={G.sphere(headR * 0.78)} color={p.skin} position={[0, -headR * 0.28, headR * 0.12]} outline={0} />
          {/* Ohren (abstehend, optional gerötet) */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * headR * 1.02, -headR * 0.16, -headR * 0.02]} rotation={[0, sd * 0.35, sd * -0.15]}>
              <Part geo={G.sphere(1)} color={earColor} kind="skin" scale={[0.035 * hs, 0.09 * P.ears * hs ** 0.5, 0.07 * P.ears * hs ** 0.5]} outline={0.7} />
            </group>
          ))}
          {/* Augen: bauchig, glasig, mit Lid */}
          {[-1, 1].map((sd) => {
            const yaw = sd * 0.34;
            const [x, y, z] = surf(headR * 0.9, yaw, 0.02);
            const ir = ew * P.iris;
            const fz = ew * 0.72;
            const lidRot = -1.3 + P.lid * 1.3;
            return (
              <group key={sd} position={[x, y, z]} rotation={[0, yaw * 0.7, 0]}>
                {P.bags > 0 && (
                  <Part geo={G.sphere(1)} color={bagColor} kind="skin" position={[0, -eh * 0.22, -ew * 0.15]} scale={[ew * 1.18, eh * 1.12, ew * 0.75]} outline={0} />
                )}
                <Part geo={G.sphere(1)} color="#f7f4ef" kind="eye" scale={[ew, eh, fz]} outline={0.5} />
                <Part geo={G.sphere(1)} color={p.iris} kind="eye" position={[-sd * ew * 0.06, -eh * 0.04, fz * 0.9]} scale={[ir, ir * 1.05, fz * 0.22]} outline={0} />
                <Part geo={G.sphere(1)} color="#0c0b10" kind="eye" position={[-sd * ew * 0.06, -eh * 0.04, fz * 0.98]} scale={[ir * 0.48, ir * 0.5, fz * 0.16]} outline={0} />
                <Part geo={G.sphere(1)} color="#ffffff" position={[-ew * 0.22, eh * 0.2, fz * 1.06]} scale={[ew * 0.1, ew * 0.1, 0.005]} unlit outline={0} />
                {/* Oberlid */}
                <Part geo={G.cap(1, Math.PI * 0.5)} color={p.skin} kind="skin" rotation={[lidRot, 0, sd * -0.12]} scale={[ew * 1.1, eh * 1.1, fz * 1.12]} doubleSide outline={0.5} />
              </group>
            );
          })}
          {/* Augenbrauen: dick, tief, leicht mürrisch */}
          {[-1, 1].map((sd) => {
            const [x, y, z] = surf(headR * 0.99, sd * 0.34, 0.27 + P.eye * 0.03);
            const ang = sd === 1 ? -0.1 : 0.22; // eine Braue etwas höher = Fino-Look
            return (
              <group key={sd} position={[x, y + (sd === 1 ? 0.012 : 0), z]} rotation={[0, sd * 0.34, Math.PI / 2 + sd * ang]}>
                <Part geo={G.capsule(0.016 * P.brow * hs, 0.08 * P.eye * hs)} color={p.hair} kind="hair" scale={[1, 1, 0.6]} outline={0.4} />
              </group>
            );
          })}
          {/* Nase */}
          <Part geo={G.sphere(0.033 * P.nose * hs)} color={mixHex(p.skin, "#ff7a6e", P.earRed * 0.35)} kind="skin" position={surf(headR * 0.97, 0, -0.13)} scale={[1, 1.1, 1.05]} outline={0.5} />
          {/* Mund: kleiner, leicht schiefer Strich */}
          {(() => {
            const [x, y, z] = surf(headR * 0.985, 0.04, -0.34);
            return (
              <group position={[x, y, z]} rotation={[0.34, 0.04, 0.1]}>
                <Part geo={G.capsule(0.011 * hs, 0.07 * P.mouth * hs)} color={p.mouth} kind="skin" rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.5]} outline={0} />
              </group>
            );
          })()}
          {/* Pflaster */}
          {(() => {
            const [x, y, z] = surf(headR * 0.985, -0.6, -0.16);
            return (
              <group position={[x, y, z]} rotation={[0.1, -0.6, 0.5]}>
                <Part geo={G.capsule(0.02 * hs, 0.065 * hs)} color={p.plaster} kind="other" rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.35]} outline={0.45} />
              </group>
            );
          })()}
          {style.blush > 0 &&
            [-1, 1].map((sd) => {
              const [x, y, z] = surf(headR * 1.0, sd * 0.6, -0.22);
              return (
                <group key={sd} position={[x, y, z]} rotation={[0.22, sd * 0.6, 0]}>
                  <Part geo={G.circle(0.05 * hs)} color="#ff6f7a" unlit opacity={style.blush * 0.5} outline={0} scale={[1, 0.6, 1]} />
                </group>
              );
            })}
          {/* HAARE */}
          <Part geo={G.cap(headR * 1.06, Math.PI * 0.6)} color={p.hair} rotation={[-0.62, 0, 0]} doubleSide />
          <Part geo={G.cap(headR * 1.05, Math.PI * 0.5)} color={p.hair} rotation={[-1.3, 0, 0]} doubleSide />
          {[-0.5, -0.25, 0.0, 0.22, 0.45].map((yaw, i) => {
            const [x, y, z] = surf(headR * 0.98, yaw, 0.52);
            return (
              <group key={i} position={[x, y, z]} rotation={[0, yaw, 0]}>
                <Part geo={G.cone(0.085 * hs, 0.26 * hs * (i % 2 ? 0.85 : 1))} color={p.hair} rotation={[Math.PI - 0.75, 0, (i - 2) * 0.12]} outline={0.5} />
              </group>
            );
          })}
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * headR * 0.92, headR * 0.25, -headR * 0.1]} rotation={[0, 0, sd * 2.6]}>
              <Part geo={G.cone(0.08 * hs, 0.22 * hs)} color={p.hair} outline={0.5} />
            </group>
          ))}
          {[-0.7, -0.25, 0.25, 0.7].map((yaw, i) => {
            const [x, y, z] = surf(headR * 0.95, Math.PI + yaw, 0.05 + (i % 2) * 0.2);
            return (
              <group key={i} position={[x, y, z]} rotation={[0, Math.PI + yaw, 0]}>
                <Part geo={G.cone(0.1 * hs, 0.25 * hs)} color={p.hair} rotation={[Math.PI - 0.6, 0, 0]} outline={0.5} />
              </group>
            );
          })}
          {/* Wuschel-Strähnen oben (Anzahl je Stil) */}
          {Array.from({ length: Math.round(8 * P.messy) }).map((_, i) => {
            const yaw = (rnd(i) - 0.5) * 3.6;
            const pitch = 0.75 + rnd(i + 10) * 0.6;
            const [x, y, z] = surf(headR * 1.0, yaw, pitch);
            return (
              <group key={i} position={[x, y, z]} rotation={[0, yaw, 0]}>
                <Part geo={G.cone(0.06 * hs, (0.16 + rnd(i + 20) * 0.12) * hs)} color={p.hair} rotation={[-0.3 - rnd(i + 30) * 0.9, 0, (rnd(i + 40) - 0.5) * 0.8]} outline={0.5} />
              </group>
            );
          })}
          {/* Markenzeichen-Strähne */}
          <group position={[0.05, headR * 1.0, -headR * 0.15]} rotation={[-0.7, 0, -0.25]}>
            <Part geo={G.cone(0.05 * hs, 0.3 * hs)} color={p.hair} position={[0, 0.12 * hs, 0]} outline={0.5} />
          </group>
        </group>
      </group>
    </Ctx.Provider>
  );
};
