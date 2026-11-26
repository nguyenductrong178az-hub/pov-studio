import type { JunoStyle } from "../juno/styles";
import type { FigureDef } from "../cast/types";

// Neues Projekt: 4 Stilrichtungen, nur aus Stilmerkmalen von references/ abgeleitet (keine Figur kopiert).
// Jede Richtung = Shader-Werte (Figur + Raum) + Farbkorrektur (grade) + Himmel/Hintergrund + Palette.
export type Richtung = JunoStyle & {
  refs: string;
  grade: string; // CSS-Filter auf das fertige Bild (Farbkorrektur)
  sky: string; // Hintergrund hinter dem Raum in der POV-Probe
  palette: { name: string; hex: string }[]; // Leitfarben der Richtung
  rules: string[]; // Kurzregeln für CLAUDE.md
};

const T = { halftone: 0, dotSize: 6, grain: 0, bump: 0, bumpScale: 10, fabric: 0 };
const NO_LINE = { width: 0, color: "#000", tint: null };

export const RICHTUNGEN: Richtung[] = [
  {
    id: "puppen-noir",
    name: "A · Puppen-Noir",
    tagline: "Ref. 1, 2, 10 · keine Linie · Low-Key-Oberlicht · entsättigt · ein warmes Praktikal-Randlicht",
    refs: "1, 2, 10",
    bg: "radial-gradient(ellipse 45% 60% at 50% 38%,#4a4243 0%,#2a2526 55%,#141112 100%)",
    ink: "#e9dfd6",
    light: [-0.25, 1.0, 0.45],
    outline: NO_LINE,
    shading: { steps: 0, soft: 0, shadow: [0.42, 0.4, 0.47] },
    spec: { strength: 0.1, power: 22, hard: 0, color: "#ffe9d2" },
    rim: { strength: 0.06, color: "#ffe2c0" },
    texture: { ...T, grain: 0.06, bump: 0.12, bumpScale: 22, fabric: 0.7 },
    rimLights: [{ color: "#ffad5c", dir: [-1, 0.35, -0.5], strength: 0.55 }],
    faceOutline: 0,
    blush: 0.12,
    grade: "saturate(0.62) contrast(1.14) brightness(0.84) sepia(0.12)",
    sky: "linear-gradient(180deg,#3d4652 0%,#5c646b 50%,#7d7f7c 100%)",
    palette: [
      { name: "Grund dunkel", hex: "#141112" }, { name: "Grau", hex: "#6f6a68" }, { name: "Altrosa", hex: "#b88a8a" },
      { name: "Petrol", hex: "#3c5e63" }, { name: "Bordeaux", hex: "#6b2a33" }, { name: "Schlamm", hex: "#7a6a4f" },
      { name: "Praktikal-Licht", hex: "#ffad5c" },
    ],
    rules: [
      "Licht steil von oben (`[-0.25, 1.0, 0.45]`), Schatten tief und kühl `[0.42, 0.40, 0.47]`",
      "genau ein warmes Randlicht `#ffad5c` (Lampe/Fenster) von hinten links, Stärke 0.55",
      "Farbkorrektur: Sättigung 0.62, Kontrast 1.14, Helligkeit 0.84, Sepia 0.12",
      "Körnung 0.06, Stoffstruktur 0.7, leichte Hautunebenheit 0.12",
    ],
  },
  {
    id: "knete-fenster",
    name: "B · Knete & Fensterlicht",
    tagline: "Ref. 3, 4, 5, 9 · keine Linie · Fensterlicht seitlich · Fingerabdrücke · Terrakotta & Erdtöne",
    refs: "3, 4, 5, 9",
    bg: "linear-gradient(110deg,#f4ede3 0%,#e2d6c4 34%,#f3ece2 48%,#dacdb9 74%,#eee6da 100%)",
    ink: "#4a3528",
    light: [-0.8, 0.55, 0.55],
    outline: NO_LINE,
    shading: { steps: 0, soft: 0, shadow: [0.68, 0.58, 0.52] },
    spec: { strength: 0.06, power: 14, hard: 0, color: "#fff2e2" },
    rim: { strength: 0.1, color: "#fff2e2" },
    texture: { ...T, grain: 0.09, bump: 0.45, bumpScale: 30, fabric: 0.55 },
    faceOutline: 0,
    blush: 0.25,
    grade: "saturate(1.04) sepia(0.1) contrast(1.02)",
    sky: "linear-gradient(180deg,#bcd2dc 0%,#dfe7e2 55%,#f2ede3 100%)",
    palette: [
      { name: "Leinen", hex: "#efe6da" }, { name: "Terrakotta", hex: "#c67e51" }, { name: "Rost", hex: "#a84a2c" },
      { name: "Flaschengrün", hex: "#3e6b4f" }, { name: "Senf", hex: "#c99a2e" }, { name: "Jeans", hex: "#3c5878" },
      { name: "Holz", hex: "#8a6243" },
    ],
    rules: [
      "Licht flach von der Seite wie durch ein Fenster (`[-0.8, 0.55, 0.55]`), Schatten warm-rötlich `[0.68, 0.58, 0.52]`",
      "Knete: Hautunebenheit 0.45 (Maßstab 30), Körnung 0.09 → sichtbare Fingerabdrücke",
      "Glanz fast matt 0.06 / 14, nur Augen glasig",
      "Farbkorrektur: leicht warm (Sepia 0.10, Sättigung 1.04)",
    ],
  },
  {
    id: "vinyl-hell",
    name: "C · Vinyl-Spielzeug hell",
    tagline: "Ref. 7, 8, 19 · keine Linie · High-Key, kaum Kontrast · satinierter Vinyl-Glanz · ein kräftiger Akzent",
    refs: "7, 8, 19",
    bg: "radial-gradient(ellipse 55% 65% at 50% 40%,#ffffff 0%,#f1f2f0 60%,#e1e3df 100%)",
    ink: "#2a2b2e",
    light: [-0.35, 0.6, 1.0],
    outline: NO_LINE,
    shading: { steps: 0, soft: 0, shadow: [0.86, 0.83, 0.85] },
    spec: { strength: 0.34, power: 34, hard: 0.15, color: "#ffffff" },
    rim: { strength: 0.3, color: "#ffffff" },
    texture: { ...T, grain: 0.01, bump: 0, bumpScale: 16, fabric: 0.25 },
    faceOutline: 0,
    blush: 0.3,
    grade: "brightness(1.06) contrast(0.94) saturate(1.08)",
    sky: "linear-gradient(180deg,#b9dcf2 0%,#dcedf6 50%,#f6f8f8 100%)",
    palette: [
      { name: "Weiß", hex: "#f4f5f3" }, { name: "Hellgrau", hex: "#cfd2d0" }, { name: "Anthrazit", hex: "#2a2b2e" },
      { name: "Signalgelb", hex: "#ecb425" }, { name: "Jeans hell", hex: "#7f9fbf" }, { name: "Salbei", hex: "#abba9f" },
      { name: "Orange", hex: "#e0662f" },
    ],
    rules: [
      "Licht fast frontal (`[-0.35, 0.6, 1.0]`), Schatten sehr hell `[0.86, 0.83, 0.85]` → kaum Kontrast",
      "Vinyl-Glanz: Stärke 0.34, Exponent 34, Härte 0.15; Randlicht weiß 0.30",
      "keine Hautunebenheit, Körnung 0.01, Stoff nur angedeutet 0.25",
      "Farbkorrektur: Helligkeit 1.06, Kontrast 0.94, Sättigung 1.08",
    ],
  },
  {
    id: "comic-linie",
    name: "D · Comic-Linie",
    tagline: "Ref. 11–16 · warme dunkle Outline · flach mit 2 Tönen · Wangenröte · Papierkorn",
    refs: "11–16",
    bg: "linear-gradient(180deg,#f1e9dc 0%,#e9dfcf 100%)",
    ink: "#2d2622",
    light: [-0.5, 0.75, 0.8],
    outline: { width: 0.012, color: "#2d2622", tint: null },
    shading: { steps: 2, soft: 0.012, shadow: [0.82, 0.72, 0.74] },
    spec: { strength: 0.001, power: 30, hard: 1, color: "#ffffff" },
    rim: { strength: 0, color: "#ffffff" },
    texture: { ...T, grain: 0.05 },
    faceOutline: 0.45,
    blush: 0.6,
    grade: "saturate(0.95) contrast(1.04)",
    sky: "linear-gradient(180deg,#a9c6d6 0%,#d3e1e2 55%,#efe9dc 100%)",
    palette: [
      { name: "Papier", hex: "#efe7da" }, { name: "Linie", hex: "#2d2622" }, { name: "Senf", hex: "#b97e2c" },
      { name: "Dunkelgrün", hex: "#2d3128" }, { name: "Lachs", hex: "#e48c74" }, { name: "Rot", hex: "#b52330" },
      { name: "Jeans", hex: "#5a7aa0" },
    ],
    rules: [
      "Outline 0.012 Einheiten (Raum: 0.015 m), Farbe `#2d2622` (warmes Dunkelbraun, nie Schwarz)",
      "flach, genau 2 Töne (`steps: 2`, Übergang 0.012), Schatten `[0.82, 0.72, 0.74]`",
      "kein Glanz außer Augen-Lichtpunkt, keine Randlichter",
      "Papierkorn 0.05, Wangenröte 60 %",
    ],
  },
];

