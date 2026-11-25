// Stilrichtungen, abgeleitet aus references/STILANALYSE.md (nur Stil, keine Figuren).
export type CharStyle = {
  id: string;
  name: string;
  tagline: string;
  bg: string;
  ink: string;
  light: [number, number, number];
  palette: {
    skin: string; hair: string; hoodie: string; pants: string; shoes: string; sole: string;
    accent: string; iris: string; mouth: string; plaster: string;
  };
  outline: { width: number; color: string; tint: number | null };
  shading: { steps: number; soft: number; shadow: [number, number, number] };
  spec: { strength: number; power: number; hard: number; color: string };
  rim: { strength: number; color: string };
  texture: { halftone: number; dotSize: number; grain: number; bump: number; bumpScale: number; fabric: number; facet?: boolean };
  blush: number;
  rimLights?: { color: string; dir: [number, number, number]; strength: number }[]; // harte, gerichtete Randlichter
  outfit?: { oversize: number; wideSleeve: boolean; widePants: number; crop: number; hemColor: string; sock: string };
  proportions: {
    head: number; eye: number; body: number; limb: number; chunk: number;
    neckLen: number; neckR: number; nose: number; ears: number; iris: number;
    lid: number; bags: number; brow: number; mouth: number; messy: number;
    earRed: number; shoe: number;
  };
};

const NO_LINE = { width: 0, color: "#000", tint: null };

