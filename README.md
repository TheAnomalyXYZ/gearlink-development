# GearLink Battle

A match-and-link roguelike, running as a Devvit app on Reddit. Equip
five pieces of gear, link orbs of the same gear to attack, block or heal, and
see how far down the wave ladder you get. Every post carries its own ladder.

Ported from the Claude Design POC (`GearLink Battle.dc.html`, engine V3.3). The
tuning, the copy and the layout are the design's; what is new here is the split
between what the client plays and what the server decides.

## The one rule that shapes the architecture

**The client plays, the server decides.**

A run is deterministic from its seed: `Run` owns the only RNG, so the same seed
and the same moves always land on the same board. The client plays locally for
responsiveness and records the transcript. On death it submits `{ seed,
heroClass, picked, moves[] }` and nothing else — no score. The server replays
those moves through the identical engine and uses the score _it_ computes for
the ladder and for coins. A forged loadout, a tampered move list or a mismatched
seed all fail on the first move that is not legal on the board the engine dealt.

That is why `src/shared/engine` is pure: no DOM, no timers, no `Math.random`.

## Layout

```
src/shared/engine/   the game, as pure functions
  constants.ts       tuning: grid, chain multipliers, wave bands, block caps
  gear.ts            gear tables, hero perks, riders, loadout rules
  gear-data.ts       the card collection, generated from the library export
  rider-data.ts      per-card rider thresholds, likewise
  monsters.ts        the wave roster and its art
  board.ts           grid maths, link validation, collapse and refill
  run.ts             `Run` - one campaign turn, start to swing
  duel.ts            sabotage rules, junk, and the duel bot
  economy.ts         packs, odds, bundles, duplicate refunds
  replay.ts          `verifyRun` - what the server trusts
  rng.ts             mulberry32 and a string hash

src/server/
  core/profile.ts    the wallet and collection, in Redis, keyed by Reddit userId
  core/leaderboard.ts  the per-post ladder (a sorted set plus a detail hash)
  routes/api.ts      init, run submission, shop, duel result, coaching flags

src/client/
  GearLinkApp.tsx    all state, all behaviour, all animation timing
  view/buildView.ts  state -> a flat bag of strings, colours and handlers
  view/Screen.tsx    that bag -> markup; holds no state and makes no decisions
  view/game.css      the keyframes buildView names in its `animation` strings
  ftue.ts            the seven coaching steps and where each one points
  api.ts             typed wrapper over the app's endpoints
```

The `buildView` / `Screen` split is the design's own `renderVals` / template
seam, kept deliberately: a layout change happens in `Screen`, a behaviour change
in `GearLinkApp`, and neither has to know about the other.

`GearLinkApp` is a class component on purpose. Its flow is chained timers — a
link clears, the board settles, the monster winds up, the swing lands — and each
beat owns its own timer handle. Hooks would scatter that across refs without
making any of it clearer.

## What is server-authoritative

| Thing                         | How it is protected                                                           |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Run score, coins, ladder rank | Replayed from the transcript; the client's number is never read               |
| Loadout                       | Re-checked against the collection the server holds                            |
| Pack contents                 | Rolled on the server, held against a one-shot token, applied only on collect  |
| Currency                      | Only ever written by the server                                               |
| Gems                          | Minted only by the payments fulfilment route, off an order Reddit charged for |
| Duel trophies                 | Reported, not replayed — see below                                            |

A duel runs against a local AI on a real-time clock, so there is no transcript
to replay. It is bounded instead: the trophy delta is fixed, and a result that
arrives faster than a duel can physically be played scores zero. Every account
opens on 1000 trophies.

## Art and fonts

Every image and font is bundled into `public/art` and served from this app's own
origin as `/art/...`. A Devvit web view runs under a CSP that blocks third-party
`img-src` and `font-src`, so hotlinking the asset CDN renders blank squares and
falls back to a system font, with nothing in the console to say why.

`node tools/sync-art.mjs` re-pulls the art from the CDN when it changes. Unit
tests fail the build if a path points off-origin or has no file behind it.

One manual step: `public/art/PocketKnights/sky_v3.png` is downscaled to 1600px
wide (the CDN original is 4858px / 4.3MB). Re-run the `sips` line the sync
script prints if that file is ever refreshed.

## Layout on phones

The design draws the app inside a phone-shaped bezel, which is right on a
desktop canvas and wrong on an actual phone. The bezel lives in `game.css`
(`.gl-page` / `.gl-frame` / `.gl-shell`) and a `max-width: 520px` or
`max-height: 720px` viewport drops it and goes full-bleed. It is CSS rather than
JS state so rotation reflows instantly and never feeds back into the board
measurement.

## Payments

Gems are the one thing bought with real money, through Devvit payments.

1. `devvit.json` registers four `gems_*` products, priced in Reddit Gold.
2. `GEM_BUNDLES` in `src/shared/engine/economy.ts` says what each SKU grants.
   A unit test fails the build if those two ever disagree.
3. The client calls `purchase(sku)` and then does nothing but re-read the wallet.
4. Reddit charges, then calls `/internal/payments/fulfill`. That route reads the
   SKU off the order, claims the order id with `hSetNX` so a retry cannot pay
   twice, and credits the account. `/internal/payments/refund` reverses it.

There is deliberately no endpoint a client can call to grant itself gems.

## Commands

- `npm run dev` — playtest live on Reddit (needs `npm run login` first)
- `npm run build` — build client and server
- `npm run test:types` — typecheck every project
- `npm run test:unit` — engine determinism, replay verification, and a render
  pass over every screen
- `npm run lint`
- `npm run deploy` / `npm run launch`

## Known gaps

- **Forge Wars** (the async defence-building PVP mode) is not built. The design
  ships it; this app deliberately does not.
- The monster-piece roster economy went with Forge Wars, since piece drops only
  ever fed a defence team.
