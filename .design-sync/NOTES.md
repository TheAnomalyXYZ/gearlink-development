# design-sync notes (Gearlink)

## How this repo syncs

- Not a component library: the "package" is synthesised. `.design-sync/build/entry.ts` re-exports the self-contained UI from `src/client`; `node .design-sync/build/build.mjs` (cfg.buildCmd) builds it to `.design-sync/dist/` (gitignored): Vite lib build (React external, Tailwind compiled from repo sources incl. `.design-sync/previews/`), tsc `.d.ts`, fonts copied, a `package.json` named `gearlink-ds`. Run it before every converter/driver run.
- Converter: `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle [--remote .design-sync/.cache/remote-sync.json]` (entry comes from cfg.entry).
- Art: every image under `public/` (198 files, ~5MB raw) is embedded as a data-URI map (`virtual:gl-assets`) in the bundle (~6.9MB). `build/assets-shim.ts` resolves `/art/`, `/icons/`, `/avatars/`, `/fx/` paths at runtime: `img.src` setter + `setAttribute('src')` wrap, and a MutationObserver that rewrites `url()` in `style` attributes. Chromium style properties are NOT prototype accessors (can't be wrapped) and Chromium serialises them as `url("/...")` (quoted) - both bit this sync.
- `build/motion.ts` injects the feed cards' shared `glk-*` MOTION sheet at load; cards inline it themselves, but `Enter` alone (and designs) need it.
- `Enter` (claim button) was extracted from `splash.tsx` into `src/client/splash-enter.tsx` for this sync; `splash.tsx` wraps it with the Devvit `requestExpandedMode` click.
- Groups are atomic levels (Atoms / Molecules / Organisms / Templates), from stub docs in `.design-sync/groups/*.md` via `docsMap` - every component needs an entry there or it lands in "general".
- Sub-components were exported in place for the atomic breakdown (2026-10-13), several renamed to be namespace-safe: `GiveButton` (was Give), `CountdownUnit`/`CountdownColon`/`RibbonTail`/`DailyBanner`/`PodiumSeat` (Unit/Colon/Tail/Banner/Seat), `HeroStander` (Stander), `Sparkle` (Star). Admin widgets (`RangeSelector`, `Toggle`, `KpiCard`, `MiniStat`, `SectionTitle`, `Table`) moved to `src/client/admin/Widgets.tsx` because `AnalyticsView` imports Devvit + the API.
- `CHEST_MOTION` / `DAILY_MOTION` are exported so `build/motion.ts` can install them; standalone `PodiumSeat`/`DailyBanner`/`Countdown` need them.
- Not yet atomised: `Screen.tsx` (10k lines of inline JSX, no sub-components). Candidate atoms there: lemon/lilac/red pixel button (47x clipped-corner border), panel, currency pill. Needs a refactor of Screen to make them real.
- Excluded on purpose: `Screen` (needs the whole `buildView` state), `Splash` (mounts + calls the API on import), `AdminPanel`/`PlayersView`/`AnalyticsView` (API + `@devvit/web/client`).
- Playwright: cached chromium-1169 -> `playwright@1.52.0` installed in `.ds-sync/`.

## Preview gotchas

- Preview frames live in `.design-sync/preview-kit/` (imported by previews; esbuild bundles relative imports). Templates render the real component in an iframe that reloads the card page with `?story=<name>` in a frame named `gl-frame`; inside it the wrappers return only children, so `h-screen`/`vh` match the webview exactly. `DesktopPost` = 720x512 feed post, `MobilePost` = phone 390x512, `DesktopScreen` = 600 tall landscape, `MobileScreen` = phone 390x780. The `story` prop must equal the export name.
- Themes are `*.module.css` on purpose: the import plugin empties plain `.css`, but `.module.css` ships as `_preview/<Name>.css`. Harness classes need `:global(...)`.
- Each framed story loads the 7MB bundle again in its iframe; offscreen iframes paint only when scrolled into view (full-card screenshots need a tall viewport).
- `Daily`'s `now` prop only pins the first render; the countdown then runs on the real clock. Live stories set `endsAt` relative to `Date.now()`.
- `Daily`/`PodiumSeat` seats and `HeroStander` (`glk-land`) animate in over ~1.5s; the capture fires mid-flight so seats/the middle hero can be missing in sheets. Verify with a 3s screenshot before grading.
- `Enter` must sit in a flex box or its sparkle stars spread to the container edge.

## Known render warns

- None at last sync (wide molecules/organisms already use `cardMode: column`). Cosmetic: the game's `html{background:#0B1020}` shows as a dark block below short previews in the harness - expected, it's the game's page colour.

## Re-sync risks

- Asset map is everything in `public/` (minus non-images); adding big art grows `_ds_bundle.js` directly. Audio is excluded by extension only.
- The shim depends on React writing styles that serialise to the `style` attribute; a React upgrade that changes that path would silently drop CSS art (check WorldMap stickers + Challenge arena backdrop).
- Preview fixtures (Challenge cards, Daily posters, Chest) are copied literals generated from `src/shared/engine` + `src/shared/daily.ts` on 2026-10-13; they rot if gear ids/art paths are renamed.
- Fonts come from `public/art/NeuraKnights/Fonts/` via a path rewrite in `build.mjs`; renaming that dir breaks fonts silently.
- `tsc` types path `types/.design-sync/build/entry.d.ts` follows `rootDir: ../..`; moving the entry changes it (update `build.mjs`).
