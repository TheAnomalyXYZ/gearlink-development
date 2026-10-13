/**
 * The design-sync entry: the Gearlink UI that renders on its own, published
 * as one package for Claude Design. Nothing here is reimplemented - every
 * component is re-exported from `src/client` as the game ships it.
 *
 * The asset shim goes first so `/art/...` paths resolve before any component
 * mounts; the stylesheets are the game's own.
 */
import './assets-shim.js';
import './motion.js';
import '../../src/client/index.css';
import '../../src/client/view/game.css';
import '../../src/client/view/worldMap.css';

export { asset, ASSET_PATHS } from './assets-shim.js';

export {
  Challenge,
  Duellist,
  RankIcon,
  Reader,
} from '../../src/client/splash-card.js';
export { Chest, GiveButton } from '../../src/client/splash-chest.js';
export {
  Countdown,
  CountdownColon,
  CountdownUnit,
  Daily,
  DailyBanner,
  PodiumSeat,
  RibbonTail,
} from '../../src/client/splash-daily.js';
export { Enter, Sparkle } from '../../src/client/splash-enter.js';
export { General, HeroStander } from '../../src/client/splash-general.js';
export { WorldMap } from '../../src/client/view/WorldMap.js';
export type { WorldMapProps } from '../../src/client/view/WorldMap.js';
export {
  MenuIcon,
  SpeakerIcon,
  VolumeSlider,
} from '../../src/client/view/SettingsControls.js';
export { Booting, Fatal } from '../../src/client/components/BootScreens.js';
export {
  BarChart,
  ChartCard,
  LineChart,
  SegmentBar,
} from '../../src/client/admin/Charts.js';
export type { Segment } from '../../src/client/admin/Charts.js';
export {
  KpiCard,
  MiniStat,
  RangeSelector,
  SectionTitle,
  Table,
  Toggle,
} from '../../src/client/admin/Widgets.js';
