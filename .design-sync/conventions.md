# Gearlink conventions (read before building)

Gearlink is a pixel-art Reddit game (Devvit). Everything is dark, chunky and hand-drawn: hard black borders, pixel fonts, game art. Build screens out of the components below plus inline styles.

## Setup

- No provider. Load `styles.css` (fonts + the game's stylesheet) and `_ds_bundle.js`; components live on `window.Gearlink.*`.
- **Art works by path.** Every image the game ships is bundled. Use the game's own root paths directly: `<img src="/art/NeuraKnights/Characters/Hero.png">` or `background: 'url(/art/PocketKnights/sky_v3.png) center/cover'` - the bundle swaps them for the embedded image at runtime. `Gearlink.asset(path)` returns the data URI explicitly (use it for `<canvas>` or anywhere outside `src`/`style`); `Gearlink.ASSET_PATHS` lists every path. Don't invent paths - pick from that list. Useful ones: `/art/NeuraKnights/Characters/{Hero,Archer,Mage}.png`, `/art/NeuraKnights/Monsters/*.png`, `/art/PocketKnights/Background/{Forest,Bridge,Caves,GhostTown,Mountain,Castle}.png`, `/art/NeuraKnights/Item/Gold_V2.png` (coin), `/art/PocketKnights/Item/Treasure_V2.png`, `/art/NeuraKnights/rank/*.png`, `/art/NeuraKnights/gui/{Shop,Quest,Bag}_V2.png`, `/icons/BattlePassIcon.svg`, `/avatars/snoo-default.png`.
- **Feed cards fill the viewport** (`h-screen`), as they fill their Reddit post iframe. Render `Challenge`, `Chest`, `Daily`, `General` as the whole page, or inside a fixed frame with `.frame .h-screen{height:100%;max-height:100%}`. A post slot is about 400x512.
- `Daily`'s countdown runs on the real clock: give a live poster `endsAt: Date.now() + hours*3600000`.
- `WorldMap` with `embedded={false}` sizes itself to the viewport (max 460px wide) and draws its own bottom nav.

## Components by level (compose up, don't redraw)

- **Atoms**: `Sparkle`, `CountdownColon`, `RibbonTail`, `SpeakerIcon`, `MenuIcon`, `SectionTitle`.
- **Molecules**: `Enter` (the primary button), `GiveButton` (coin amount button), `RankIcon`, `CountdownUnit`, `Countdown`, `VolumeSlider`; admin `KpiCard`, `MiniStat`, `RangeSelector`, `Toggle`, `SegmentBar`.
- **Organisms**: `Duellist`, `Reader` (full-body snoos; give them a sized box), `HeroStander` (put three in a flex row, `i` 0-2), `PodiumSeat` (order places 1, 0, 2 in a flex row with `alignItems: flex-end`), `DailyBanner`; admin `LineChart`, `BarChart`, `ChartCard`, `Table`.
- **Templates**: the feed cards `Challenge`, `Chest`, `Daily`, `General`; `WorldMap`; `Booting`, `Fatal`.

Before drawing a button, clock, rank badge or podium yourself, use the existing piece. `Countdown` takes `left` in seconds and goes red under an hour.

## Styling idiom: inline styles, not classes

The game styles almost everything with inline `style={{...}}`. Tailwind is compiled only for classes the game itself uses, so new utility classes may not exist - use inline styles for your own layout.

| Role | Value |
|---|---|
| Page / shell bg | `#0B1020`, `#101528` |
| Title text | `fontFamily: "'Yoster Island',Volter,monospace"`, `color: '#FFF2B0'`, `textShadow: '0 4px 0 #141D2E'` |
| Body / UI text | `fontFamily: 'Volter,ui-monospace,monospace'`; pixel headings `'VolterTitle,Volter,monospace'` |
| Primary button | lemon `#FCE270`, `border: '3px solid #000'`, `borderRadius: '8px 2px 8px 2px'`, inset lip `0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset` - or just use `Enter` |
| Danger / banner | red gradient `#E8453C`->`#A81F22`, error text `#FF9EA1` |
| Light panel | `#FDFDFD`, header `#7981F2`, label `#4B6A85`, menu text `#2B3E60`, menu blue `#428FFB` |
| Class colours | Hero `#E8453C`, Archer `#5CC45A`, Mage `#8C7CFF` |

Pixel art needs `imageRendering: 'pixelated'`. Motion classes are available everywhere: `glk-bob`, `glk-float`, `glk-breathe`, `glk-pop`, `glk-rise`, `glk-blink`, `glk-sheen` (all stop under reduced motion).

Admin charts (`LineChart`, `BarChart`, `SegmentBar`, `ChartCard`) are a separate, plain dashboard look: put them on `className="bg-zinc-950 text-zinc-100 font-sans"`; `SegmentBar` colours are Tailwind classes (`bg-blue-600`, `bg-emerald-600`, `bg-purple-600`).

## Where the truth lives

Examples in `<Name>.prompt.md` wrap components in preview-only frames (`DesktopPost`, `MobilePost`, `DesktopScreen`, `MobileScreen`, `Stage`, `AdminStage`). They are not in the bundle: render the component itself.


`styles.css` and `_ds_bundle.css` (fonts, keyframes); each component's `<Name>.d.ts` (props) and `<Name>.prompt.md` (worked examples).

## Example

```jsx
const { Enter } = window.Gearlink;
<div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24, fontFamily: 'Volter,ui-monospace,monospace', color: '#CBD9EC' }}>
  <div style={{ fontFamily: "'Yoster Island',Volter,monospace", fontSize: 28, color: '#FFF2B0', textShadow: '0 4px 0 #141D2E' }}>VICTORY</div>
  <img className="glk-bob" src="/art/NeuraKnights/Characters/Archer.png" style={{ height: 140, imageRendering: 'pixelated' }} />
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <img src="/art/NeuraKnights/Item/Gold_V2.png" style={{ width: 14 }} /> +120 COINS
  </div>
  <Enter label="PLAY AGAIN" sparkle onClick={() => {}} />
</div>
```

Put `Enter` in a flex container so its sparkle stars hug the button.
