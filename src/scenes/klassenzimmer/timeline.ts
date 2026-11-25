// Zeitplan der Szene – einzige Quelle für Bild, Untertitel und Ton: scenes/klassenzimmer/timeline.json
import tl from "../../../scenes/klassenzimmer/timeline.json";

export const FPS = tl.fps;
export const DURATION_S = tl.duration_s;
export type Line = { id: string; speaker: string; start: number; end: number; text: string };
export const LINES: Line[] = tl.lines;
export const EVENTS = {
  bang: tl.events.bang,
  jet1: tl.events.jet1 as [number, number],
  jet2: tl.events.jet2 as [number, number],
  phoneBuzz: tl.events.phoneBuzz as [number, number],
  weberWalk: tl.events.weberWalk as [number, number],
  leoRise: tl.events.leoRise as [number, number],
  leoRun: tl.events.leoRun as [number, number],
};