export const richtung = (id: string) => RICHTUNGEN.find((r) => r.id === id)!;

// Testfigur für die Stilprobe (gleiches Design in allen 4 Richtungen).
// Vergleich mit dem Register: Silhouette zerzaustes Kurzhaar ohne Kopfbedeckung (neu), Haar silber-flieder (neu),
// Oberteil Ochsenblut (neu), Akzent Kobalt (neu), Accessoire Uhr + kobaltblaues Handy,
// Körper 1:5 mittel. Unterschied zu jeder Figur ≥ 4/6; Augen graugrün (neu).
export const PROBE: FigureDef = {
  id: "mika", name: "Mika", role: "Testfigur für die Stilprobe",
  skin: "#dba783",
  hair: { style: "tousled", color: "#c9c3d6" },
  headwear: { type: "none", color: "#000" },
  glasses: "none",
  top: { type: "sweater", color: "#7a2e35" },
  bottom: { type: "cargo", color: "#b8a27c" },
  socks: "#3b5bd6",
  shoes: { color: "#2b2b30", sole: "#efe8dc", tab: "#3b5bd6" },
  accent: "#3b5bd6",
  extras: ["watch"],
  hands: { right: "phone", left: "none", phoneCase: "#3b5bd6" },
  eyes: { iris: "#7d8f6a", lid: -0.85, size: 1.0 },
  brows: { tilt: 0.08, thick: 1.0, color: "#8d86a0" },
  mouth: "smirk",
  body: { hip: 1.25, build: 1.0, headR: 0.25 },
};

// Fester Kanal-Stil (gewählt): D · Comic-Linie – Regeln in CLAUDE.md „Stil“
export const KANAL_STIL = richtung("comic-linie");
