// Figuren-Baukasten für Stil B (Soft-3D). Jede Figur = ein Datensatz.
export type HairStyle = "bob" | "bun" | "long" | "afro" | "puffs" | "short" | "fringe" | "tousled" | "braids";
export type Headwear = "none" | "beanie" | "capBack" | "headband" | "hood" | "flatcap" | "headscarf";
export type Top = "sweater" | "hoodie" | "open" | "puffer" | "coat" | "robe"; // robe = áo choàng ngủ dài có đai // open = offene Jacke/Hemd über Shirt
export type Bottom = "cargo" | "jeans" | "skirt" | "joggers";
export type Mouth = "smile" | "grin" | "flat" | "smirk";
export type HandProp = "phone" | "camera" | "mug" | "marker" | "radio" | "boltcutter" | "none";

export type FigureDef = {
  id: string;
  name: string;
  role: string;
  skin: string;
  hair: { style: HairStyle; color: string };
  headwear: { type: Headwear; color: string; accent?: string };
  glasses: "none" | "round" | "rect";
  top: { type: Top; color: string; sleeves?: string; inner?: string };
  bottom: { type: Bottom; color: string };
  socks?: string;
  shoes: { color: string; sole: string; tab?: string };
  accent: string;
  extras: ("scarf" | "chain" | "earbud" | "hoops" | "wiredBuds" | "scrunchie" | "watch" | "freckles" | "mustache" | "stubble" | "reflect" | "snow" | "headphonesOn" | "badge")[];
  hands: { right: HandProp; left: HandProp; phoneCase?: string };
  eyes: { iris: string; lid: number; size: number }; // lid: Rotation des Oberlids (−1.2 offen … −0.4 schwer)
  brows: { tilt: number; thick: number; color?: string };
  mouth: Mouth;
  body: { hip: number; build: number; headR: number }; // hip = Beinlänge, build = Breite
};
