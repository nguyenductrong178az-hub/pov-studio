import type { CharStyle } from "../character/styles";

// Ren: neuer Anime-Charakter. Palette ist in allen Stilen gleich (Konsistenz),
// die Stile unterscheiden sich nur in Linie, Schattierung, Licht und Textur.
export const REN = {
  skin: "#f3d6c4",
  hair: "#15161c",
  hoodie: "#1c1d23",
  pants: "#202128",
  strap: "#2c2d35",
  shoes: "#f5f5f7",
  sole: "#e4e4ea",
  red: "#d23f4b",
  stripe: "#eeeef2",
  iris: "#3b5488",
  irisLight: "#8fb3f0",
  lash: "#17171f",
  mouth: "#b2625e",
  silver: "#cfd4dc",
};

export type AnimeStyle = Pick<CharStyle, "light" | "shading" | "spec" | "rim" | "texture" | "rimLights" | "outline"> & {
  id: string;
  name: string;
  tagline: string;
  bg: string;
  ink: string;
  faceOutline: number; // Linien-Faktor in der Nahaufnahme
};

const TEX = { halftone: 0, dotSize: 6, grain: 0, bump: 0, bumpScale: 10, fabric: 0 };
const BLUE = "#3d7dff";
const RED = "#e0636b";
const WHITE_BG = "radial-gradient(ellipse 70% 60% at 50% 45%,#ffffff 0%,#f6f7f9 70%,#eceef2 100%)";

export const ANIME_STYLES: AnimeStyle[] = [
  {
    id: "clean-cel",
    name: "A · Clean Cel",
    tagline: "dünne saubere Linie · weiches 2-Ton-Cel-Shading · blaues + rotes Randlicht",
    bg: WHITE_BG,
    ink: "#16171d",
    light: [-0.45, 0.75, 0.8],
    outline: { width: 0.009, color: "#16171d", tint: null },
    shading: { steps: 2, soft: 0.02, shadow: [0.74, 0.76, 0.9] },
    spec: { strength: 0.001, power: 40, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: TEX,
    rimLights: [
      { color: BLUE, dir: [1, 0.3, -0.35], strength: 0.9 },
      { color: RED, dir: [-1, 0.12, -0.3], strength: 0.55 },
    ],
    faceOutline: 0.4,
  },
  {
    id: "facet-flat",
    name: "B · Facet Flat",
    tagline: "keine Linie · große Facetten wie in Bild 17 · harte 3 Töne · kräftiges Randlicht",
    bg: "#ffffff",
    ink: "#16171d",
    light: [-0.4, 0.8, 0.75],
    outline: { width: 0, color: "#000", tint: null },
    shading: { steps: 3, soft: 0.003, shadow: [0.68, 0.69, 0.78] },
    spec: { strength: 0.01, power: 30, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: { ...TEX, facet: true },
    rimLights: [
      { color: "#2e6fd6", dir: [1, 0.25, -0.35], strength: 0.95 },
      { color: "#c8645a", dir: [-1, 0.12, -0.3], strength: 0.7 },
    ],
    faceOutline: 0,
  },
  {
    id: "soft-glow",
    name: "C · Soft Glow",
    tagline: "feine farbige Linie · weiche Verläufe · blaues Glühen am Rand · cineastisch",
    bg: "radial-gradient(ellipse 55% 65% at 55% 42%,#ffffff 0%,#f1f4fa 60%,#e3e8f2 100%)",
    ink: "#1e2230",
    light: [-0.55, 0.7, 0.7],
    outline: { width: 0.006, color: "#000", tint: 0.45 },
    shading: { steps: 0, soft: 0, shadow: [0.66, 0.7, 0.88] },
    spec: { strength: 0.1, power: 30, hard: 0.3, color: "#ffffff" },
    rim: { strength: 0.45, color: "#7fa8ff" },
    texture: { ...TEX, grain: 0.02 },
    rimLights: [
      { color: BLUE, dir: [1, 0.3, -0.35], strength: 0.55 },
      { color: RED, dir: [-1, 0.12, -0.3], strength: 0.35 },
    ],
    faceOutline: 0.45,
  },
  {
    id: "ink-contrast",
    name: "D · Ink Contrast",
    tagline: "kräftige schwarze Linie · harter Schatten mit Raster · grafisch, Manga-nah",
    bg: "#ffffff",
    ink: "#0e0e12",
    light: [-0.6, 0.8, 0.6],
    outline: { width: 0.016, color: "#0b0b0f", tint: null },
    shading: { steps: 2, soft: 0.004, shadow: [0.52, 0.55, 0.72] },
    spec: { strength: 0.001, power: 50, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: { ...TEX, halftone: 0.55, dotSize: 7 },
    rimLights: [
      { color: BLUE, dir: [1, 0.3, -0.35], strength: 1 },
      { color: RED, dir: [-1, 0.12, -0.3], strength: 0.75 },
    ],
    faceOutline: 0.35,
  },
];
