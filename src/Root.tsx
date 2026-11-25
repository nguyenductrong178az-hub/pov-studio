import { Fragment } from "react";
import { Composition, Still } from "remotion";
import { PovTest } from "./PovTest";
import { FaceCloseup, Turnaround } from "./character/Sheets";
import { STYLES } from "./character/styles";
import { ANIME_STYLES } from "./anime/styles";
import { RenView, VIEWS } from "./anime/Views";
import { JUNO_STYLES } from "./juno/styles";
import { JunoView, JVIEWS } from "./juno/Views";
import { CAST } from "./cast/cast";
import { CastLineup, CastView, CVIEWS } from "./cast/Views";
import { KlassenzimmerRaw } from "./scenes/klassenzimmer/Scene";
import { NachtzugRaw, DURATION_S as NZ_DUR } from "./scenes/nachtzug/Scene";
import { StilFigur, StilGesicht, StilPalette, STIL_IDS } from "./stile/Views";
import { DURATION_S } from "./scenes/klassenzimmer/timeline";

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PovTest" component={PovTest} durationInFrames={3 * FPS} fps={FPS} width={WIDTH} height={HEIGHT} />
    {STYLES.map((s) => (
      <Still key={s.id} id={`Turnaround-${s.id}`} component={Turnaround} defaultProps={{ styleId: s.id }} width={WIDTH} height={HEIGHT} />
    ))}
    {STYLES.map((s) => (
      <Still key={s.id} id={`Face-${s.id}`} component={FaceCloseup} defaultProps={{ styleId: s.id }} width={WIDTH} height={HEIGHT} />
    ))}
    {ANIME_STYLES.flatMap((s) =>
      VIEWS.map((v) => (
        <Still key={`${s.id}-${v.id}`} id={`Ren-${s.id}-${v.id}`} component={RenView} defaultProps={{ styleId: s.id, view: v.id }} width={WIDTH} height={HEIGHT} />
      )),
    )}
    {JUNO_STYLES.flatMap((s) =>
      JVIEWS.map((v) => (
        <Still key={`j-${s.id}-${v.id}`} id={`Juno-${s.id}-${v.id}`} component={JunoView} defaultProps={{ styleId: s.id, view: v.id }} width={WIDTH} height={HEIGHT} />
      )),
    )}
    {CAST.flatMap((f) =>
      CVIEWS.map((v) => (
        <Still key={`c-${f.id}-${v.id}`} id={`Cast-${f.id}-${v.id}`} component={CastView} defaultProps={{ figId: f.id, view: v.id }} width={WIDTH} height={HEIGHT} />
      )),
    )}
    <Still id="Cast-Lineup" component={CastLineup} width={WIDTH} height={HEIGHT} />
    {STIL_IDS.map((id) => (
      <Fragment key={`stil-${id}`}>
        <Still id={`Stil-${id}-figur`} component={StilFigur} defaultProps={{ id }} width={WIDTH} height={HEIGHT} />
        <Still id={`Stil-${id}-gesicht`} component={StilGesicht} defaultProps={{ id }} width={WIDTH} height={HEIGHT} />
        <Still id={`Stil-${id}-palette`} component={StilPalette} defaultProps={{ id }} width={WIDTH} height={HEIGHT} />
        <Still id={`Stil-${id}-pov`} component={KlassenzimmerRaw} defaultProps={{ stil: id, at: 0.8 }} width={WIDTH} height={HEIGHT} />
      </Fragment>
    ))}
    <Composition id="Nachtzug-Raw" component={NachtzugRaw} durationInFrames={Math.ceil(NZ_DUR * FPS)} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Still id="Nachtzug-Probe" component={NachtzugRaw} defaultProps={{ at: 2.0 }} width={WIDTH} height={HEIGHT} />
    <Composition id="Klassenzimmer-Raw" component={KlassenzimmerRaw} durationInFrames={DURATION_S * FPS} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
