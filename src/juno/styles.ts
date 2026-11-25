import type { CharStyle } from "../character/styles";

// Juno: neue Figur, frei kombiniert aus allen 19 Referenzen (nur Stilmerkmale).
// Design & Palette sind in allen Stilen identisch – nur das Rendering wechselt.
export const JUNO = {
  skin: "#efc4a6",
  cheek: "#e8907a",
  freckle: "#b4704f",
  hair: "#2e211b",
  beanie: "#c99a2e",
  pin: "#d9632f",
  sweater: "#b5532a",
  pants: "#5f6446",
  socks: "#d2a23a",
  shoes: "#1f1f23",
  sole: "#efe6d6",
  bag: "#3f4a33",
  strap: "#2f3527",
  phones: "#ece4d5",
  phonesDark: "#2a2724",
  glasses: "#2a2421",
  iris: "#6b5a2e",
  mouth: "#a4524b",
  camera: "#ece4d5",
  cameraDark: "#25252a",
  red: "#c93b35",
};

export type JunoStyle = Pick<CharStyle, "light" | "shading" | "spec" | "rim" | "texture" | "rimLights" | "outline"> & {
  id: string;
  name: string;
  tagline: string;
  bg: string;
  ink: string;
  faceOutline: number;
  blush: number;
};

const T = { halftone: 0, dotSize: 6, grain: 0, bump: 0, bumpScale: 10, fabric: 0 };

export const JUNO_STYLES: JunoStyle[] = [
  {
    id: "knete-puppe",
    name: "A · Knete-Puppe",
    tagline: "Ref. 1–5 · keine Linie · Fensterlicht · Fingerabdrücke & Strick · Stop-Motion-Look",
    bg: "linear-gradient(115deg,#f5efe7 0%,#e5dbcc 36%,#f4efe8 50%,#ddd1c0 76%,#efe8de 100%)",
    ink: "#4a3528",
    light: [-0.55, 0.8, 0.7],
    outline: { width: 0, color: "#000", tint: null },
    shading: { steps: 0, soft: 0, shadow: [0.7, 0.6, 0.56] },
    spec: { strength: 0.06, power: 14, hard: 0, color: "#fff2e2" },
    rim: { strength: 0.08, color: "#fff2e2" },
    texture: { ...T, grain: 0.08, bump: 0.4, bumpScale: 34, fabric: 0.6 },
    faceOutline: 0,
    blush: 0.25,
  },
  {
    id: "soft-3d",
    name: "B · Soft-3D",
    tagline: "Ref. 6–8, 19 · keine Linie · weiches Studiolicht · glatte Haut · Strick & Stoff",
    bg: "radial-gradient(ellipse 60% 70% at 50% 40%,#c4d0b8 0%,#aebb9f 60%,#97a588 100%)",
    ink: "#2d3324",
    light: [-0.5, 0.7, 0.85],
    outline: { width: 0, color: "#000", tint: null },
    shading: { steps: 0, soft: 0, shadow: [0.74, 0.68, 0.68] },
    spec: { strength: 0.18, power: 26, hard: 0, color: "#fff5ea" },
    rim: { strength: 0.22, color: "#fff0dc" },
    texture: { ...T, grain: 0.02, bump: 0.03, bumpScale: 16, fabric: 0.85 },
    faceOutline: 0,
    blush: 0.35,
  },
  {
    id: "illustration-cel",
    name: "C · Illustrations-Cel",
    tagline: "Ref. 11–16 · warme dunkle Linie · flach, 2 Töne · Wangenröte · Papierkorn",
    bg: "linear-gradient(180deg,#efe7da 0%,#e8dfcf 100%)",
    ink: "#2d2622",
    light: [-0.5, 0.75, 0.8],
    outline: { width: 0.011, color: "#2d2622", tint: null },
    shading: { steps: 2, soft: 0.012, shadow: [0.84, 0.74, 0.76] },
    spec: { strength: 0.001, power: 30, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: { ...T, grain: 0.05 },
    faceOutline: 0.45,
    blush: 0.6,
  },
  {
    id: "neon-facette",
    name: "D · Neon-Facette",
    tagline: "Ref. 17–18 + 10 · große Facetten · harte Töne · blaues + warmes Lichterketten-Randlicht · Nacht",
    bg: "radial-gradient(circle at 14% 22%,rgba(255,190,110,.55) 0 0.6%,transparent 1.6%),radial-gradient(circle at 26% 12%,rgba(255,190,110,.45) 0 0.5%,transparent 1.4%),radial-gradient(circle at 80% 18%,rgba(255,190,110,.5) 0 0.6%,transparent 1.6%),radial-gradient(circle at 90% 30%,rgba(255,190,110,.4) 0 0.5%,transparent 1.4%),radial-gradient(circle at 70% 10%,rgba(255,190,110,.45) 0 0.5%,transparent 1.4%),radial-gradient(ellipse 50% 60% at 50% 45%,#3a2a20 0%,#1d1612 60%,#0e0b09 100%)",
    ink: "#f3e6d6",
    light: [-0.4, 0.75, 0.8],
    outline: { width: 0, color: "#000", tint: null },
    shading: { steps: 3, soft: 0.003, shadow: [0.55, 0.52, 0.62] },
    spec: { strength: 0.001, power: 30, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: { ...T, facet: true },
    rimLights: [
      { color: "#3d7dff", dir: [1, 0.25, -0.35], strength: 0.95 },
      { color: "#ffa24a", dir: [-1, 0.2, -0.3], strength: 0.8 },
    ],
    faceOutline: 0,
    blush: 0.15,
  },
];
