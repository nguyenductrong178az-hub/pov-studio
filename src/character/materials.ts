import * as THREE from "three";
import type { CharStyle } from "./styles";


const vert = /* glsl */ `
varying vec3 vN; varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position,1.0);
  vW = w.xyz;
  vN = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform vec3 uColor, uShadow, uLight, uSpecColor, uRimColor;
uniform float uSteps, uSoft, uSpec, uSpecPow, uSpecHard, uRim, uHalftone, uDotSize, uGrain, uBump, uBumpScale, uFabric, uFacet;
uniform vec3 uRimACol, uRimADir, uRimBCol, uRimBDir; uniform float uRimA, uRimB;
varying vec3 vN; varying vec3 vW;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
vec3 vnoise3(vec3 p){ return vec3(vnoise(p), vnoise(p+vec3(5.2,1.3,7.1)), vnoise(p+vec3(9.7,3.1,2.2))) - 0.5; }
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  if (uFacet > 0.5) { vec3 F = normalize(cross(dFdx(vW), dFdy(vW))); N = dot(F, N) < 0.0 ? -F : F; }
  if (uBump > 0.0) {
    vec3 q = vW * uBumpScale;
    N = normalize(N + (vnoise3(q) + 0.5 * vnoise3(q * 2.7)) * uBump);
  }
  vec3 L = normalize(uLight);
  vec3 V = normalize(cameraPosition - vW);
  float h = dot(N,L)*0.5 + 0.5;
  float t;
  if (uSteps < 0.5) {
    t = smoothstep(0.05, 1.0, h);
  } else {
    t = 0.0;
    for (int i = 1; i < 4; i++) {
      if (float(i) >= uSteps) break;
      float thr = float(i) / uSteps + 0.04;
      t += smoothstep(thr - uSoft, thr + uSoft, h);
    }
    t /= max(uSteps - 1.0, 1.0);
  }
  vec3 col = mix(uColor * uShadow, uColor, t);
  vec3 H = normalize(L + V);
  float s = pow(max(dot(N,H),0.0), uSpecPow);
  s = mix(s, smoothstep(0.5, 0.56, s), uSpecHard);
  col += uSpecColor * s * uSpec;
  col += uRimColor * pow(1.0 - max(dot(N,V),0.0), 3.0) * uRim;
  float fr = 1.0 - max(dot(N,V), 0.0);
  col = mix(col, uRimACol, uRimA * smoothstep(0.3, 0.33, max(dot(N, normalize(uRimADir)), 0.0) * fr));
  col = mix(col, uRimBCol, uRimB * smoothstep(0.3, 0.33, max(dot(N, normalize(uRimBDir)), 0.0) * fr));
  if (uHalftone > 0.0) {
    float dark = 1.0 - clamp(h * 1.3 - 0.15, 0.0, 1.0);
    vec2 p = mat2(0.7071,-0.7071,0.7071,0.7071) * (gl_FragCoord.xy / uDotSize);
    float rad = sqrt(dark) * 0.62;
    float m = 1.0 - smoothstep(rad - 0.08, rad + 0.08, length(fract(p) - 0.5));
    col = mix(col, uColor * uShadow * 0.5, m * uHalftone * step(0.03, dark));
  }
  if (uGrain > 0.0) col *= 1.0 + (vnoise(vW * 160.0) - 0.5) * uGrain * 2.0;
  if (uFabric > 0.0) {
    float f = 0.5 + 0.5 * sin(vW.y * 520.0 + 3.0 * sin((vW.x + vW.z) * 260.0));
    col *= 1.0 - uFabric * 0.13 * f;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export type Kind = "skin" | "cloth" | "hair" | "eye" | "other";
const KIND: Record<Kind, { spec: number; fabric: number; bump: number; rim?: number }> = {
  skin: { spec: 0.4, fabric: 0, bump: 1, rim: 0.35 },
  cloth: { spec: 0.3, fabric: 1, bump: 0.6 },
  hair: { spec: 1, fabric: 0, bump: 1.6 },
  eye: { spec: 1, fabric: 0, bump: 0 },
  other: { spec: 1, fabric: 0, bump: 1 },
};

export type ShadeStyle = Pick<CharStyle, "light" | "shading" | "spec" | "rim" | "texture" | "rimLights">;

export const makeToon = (s: ShadeStyle, color: string, doubleSide = false, kind: Kind = "other") => {
  const k = KIND[kind];
  const eye = kind === "eye";
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uShadow: { value: new THREE.Vector3(...s.shading.shadow) },
      uLight: { value: new THREE.Vector3(...s.light).normalize() },
      uSteps: { value: s.shading.steps },
      uSoft: { value: s.shading.soft },
      // Augen: feucht-glasiger Spot wie bei Stop-Motion-Puppen
      uSpec: { value: eye ? (s.spec.strength > 0 ? 0.9 : 0) : s.spec.strength * k.spec },
      uSpecPow: { value: eye ? 90 : s.spec.power },
      uSpecHard: { value: eye ? 0.8 : s.spec.hard },
      uSpecColor: { value: new THREE.Color(s.spec.color) },
      uRim: { value: s.rim.strength },
      uRimColor: { value: new THREE.Color(s.rim.color) },
      uHalftone: { value: s.texture.halftone },
      uDotSize: { value: s.texture.dotSize },
      uGrain: { value: eye ? 0 : s.texture.grain },
      uBump: { value: s.texture.bump * k.bump },
      uBumpScale: { value: s.texture.bumpScale },
      uFabric: { value: s.texture.fabric * k.fabric },
      uFacet: { value: s.texture.facet ? 1 : 0 },
      uRimA: { value: eye ? 0 : (s.rimLights?.[0]?.strength ?? 0) * (k.rim ?? 1) },
      uRimACol: { value: new THREE.Color(s.rimLights?.[0]?.color ?? "#000") },
      uRimADir: { value: new THREE.Vector3(...(s.rimLights?.[0]?.dir ?? [1, 0, 0])) },
      uRimB: { value: eye ? 0 : (s.rimLights?.[1]?.strength ?? 0) * (k.rim ?? 1) },
      uRimBCol: { value: new THREE.Color(s.rimLights?.[1]?.color ?? "#000") },
      uRimBDir: { value: new THREE.Vector3(...(s.rimLights?.[1]?.dir ?? [-1, 0, 0])) },
    },
  });
};

// Inverted-Hull-Outline: Rückseiten entlang der Normalen aufgeblasen.
export const makeOutline = (s: Pick<CharStyle, "outline">, partColor: string, width: number) => {
  const c =
    s.outline.tint !== null
      ? new THREE.Color(partColor).multiplyScalar(s.outline.tint)
      : new THREE.Color(s.outline.color);
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uWidth: { value: width }, uColor: { value: c } },
    vertexShader: `uniform float uWidth;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
      mv.xyz += normalize(normalMatrix*normal)*uWidth; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor,1.0);
      #include <colorspace_fragment>
      }`,
  });
};

// Geometrie-Cache
const cache = new Map<string, THREE.BufferGeometry>();
let low = false;
export const setLowPoly = (v: boolean) => { low = v; };
const get = (k: string, f: () => THREE.BufferGeometry) => {
  const key = (low ? "L" : "H") + k;
  if (!cache.has(key)) cache.set(key, f());
  return cache.get(key)!;
};
const d = (hi: number, lo: number) => (low ? lo : hi);
export const G = {
  sphere: (r: number) => get(`s${r}`, () => new THREE.SphereGeometry(r, d(48, 10), d(32, 7))),
  cap: (r: number, theta: number) =>
    get(`c${r}_${theta}`, () => new THREE.SphereGeometry(r, d(48, 10), d(24, 5), 0, Math.PI * 2, 0, theta)),
  capsule: (r: number, l: number) => get(`k${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, d(12, 3), d(24, 7))),
  cone: (r: number, h: number) => get(`o${r}_${h}`, () => new THREE.ConeGeometry(r, h, d(24, 5), 1)),
  torus: (R: number, t: number, arc: number) =>
    get(`t${R}_${t}_${arc}`, () => new THREE.TorusGeometry(R, t, d(16, 5), d(48, 10), arc)),
  box: (w: number, h: number, d: number) => get(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (r: number, h: number) => get(`y${r}_${h}`, () => new THREE.CylinderGeometry(r, r, h, d(32, 7))),
  circle: (r: number) => get(`r${r}`, () => new THREE.CircleGeometry(r, 48)),
  cylT: (rt: number, rb: number, h: number) => get(`yt${rt}_${rb}_${h}`, () => new THREE.CylinderGeometry(rt, rb, h, d(32, 7))),
  lathe: (key: string, pts: [number, number][]) =>
    get(`l${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), d(48, 9))),
};