export const STYLES: CharStyle[] = [
  {
    id: "stopmotion-knete",
    name: "A · Stop-Motion-Knete",
    tagline: "Ref. 1–5 · keine Linie · Fensterlicht · Terrakotta & Erdtöne · Fingerabdrücke · Knollennase, Kulleraugen",
    bg: "linear-gradient(115deg,#f6f1ea 0%,#e3d9cb 38%,#f3eee6 52%,#ddd2c2 78%,#efe9e0 100%)",
    ink: "#4a3528",
    light: [-0.55, 0.8, 0.7],
    palette: {
      skin: "#c67e51", hair: "#1e1b15", hoodie: "#a84a2c", pants: "#2f4867", shoes: "#3b3532",
      sole: "#a8794f", accent: "#3e7a52", iris: "#5a3820", mouth: "#a24a3c", plaster: "#e7d6b6",
    },
    outline: NO_LINE,
    shading: { steps: 0, soft: 0, shadow: [0.7, 0.58, 0.54] },
    spec: { strength: 0.06, power: 12, hard: 0, color: "#fff2e2" },
    rim: { strength: 0.08, color: "#fff2e2" },
    texture: { halftone: 0, dotSize: 6, grain: 0.1, bump: 0.55, bumpScale: 30, fabric: 0.3 },
    blush: 0,
    proportions: {
      head: 1.2, eye: 1.2, body: 0.86, limb: 1.2, chunk: 0.8,
      neckLen: 1.2, neckR: 0.7, nose: 2.2, ears: 1.6, iris: 0.38, lid: 0.12, bags: 0, brow: 2.2, mouth: 0.6, messy: 1.6, earRed: 0.1, shoe: 1,
    },
  },  {
    id: "soft-3d-teen",
    name: "B · Soft-3D Teen",
    tagline: "Ref. 6–8, 19 · keine Linie · weiches Studiolicht · Kraftpapier · rote Ohren · dünner Hals, lange Beine, klobige Sneaker",
    bg: "repeating-linear-gradient(90deg,rgba(255,255,255,.0) 0 7px,rgba(255,255,255,.05) 7px 9px),radial-gradient(ellipse 30% 55% at 50% 50%,rgba(245,232,214,.55) 0%,rgba(245,232,214,0) 100%),linear-gradient(180deg,#b9977a 0%,#ab8868 100%)",
    ink: "#3b2a1e",
    light: [-0.5, 0.7, 0.85],
    palette: {
      skin: "#e8b997", hair: "#352c25", hoodie: "#b5532a", pants: "#3e5866", shoes: "#f3efe6",
      sole: "#d8ae1e", accent: "#282e2f", iris: "#4b8fa1", mouth: "#b06a64", plaster: "#f6e6cc",
    },
    outline: NO_LINE,
    shading: { steps: 0, soft: 0, shadow: [0.74, 0.7, 0.68] },
    spec: { strength: 0.22, power: 28, hard: 0, color: "#fff5ea" },
    rim: { strength: 0.25, color: "#ffe2c4" },
    texture: { halftone: 0, dotSize: 6, grain: 0.02, bump: 0.03, bumpScale: 16, fabric: 0.7 },
    blush: 0.15,
    proportions: {
      head: 1.3, eye: 1.0, body: 0.78, limb: 1.5, chunk: 0.62,
      neckLen: 1.7, neckR: 0.5, nose: 1.0, ears: 1.5, iris: 0.6, lid: 0.38, bags: 0, brow: 1.3, mouth: 0.45, messy: 1.4,
      earRed: 0.55, shoe: 1.45,
    },
  },  {
    id: "cartoon-linie",
    name: "C · Cartoon-Linie",
    tagline: "Ref. 11–16 · dicke dunkle Outline · flach, 2 Töne · große runde Augen · Wangenröte · Papierkorn",
    bg: "linear-gradient(180deg,#efe8dc 0%,#e9e0d1 100%)",
    ink: "#2a2420",
    light: [-0.5, 0.7, 0.85],
    palette: {
      skin: "#efcdb3", hair: "#1a1a1c", hoodie: "#d0562c", pants: "#2d3128", shoes: "#b52330",
      sole: "#f4f0e8", accent: "#b97e2c", iris: "#1a1a1c", mouth: "#7a2e2e", plaster: "#fff1d6",
    },
    outline: { width: 0.02, color: "#1a1a1c", tint: null },
    shading: { steps: 2, soft: 0.01, shadow: [0.86, 0.74, 0.78] },
    spec: { strength: 0, power: 30, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: { halftone: 0, dotSize: 6, grain: 0.05, bump: 0, bumpScale: 10, fabric: 0 },
    blush: 0.65,
    proportions: {
      head: 1.2, eye: 1.35, body: 0.85, limb: 1.35, chunk: 0.7,
      neckLen: 1.4, neckR: 0.6, nose: 0.6, ears: 1.4, iris: 0.32, lid: 0, bags: 0, brow: 1.2, mouth: 0.5, messy: 1.0,
      earRed: 0.1, shoe: 1.3,
    },
  },
  {
    id: "lowpoly-flat",
    name: "D · Low-Poly-Flat",
    tagline: "Ref. 17 · keine Linie · große Facetten · harte Töne · blaues + warmes Randlicht · ~7 Köpfe · Oversize",
    bg: "radial-gradient(ellipse 60% 8% at 50% 88%,rgba(0,0,0,.05) 0%,rgba(0,0,0,0) 100%),#ffffff",
    ink: "#1b1c1e",
    light: [-0.35, 0.8, 0.75],
    palette: {
      skin: "#d1a386", hair: "#17181b", hoodie: "#1d1e21", pants: "#1b1c1e", shoes: "#f2f2f4",
      sole: "#1c2233", accent: "#c9692f", iris: "#2a1c14", mouth: "#8d5a4c", plaster: "#efe0c6",
    },
    outline: NO_LINE,
    shading: { steps: 3, soft: 0.003, shadow: [0.67, 0.67, 0.72] },
    spec: { strength: 0.01, power: 30, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#2e70ba" },
    texture: { halftone: 0, dotSize: 6, grain: 0, bump: 0, bumpScale: 10, fabric: 0, facet: true },
    blush: 0,
    rimLights: [
      { color: "#2e6fd6", dir: [1, 0.25, -0.35], strength: 0.95 },
      { color: "#c8645a", dir: [-1, 0.45, -0.3], strength: 0.7 },
    ],
    outfit: { oversize: 1.35, wideSleeve: true, widePants: 1.9, crop: 0.3, hemColor: "#e9e9ec", sock: "#141416" },
    proportions: {
      head: 0.55, eye: 0.62, body: 0.82, limb: 2.45, chunk: 0.85,
      neckLen: 1.3, neckR: 0.95, nose: 0.9, ears: 0.9, iris: 0.6, lid: 0.4, bags: 0, brow: 1.0, mouth: 0.45, messy: 0.9,
      earRed: 0.05, shoe: 1.2,
    },
  },

];
