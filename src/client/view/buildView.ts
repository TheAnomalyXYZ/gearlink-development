/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The view model: every string, colour, flag and handler the UI renders.
 *
 * This is the design's `renderVals` - kept as one function on purpose. The app
 * owns state and behaviour, `Screen` owns markup, and this is the single seam
 * between them, so neither side has to know anything about the other.
 */
import type { GearLinkApp } from '../GearLinkApp.js';
import {
  AFFIX_BLURB,
  AFFIX_TINT,
  BTN,
  COIN_BUNDLES,
  COIN_ICON,
  DUEL_FTUE_STEPS,
  DUEL_SETUP_STEPS,
  DUEL_HP,
  DUEL_JUNK_MIN_LINK,
  DUEL_MATCH_SECONDS,
  EFFECT_COLOR,
  EFFECT_ICON,
  EFFECT_LABEL,
  EFFECT_TINTS,
  GEAR,
  GEM_BUNDLES,
  GEM_ICON,
  HEART_PIECE_ICON,
  HEART_PIECES_PER_CONTAINER,
  HP_PER_HEART_CONTAINER,
  MAX_HEART_CONTAINERS,
  heartsFor,
  maxHpFor,
  GRID_COLS,
  GRID_ROWS,
  HERO_PERKS,
  HERO_STATUS,
  INTENT_ICON,
  JUNK_ICON,
  MONSTER_STATUS,
  NO_STATUS,
  PACKS,
  QUESTS,
  RARITY_ORDER,
  RARITY_OUTLINE,
  RIDERS,
  colOf,
  leagueOf,
  leagueProgress,
  nextLeague,
  toNextLeague,
  LOCATIONS,
  MAP_ART,
  MAP_LENGTH,
  mapPinUrlFor,
  getGearImageUrl,
  isJunk,
  isSuper,
  junkDamage,
  magnitudeFor,
  monsterUrlFor,
  orbTypeOf,
  packById,
  riderOf,
  rowOf,
  rewardLabel,
} from '../../shared/engine/index.js';
import { BOMB_ICON, GEARLINK_ICON, NAV_ICON } from './assets.js';
import {
  DUEL_SETUP_PHASE,
  FTUE_COPY,
  FTUE_DOING,
  FTUE_LEGEND,
  FTUE_ORDER,
} from '../ftue.js';

export type View = Record<string, any>;

export const buildView = (app: GearLinkApp): View => {
  /* This function indexes the engine's tables by values the UI computes at
     runtime (an orb's effect, a rider's kind, the current hero). Widened
     aliases keep that honest in one place instead of a cast per lookup. */
  const PERKS = HERO_PERKS as Record<
    string,
    NonNullable<(typeof HERO_PERKS)['Hero']>
  >;
  const RID = RIDERS as Record<string, NonNullable<(typeof RIDERS)['burn']>>;
  const st = app.state as any;
  const loadout = app.loadout();
  const myLeague = leagueOf(st.profile.trophies);
  const upLeague = nextLeague(st.profile.trophies);
  const toNext = toNextLeague(st.profile.trophies);
  const questBoard = st.quests;
  const questClaimable = questBoard
    ? [...questBoard.daily, ...questBoard.weekly].filter(
        (q: any) => q.claimable
      ).length
    : 0;

  /** Five read-only gear tiles, for the screens that SHOW a loadout rather
   *  than edit it - the opt-in card and the lobby's own row. */
  const duelSlotTiles = (picked: string[]) =>
    [0, 1, 2, 3, 4].map((i) => {
      const id = picked[i];
      const g = id ? GEAR.find((x) => x.id === id) : null;
      let ordinal = 0;
      if (g)
        for (let k = 0; k < i; k++) {
          const p = GEAR.find((x) => x.id === picked[k]);
          if (p && p.effect === g.effect) ordinal++;
        }
      return {
        icon: g ? getGearImageUrl(g.id) || EFFECT_ICON[g.effect] : '',
        bg: g
          ? EFFECT_TINTS[g.effect]![Math.min(ordinal, 2)]
          : 'rgba(0,0,0,.4)',
        opacity: g ? 1 : 0.35,
      };
    });
  const perk = app.perk();
  const bs = st.bs;

  /* Heart containers are per class, so the hero card is where they belong:
     you are already choosing a class there, and the card is the only place the
     two numbers that matter - this hero's pool and what one more costs - sit
     side by side. The duel flow borrows these cards but fights at a fixed
     duel HP, so the upgrade row stays hidden there. */
  const pieces = st.profile.heartPieces;
  const heroCards = Object.keys(HERO_PERKS).map((k: any) => {
    const p = PERKS[k]!;
    const on = st.heroClass === k;
    const containers = heartsFor(st.profile.hearts, k);
    const capped = containers >= MAX_HEART_CONTAINERS;
    const affordable = pieces >= HEART_PIECES_PER_CONTAINER;
    const canUp = !capped && affordable && !st.heartUpgrading;
    return {
      name: k,
      img: p.img,
      perkLine: p.line,
      pick: app.pickHero(k),
      bd: on ? '#FFF2B0' : '#213854',
      bg: on ? '#1D2956' : '#182238',
      tick: on ? '+' : '',
      tickBg: on ? '#FCE370' : 'transparent',
      hpLabel: 'HP ' + maxHpFor(containers),
      heartsLabel: containers + '/' + MAX_HEART_CONTAINERS,
      // Only the selected class shows a button, so there is never a question
      // about which hero an upgrade would land on.
      upgradeDisplay: on && st.flow !== 'duel' ? 'flex' : 'none',
      upgradeLabel: capped
        ? 'FULL HEALTH'
        : st.heartUpgrading
          ? 'UPGRADING...'
          : affordable
            ? '+' + HP_PER_HEART_CONTAINER + ' MAX HP'
            : HEART_PIECES_PER_CONTAINER - pieces === 1
              ? 'NEED 1 MORE PIECE'
              : 'NEED ' +
                (HEART_PIECES_PER_CONTAINER - pieces) +
                ' MORE PIECES',
      // A dead handler rather than a live one that the server would refuse.
      upgradeRun: canUp ? app.upgradeHp(k) : null,
      upgradeBg: canUp ? BTN.tertiary.bg : BTN.disabled.bg,
      upgradeShadow: canUp ? BTN.tertiary.shadow : BTN.disabled.shadow,
      upgradeCursor: canUp ? 'pointer' : 'default',
      upgradeOpacity: canUp ? 1 : 0.65,
      upgradeCost: capped ? '' : HEART_PIECES_PER_CONTAINER + ' PIECES',
    };
  });

  const counts: Record<string, number> = { attack: 0, block: 0, effect: 0 };
  st.picked.forEach((p: string) => {
    const g = GEAR.find((x: any) => x.id === p);
    if (g) counts[g.effect] = (counts[g.effect] ?? 0) + 1;
  });

  const tabs = (['attack', 'block', 'effect'] as const).map((eff) => ({
    label: EFFECT_LABEL[eff],
    count: counts[eff] + '/2',
    pick: app.pickTab(eff),
    bg: st.tab === eff ? '#FCE370' : 'transparent',
    fg: st.tab === eff ? '#000000' : 'rgba(255,255,255,.6)',
  }));

  const slots = [0, 1, 2, 3, 4].map((i) => {
    const id = st.picked[i];
    const g = id ? GEAR.find((x) => x.id === id) : null;
    let ordinal = 0;
    if (g)
      for (let k = 0; k < i; k++) {
        const p = GEAR.find((x) => x.id === st.picked[k]);
        if (p && p.effect === g.effect) ordinal++;
      }
    return {
      icon: g ? getGearImageUrl(g.id) || EFFECT_ICON[g.effect] : '',
      typeIcon: g ? EFFECT_ICON[g.effect] : '',
      bg: g ? EFFECT_TINTS[g.effect]![Math.min(ordinal, 2)] : 'rgba(0,0,0,.5)',
      bd: g ? '#485E9C' : 'transparent',
      iconOpacity: g ? 1 : 0,
      emptyOpacity: g ? 0 : 1,
      cursor: g ? 'pointer' : 'default',
      infoDisplay: g ? 'flex' : 'none',
      ring: g && st.lastGear === g.id ? '0 0 0 2px #FCE370' : 'none',
      inspect: g ? app.selectGear(g.id) : null,
      clear: g ? app.clearSlot(g.id) : null,
    };
  });

  /* One row per rider carried by gear in the OPEN tab, so the tradeoff the tab
       presents is spelled out where the choice is being made. */
  const riderRows = GEAR.filter(
    (g) => g.cls === st.heroClass && g.effect === st.tab
  )
    .map((g) => ({ g, rd: riderOf(g.id) }))
    .filter((x) => x.rd)
    .map(({ g, rd }) => {
      const R = RID[rd!.r]!;
      return {
        color: R.color,
        tag: R.label,
        icon: R.icon,
        gear: g.name.replace(/^(Warrior|Archer|Mage) /, '') + ':',
        text: 'link ' + rd!.at + '+ to ' + R.verb(rd!.v),
      };
    });

  const SLOT_ORDER = ['Weapon', 'Off-Hand', 'Chest', 'Hat', 'Necklace'];
  const gearCards = GEAR.filter(
    (g) => g.cls === st.heroClass && g.effect === st.tab
  )
    // The HEAL tab now holds three slots, so group by slot then rarity rather
    // than leaving Chest/Hat/Necklace interleaved.
    .sort(
      (a, b) =>
        SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) ||
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    )
    .map((g) => {
      const rd = riderOf(g.id);
      const ownedN = st.profile.gear[g.id] || 0;
      const on = st.picked.indexOf(g.id) >= 0;
      let ordinal = 0;
      if (on) {
        const at = st.picked.indexOf(g.id);
        for (let k = 0; k < at; k++) {
          const p = GEAR.find((x) => x.id === st.picked[k]);
          if (p && p.effect === g.effect) ordinal++;
        }
      }
      const sameEffect = st.picked
        .map((p: string) => GEAR.find((x) => x.id === p))
        .filter((x: any) => x && x.effect === g.effect).length;
      // Unowned gear stays on the shelf but cannot be equipped - the pack is the
      // only way in, which is what makes the collection matter.
      const locked = ownedN <= 0;
      const blocked =
        (locked && !on) || (!on && (st.picked.length >= 5 || sameEffect >= 2));
      return {
        name: g.name,
        power: g.power,
        icon: getGearImageUrl(g.id) || EFFECT_ICON[g.effect],
        color: EFFECT_COLOR[g.effect],
        typeIcon: EFFECT_ICON[g.effect],
        rarityColor: locked ? '#304A69' : RARITY_OUTLINE[g.rarity],
        levelName: locked
          ? 'LOCKED'
          : g.rarity === 'Legendary'
            ? 'LEGEND'
            : g.rarity.toUpperCase(),
        lockFilter: locked ? 'grayscale(1) brightness(.5)' : 'none',
        tick: on ? 'X' : '',
        tickOpacity: on ? 1 : 0,
        cursor: blocked ? 'not-allowed' : 'pointer',
        label: EFFECT_LABEL[g.effect],
        inspect: app.inspectGear(g.id),
        infoBg: st.peek === g.id ? '#AEE45D' : '#FCE370',
        riderDisplay: rd && !locked ? 'flex' : 'none',
        riderColor: rd ? RID[rd.r]!.color : 'transparent',
        riderTag: rd ? RID[rd.r]!.label + ' ' + rd.at + '+' : '',
        base: magnitudeFor(g.power, 3, app.mflags()),
        bd: on ? '#FFF2B0' : locked ? '#304A69' : RARITY_OUTLINE[g.rarity],
        opacity: locked ? 0.5 : blocked ? 0.4 : 1,
        // An EQUIPPED card must always be removable, even if it is not owned -
        // gating removal too can deadlock the picker when a save predates a card.
        toggle: locked && !on ? null : app.toggleGear(g.id),
      };
    });

  let battle = {};
  if (bs) {
    /* The kill advances bs.wave immediately, but the fallen monster stays on
         screen through the death beat - so EVERYTHING the HUD shows is derived
         from this one held wave, not from bs.wave. */
    const showWave =
      st.monPhase === 'dying' && st.dying ? Math.max(1, bs.wave - 1) : bs.wave;
    const enemy = app.enemyAt(null, showWave);
    const disp = app.waveDisplay(showWave);
    const sxNow = Object.assign({}, NO_STATUS, bs.stx || {});
    // Frost stalls the meter, so the telegraph must not claim an imminent swing.
    const intent =
      sxNow.frost > 0 ? 'charge' : app.intentFor(enemy, bs.meter, bs.waveHits);
    const notches = [];
    for (let i = 0; i < enemy.period; i++) {
      notches.push({
        fill:
          i < bs.meter
            ? '#FFF2B0'
            : i === enemy.period - 1
              ? '#7A3038'
              : '#213854',
      });
    }
    const ftueHint = app.ftueHint();
    const dragging = st.ftueStep === 'drag' && ftueHint !== null;
    const cells = bs.board.map((v: number, i: number) => {
      const type = orbTypeOf(v);
      const orb = (loadout[type] || loadout[0])!;
      let ordinal = 0;
      for (let k = 0; k < type; k++)
        if (loadout[k] && loadout[k]!.effect === orb.effect) ordinal++;
      const inChain = st.chain.indexOf(i);
      const sup = isSuper(v);
      const fell = st.drop ? st.drop.dist[i] || 0 : 0;
      const suffix = st.drop && st.drop.gen % 2 === 0 ? 'B' : 'A';
      let anim = 'none';
      let ring = 'none';
      if (st.clearing.indexOf(i) >= 0) anim = 'glClear 420ms ease-in forwards';
      else if (st.arming.indexOf(i) >= 0) anim = 'glArm 360ms ease-in forwards';
      else if (st.detonating.indexOf(i) >= 0) {
        anim = 'glDetonate 460ms ease-out forwards';
        ring = 'glShock 460ms ease-out forwards';
      } else if (st.blasting.indexOf(i) >= 0)
        anim = 'glBlast 460ms ease-in forwards';
      else if (st.rejecting.indexOf(i) >= 0)
        anim = 'glReject 300ms ease-in-out';
      else if (st.drop && st.drop.spawn === i)
        anim = 'glSpawn' + suffix + ' 520ms ease-out forwards';
      else if (fell > 0)
        anim =
          'glDrop' +
          suffix +
          Math.min(fell, 5) +
          ' ' +
          (150 + fell * 55) +
          'ms linear';
      else if (sup) anim = 'glSuper 1.4s ease-in-out infinite';
      const isHint = dragging && ftueHint.indexOf(i) >= 0;
      return {
        i,
        bg: EFFECT_TINTS[orb.effect]![Math.min(ordinal, 2)],
        icon: sup
          ? BOMB_ICON
          : getGearImageUrl(orb.id) || EFFECT_ICON[orb.effect],
        bd: inChain >= 0 ? '#FFFFFF' : isHint ? '#FFF2B0' : 'rgba(0,0,0,.3)',
        scale: inChain >= 0 ? 'scale(.93)' : 'none',
        order: inChain >= 0 ? String(inChain + 1) : '',
        z:
          st.detonating.indexOf(i) >= 0 || st.arming.indexOf(i) >= 0
            ? 5
            : st.clearing.indexOf(i) >= 0 || st.blasting.indexOf(i) >= 0
              ? 3
              : isHint
                ? 4
                : 1,
        ring,
        ringOpacity: ring === 'none' ? 0 : 1,
        cellOpacity: dragging && !isHint ? 0.35 : 1,
        hintAnim: isHint ? 'glHint 1.1s ease-in-out infinite' : 'none',
        hintOpacity: isHint ? 1 : 0,
        anim,
      };
    });
    const pts = st.chain
      .map((i: number) => {
        const x = ((colOf(i) + 0.5) / GRID_COLS) * 100;
        const y = ((rowOf(i) + 0.5) / GRID_ROWS) * 100;
        return x + ',' + y;
      })
      .join(' ');

    battle = {
      waveNo: showWave,
      /* A battle is 3-5 waves now, so the HUD says how far through it is -
         "WAVE 3/4" is the pacing the whole mode is built on. */
      waveOf: app.waveCount(),
      waveLabel: 'WAVE ' + showWave + '/' + app.waveCount(),
      locationName: app.locationName(),
      isBossWave: app.isBossWave(showWave),
      bossFlagDisplay: app.isBossWave(showWave) ? 'flex' : 'none',
      bossFlagLabel: app.isKingWave(showWave) ? 'THE KING' : 'ELITE',
      scoreLabel: 'SCORE',
      score: app.scoreOf(bs).toLocaleString(),
      turns: bs.turnsUsed,
      bgUrl: st.monPhase === 'dying' && st.dying ? st.dying.bg : disp.bg,
      monsterUrl: st.monPhase === 'dying' && st.dying ? st.dying.url : disp.url,
      monsterName:
        st.monPhase === 'dying' && st.dying ? st.dying.name : disp.name,
      monsterOpacity: st.monPhase === 'empty' ? 0 : 1,
      monsterAnim:
        st.monPhase === 'dying'
          ? 'glDie 700ms ease-in forwards'
          : st.monPhase === 'spawning'
            ? 'glSpawnIn 460ms ease-out both'
            : st.swing === 'attack' || st.swing === 'heavy'
              ? 'glWindUp 600ms ease-in both'
              : st.swing === 'landed'
                ? 'glStrike 520ms ease-out both'
                : st.hitWho === 'monster'
                  ? 'glHit .3s ease'
                  : intent === 'charge'
                    ? 'none'
                    : 'glLoom 1200ms ease-in-out infinite',
      intentAnim:
        intent === 'charge'
          ? 'none'
          : 'glIntentPulse 700ms ease-in-out infinite',
      telegraphColor:
        intent === 'heavy' ? 'rgba(255,194,75,.55)' : 'rgba(226,86,74,.5)',
      telegraphAnim:
        intent === 'charge'
          ? 'none'
          : 'glTelegraph 1400ms ease-in-out infinite',
      telegraphOpacity: intent === 'charge' ? 0 : 1,
      playerAnim: st.hitWho === 'player' ? 'glHit .3s ease' : 'none',
      affixLabel: enemy.affix === 'none' ? '' : enemy.affix.toUpperCase(),
      affixColor: AFFIX_TINT[enemy.affix] || '#9DB4D4',
      affixBd: (AFFIX_TINT[enemy.affix] || '#9DB4D4') + '66',
      affixBg: (AFFIX_TINT[enemy.affix] || '#9DB4D4') + '1A',
      affixOpacity: enemy.affix === 'none' ? 0 : 1,
      enemyHp: Math.max(0, bs.enemyHp),
      enemyMaxHp: enemy.hp,
      enemyStr: enemy.strength,
      enemyHpShown: Math.max(0, st.hpShown == null ? bs.enemyHp : st.hpShown),
      enemyHpAnim:
        st.hitWho === 'monster' ? 'glHpFlash 400ms ease-out' : 'none',
      enemyBarAnim:
        st.hitWho === 'monster' ? 'glBarHit 400ms ease-out' : 'none',
      // Alternating names so a repeat hit restarts the stroke rather than
      // being swallowed as "same animation already running".
      slashDisplay: st.hitWho === 'monster' ? 'flex' : 'none',
      slashAnimA:
        st.hitWho === 'monster'
          ? 'glSlash' +
            ((st.slashGen || 0) % 2 ? 'A' : 'B') +
            ' 340ms ease-out both'
          : 'none',
      slashAnimB:
        st.hitWho === 'monster'
          ? 'glSlash' +
            ((st.slashGen || 0) % 2 ? 'B' : 'A') +
            ' 340ms 90ms ease-out both'
          : 'none',
      enemyPct: Math.max(
        0,
        Math.round(
          ((st.hpShown == null ? bs.enemyHp : st.hpShown) / enemy.hp) * 100
        )
      ),
      intentIcon: INTENT_ICON[intent],
      intentLabel:
        intent === 'charge'
          ? 'WINDING UP'
          : intent === 'heavy'
            ? 'HEAVY ' + app.swingStrength(enemy, bs.waveHits)
            : 'HITS ' + enemy.strength,
      intentValue:
        intent === 'charge'
          ? ''
          : String(app.swingStrength(enemy, bs.waveHits)),
      intentColor:
        intent === 'heavy'
          ? '#FFC24B'
          : intent === 'attack'
            ? '#FF9EA1'
            : '#9DB4D4',
      meterNotches: notches,
      playerHp: st.pHpShown == null ? bs.playerHp : st.pHpShown,
      playerMaxHp: app.maxHp(),
      playerPct: Math.max(
        0,
        Math.round(
          ((st.pHpShown == null ? bs.playerHp : st.pHpShown) / app.maxHp()) *
            100
        )
      ),
      intentEnter: app.intentEnter,
      intentLeave: app.intentLeave,
      intentTap: app.intentTap,
      intentTipDisplay: st.hoverStatus === 'intent' ? 'flex' : 'none',
      intentTipName:
        intent === 'charge'
          ? 'WINDING UP'
          : intent === 'heavy'
            ? 'HEAVY ATTACK'
            : 'ATTACK',
      intentTipText: (() => {
        const swing =
          enemy.heavyEvery > 0 && (bs.waveHits + 1) % enemy.heavyEvery === 0
            ? Math.round((enemy.strength * enemy.heavyX100) / 100)
            : enemy.strength;
        const left = Math.max(0, enemy.period - bs.meter);
        if (sxNow.frost > 0)
          return (
            'Frost is holding the charge. It will not advance for ' +
            sxNow.frost +
            ' more turn' +
            (sxNow.frost === 1 ? '' : 's') +
            ', then it swings for ' +
            swing +
            '.'
          );
        if (intent === 'charge')
          return (
            'Charging. It swings in ' +
            left +
            ' turn' +
            (left === 1 ? '' : 's') +
            ', for ' +
            swing +
            '. Raise block or heal before then.'
          );
        if (intent === 'heavy')
          return (
            'Swings THIS turn for ' +
            swing +
            ' - every ' +
            enemy.heavyEvery +
            'th hit from an elite is a heavy. Block only reduces what lands.'
          );
        return (
          'Swings THIS turn for ' +
          swing +
          '. Block soaks that damage and is spent doing it.'
        );
      })(),
      blockLabel: String(bs.block),
      ...(() => {
        /* Block rides in the hero strip as one more icon - same 16px sprite and
             stroked count as Strength and Grit, no boxed counter. */
        const BLOCK_STATUS = {
          label: 'BLOCK',
          icon: '/art/PocketKnights/Battle/Effects/Shield.png',
          blurb:
            "Soaks the enemy's next swing, then is spent on it. Block also resets when a wave dies.",
        };
        const chip = (k: string, def: any, value: number) => ({
          icon: def.icon,
          value,
          name: def.label,
          key: k,
          enter: app.hoverStatus(k),
          leave: app.hoverStatus(null),
          tap: app.toggleStatusTip(k),
        });
        const mon = MONSTER_STATUS.filter((k) => sxNow[k] > 0).map((k) =>
          chip(k, RID[k], sxNow[k])
        );
        const hero = HERO_STATUS.filter((k) => sxNow[k] > 0).map((k) =>
          chip(k, RID[k], sxNow[k])
        );
        hero.unshift(chip('block', BLOCK_STATUS, bs.block));
        const tip = st.hoverStatus;
        const def = tip === 'block' ? BLOCK_STATUS : tip ? RID[tip] : null;
        const onMon = tip && MONSTER_STATUS.indexOf(tip) >= 0;
        return {
          monsterStatuses: mon,
          monsterStatusDisplay: mon.length ? 'flex' : 'none',
          heroStatuses: hero,
          heroStatusDisplay: 'flex',
          monsterTipDisplay: def && onMon ? 'flex' : 'none',
          monsterTipName: def && onMon ? def.label : '',
          monsterTipText: def && onMon ? def.blurb : '',
          heroTipDisplay: def && !onMon ? 'flex' : 'none',
          heroTipName: def && !onMon ? def.label : '',
          heroTipText: def && !onMon ? def.blurb : '',
        };
      })(),
      perkText:
        perk.heroClass.toUpperCase() +
        (perk.attackX100 !== 100
          ? ' +' + (perk.attackX100 - 100) + '% ATK'
          : perk.blockX100 !== 100
            ? ' +' + (perk.blockX100 - 100) + '% BLK'
            : ' +' + (perk.healX100 - 100) + '% HEAL'),
      cells,
      chainPoints: pts,
      lineOpacity: st.chain.length >= 2 ? 1 : 0,
      boardWrapRef: app.boardWrapRef,
      boardW: st.boardW || 340,
      boardH: st.boardH || 283,
      boardAnim: st.kick ? 'glKick 260ms ease-in-out' : 'none',
      pops: (st.pops || []).map((p: any) => ({
        text: p.text,
        color: p.color,
        top: p.top,
        anim: 'glFloat 620ms ease-out forwards',
      })),
      /* One readout for the whole turn: what a link will do, or WHY the board
           is not taking input. Silence during a resolve read as a dead board. */
      ...(() => {
        const sw = st.swing;
        if (sw === 'attack' || sw === 'heavy') {
          return {
            previewText:
              sw === 'heavy'
                ? 'HEAVY BLOW INCOMING'
                : disp.name.toUpperCase() + ' IS STRIKING',
            previewColor: sw === 'heavy' ? '#FFC24B' : '#FF9EA1',
            boardOpacity: 0.45,
          };
        }
        if (sw === 'landed') {
          const dmg: any = st.lastSwing || {};
          return {
            previewText:
              dmg.damage > 0
                ? 'YOU TOOK ' +
                  dmg.damage +
                  (dmg.blocked > 0 ? '  (' + dmg.blocked + ' BLOCKED)' : '')
                : 'YOUR BLOCK HELD',
            previewColor: dmg.damage > 0 ? '#FF9EA1' : '#89BCFF',
            boardOpacity: 0.45,
          };
        }
        if (st.preview)
          return {
            previewText: st.preview.text,
            previewColor: st.preview.color,
            boardOpacity: 1,
          };
        // The three death beats read as one sentence: the kill, then the wait.
        if (st.monPhase === 'dying')
          return {
            previewText: 'WAVE CLEARED',
            previewColor: '#AEE45D',
            boardOpacity: 0.45,
          };
        if (st.monPhase === 'empty' || st.monPhase === 'spawning') {
          return {
            previewText: 'WAVE ' + bs.wave + ' INCOMING...',
            previewColor: '#FFC24B',
            boardOpacity: 0.45,
          };
        }
        if (st.busy)
          return {
            previewText: 'RESOLVING...',
            previewColor: '#9DB4D4',
            boardOpacity: 0.55,
          };
        return {
          previewText: 'DRAG TO LINK 3+',
          previewColor: '#9DB4D4',
          boardOpacity: 1,
        };
      })(),
      boardHint:
        enemy.affix === 'none'
          ? 'Link 6+ to forge a bomb. Tap a bomb to detonate a 3x3.'
          : AFFIX_BLURB[enemy.affix] || '',
    };
  }

  let modalTitle = '',
    modalRows: any[] = [],
    modalActions = [
      {
        label: 'CLOSE',
        run: app.closeModal,
        bg: BTN.secondary.bg,
        shadow: BTN.secondary.shadow,
      },
    ];
  if (st.modal === 'pause') {
    modalTitle = 'PAUSED';
    modalRows = [
      {
        title: 'Wave ' + (bs ? bs.wave : 1),
        detail:
          'Turn ' +
          (bs ? bs.turnsUsed : 0) +
          ', best link ' +
          (bs ? bs.maxChain : 0) +
          '.',
        meta: bs ? app.scoreOf(bs).toLocaleString() : '0',
        metaColor: '#FFC24B',
      },
      {
        title: 'Quitting forfeits the run',
        detail:
          'A ranked entry is spent whether you finish or walk out, and nothing is banked.',
        meta: '',
        metaColor: '#9DB4D4',
      },
    ];
    modalActions = [
      {
        label: 'RESUME',
        run: app.resume,
        bg: BTN.primary.bg,
        shadow: BTN.primary.shadow,
      },
      {
        label: 'HOW TO PLAY',
        run: app.openHow,
        bg: BTN.tertiary.bg,
        shadow: BTN.tertiary.shadow,
      },
      {
        label: 'QUIT RUN',
        run: app.quitRun,
        bg: BTN.disabled.bg,
        shadow: BTN.disabled.shadow,
      },
    ];
  } else if (st.modal === 'how') {
    modalTitle = 'HOW TO PLAY';
    modalRows = [
      {
        title: 'Link the gear',
        detail:
          'Drag through 3 or more touching orbs of the same gear, any direction including diagonals. A 3-link pays the gear\u2019s power, and each extra orb adds a little more.',
        meta: '3+',
        metaColor: '#FFF2B0',
      },
      {
        title: 'Colour is the effect',
        detail:
          'Red attacks, blue raises block, green heals. Two cards of the same type are separate colours and never link together.',
        meta: 'ATK\nBLOCK\nHEAL',
        metaColor: '#9DB4D4',
      },
      {
        title: 'Gear effects',
        detail:
          'Most gear carries an effect that only fires at a longer link. The strongest gear in each slot carries none, so raw power and an effect are a real trade.',
        meta: 'RIDER',
        metaColor: '#FF6BD6',
      },
      {
        title: 'Burn, Mark, Frost',
        detail:
          'On the enemy. Burn ticks its value at the end of every turn, then decays by 1. Mark is consumed by your next attack link: x1.5 at one stack, x1.75 at two, x2.25 at three. Frost stalls the charge meter one turn per stack.',
        meta: 'ENEMY',
        metaColor: '#FF8A3D',
      },
      {
        title: 'Strength and Grit',
        detail:
          'On you, and permanent for the run: Strength adds flat damage to every attack link, Grit adds flat block to every block link. They survive a wave clear, so they compound the deeper you go.',
        meta: 'YOU',
        metaColor: '#FFC24B',
      },
      {
        title: 'Bombs',
        detail:
          'A link of six or more leaves a bomb behind. Tap it to blow a 3x3; a blast that catches another bomb chains into it.',
        meta: '6+',
        metaColor: '#FFC24B',
      },
      {
        title: 'The clock is the enemy',
        detail:
          'Every link is a turn. The notches show how long until it swings. Block absorbs the swing and is spent on it, and resets on a kill.',
        meta: 'PERIOD',
        metaColor: '#FF9EA1',
      },
      {
        title: 'Affixes',
        detail:
          'ARMORED cuts 35% off every link. BRUTE hits 80% harder but winds up a beat longer. SWARM has a much smaller pool. WARDEN caps your block. LEECH halves your heals.',
        meta: 'WAVE\nTWIST',
        metaColor: '#B79CFF',
      },
      {
        title: 'The run ends',
        detail:
          'HP never resets between waves. You die, or the board locks with no legal link and no bomb left.',
        meta: 'ENDLESS',
        metaColor: '#9DB4D4',
      },
    ];
  } else if (st.modal === 'board') {
    modalTitle = st.leaderboard.length ? 'BLACKSMITHS' : 'NO RUNS YET';
    modalRows = st.leaderboard.map((b: any) => ({
      title: b.rank + '. ' + b.username + ' / ' + b.hero,
      detail: b.waves + ' waves cleared, best link ' + b.chain,
      meta: b.score.toLocaleString(),
      metaColor: b.isYou ? '#AEE45D' : b.rank === 1 ? '#FFC24B' : '#9DB4D4',
    }));
  }

  const endBs = bs || {
    wavesCleared: 0,
    maxChain: 0,
    turnsUsed: 0,
    damageDealt: 0,
    waveBonus: 0,
  };

  return {
    /* Wallet figures the shop header and the duel lobby read straight off the
       profile the server sent. */
    coins: st.profile.coins,
    trophies: st.profile.trophies,

    /* ---------- FTUE ---------- */
    ftueOn: st.ftueStep !== null,
    ftueInteractive: !!FTUE_DOING[st.ftueStep],
    ftueScrimOpacity: st.ftueStep !== null && !FTUE_DOING[st.ftueStep] ? 1 : 0,
    ftueTitle: st.ftueStep ? FTUE_COPY[st.ftueStep]!.title : '',
    ftueBody:
      st.ftueStep === 'damage'
        ? st.ftueSample.killed
          ? 'Your link struck for ' +
            st.ftueSample.damage +
            ' and finished the enemy off - its HP bar emptied and the next one is walking in.'
          : 'Your link struck for ' +
            st.ftueSample.damage +
            " and the enemy's HP bar above dropped by that much. Each extra orb in a link adds a little more."
        : st.ftueStep
          ? FTUE_COPY[st.ftueStep]!.body
          : '',
    ftueLegendOpacity: st.ftueStep === 'orbs' ? 1 : 0,
    ftueLegendDisplay: st.ftueStep === 'orbs' ? 'flex' : 'none',
    ftueLegend: (st.ftueStep === 'orbs' ? loadout : []).map((orb, type) => {
      let ord = 0;
      for (let k = 0; k < type; k++)
        if (loadout[k] && loadout[k]!.effect === orb.effect) ord++;
      return {
        tint: EFFECT_TINTS[orb.effect]![Math.min(ord, 2)],
        icon: getGearImageUrl(orb.id) || EFFECT_ICON[orb.effect],
        label: FTUE_LEGEND[orb.effect]!.label,
        blurb: FTUE_LEGEND[orb.effect]!.blurb,
      };
    }),
    ftueDots: FTUE_ORDER.map((s) => ({
      bg: s === st.ftueStep ? '#141D2E' : 'rgba(20,29,46,.25)',
    })),
    ftueNextLabel:
      st.ftueStep === FTUE_ORDER[FTUE_ORDER.length - 1] ? 'FIGHT!' : 'NEXT',
    ftueNextDisplay: FTUE_DOING[st.ftueStep] ? 'none' : 'flex',
    // Hidden until measured, so it never flashes at the wrong offset.
    ftueCardVis: st.ftuePlace ? 'visible' : 'hidden',
    ftueCardTop:
      st.ftuePlace && st.ftuePlace.side === 'below'
        ? st.ftuePlace.offset + 'px'
        : 'auto',
    ftueCardBottom:
      st.ftuePlace && st.ftuePlace.side === 'above'
        ? st.ftuePlace.offset + 'px'
        : 'auto',
    ftueArrowUp: st.ftuePlace && st.ftuePlace.side === 'below' ? 1 : 0,
    ftueArrowDown: st.ftuePlace && st.ftuePlace.side === 'above' ? 1 : 0,
    // Scrim as four panels around the spotlit element, so the target stays
    // bright without fighting the arena's nested stacking contexts.
    ftueScrim:
      st.ftuePlace && !FTUE_DOING[st.ftueStep]
        ? (() => {
            const h = st.ftuePlace.hole,
              pad = 6;
            const t = Math.max(0, h.top - pad),
              l = Math.max(0, h.left - pad);
            const b = h.top + h.h + pad,
              r = h.left + h.w + pad;
            return [
              {
                top: '0px',
                left: '0px',
                right: '0px',
                height: t + 'px',
                width: 'auto',
              },
              {
                top: b + 'px',
                left: '0px',
                right: '0px',
                height: 'auto',
                width: 'auto',
                bottom: '0px',
              },
              {
                top: t + 'px',
                left: '0px',
                right: 'auto',
                height: b - t + 'px',
                width: l + 'px',
              },
              {
                top: t + 'px',
                left: r + 'px',
                right: '0px',
                height: b - t + 'px',
                width: 'auto',
              },
            ];
          })()
        : [],
    ftueRingTop: st.ftuePlace ? st.ftuePlace.hole.top - 6 + 'px' : '0px',
    ftueRingLeft: st.ftuePlace ? st.ftuePlace.hole.left - 6 + 'px' : '0px',
    ftueRingW: st.ftuePlace ? st.ftuePlace.hole.w + 12 + 'px' : '0px',
    ftueRingH: st.ftuePlace ? st.ftuePlace.hole.h + 12 + 'px' : '0px',
    ftueRingOpacity:
      st.ftuePlace && st.ftueStep && st.ftueStep !== 'drag' ? 1 : 0,
    ftueRingColor: FTUE_DOING[st.ftueStep] ? '#AEE45D' : '#FFF2B0',
    setFtueRoot: app.setFtueRoot,
    setFtueBoard: app.setFtueBoard,
    setFtueEnemy: app.setFtueEnemy,
    setFtueTrack: app.setFtueTrack,
    setFtueCard: app.setFtueCard,
    setFtueMap: app.setFtueMap,
    setFtueHero: app.setFtueHero,
    setFtueGear: app.setFtueGear,
    setFtueSlots: app.setFtueSlots,
    advanceFtue: app.advanceFtue,
    endFtue: app.endFtue,
    gearlinkIcon: GEARLINK_ICON,
    /* ---------- DUEL ---------- */
    isDuelLobby: st.phase === 'duelLobby',
    isDuel: st.phase === 'duel',
    // Both boards need this, and the ranked view model only exists when a wave
    // does - so it belongs at the top level, not inside `battle`.
    boardWrapRef: app.boardWrapRef,
    goHome: app.goStep('home'),
    goDuelLobby: app.goDuelLobby,
    leaveDuel: app.leaveDuel,
    duelAgain: app.duelAgain,

    /* ---------- the ladder ---------- */
    leagueName: myLeague.name.toUpperCase(),
    leagueColor: myLeague.color,
    leagueShade: myLeague.shade,
    /* The rank sprite, same art the challenge post and Neura Knights use. */
    leagueIcon: myLeague.icon,
    leagueNumeral: myLeague.numeral,
    leagueNumeralDisplay: myLeague.numeral ? 'block' : 'none',
    /* One pip per level, so Bronze 2 reads as the middle rung of its tier at a
       glance. Knight is a single rung and so shows one lit pip. */
    leaguePips: (myLeague.level === 0 ? [1] : [1, 2, 3]).map((n) => ({
      bg:
        myLeague.level === 0 || n <= myLeague.level
          ? myLeague.color
          : 'rgba(255,255,255,.18)',
    })),
    leaguePct: Math.round(leagueProgress(st.profile.trophies) * 100) + '%',
    leagueNextName: upLeague
      ? upLeague.name.toUpperCase()
      : 'TOP OF THE LADDER',
    leagueNextLine:
      toNext === null
        ? 'Knight is the last rung. Everything above it is defending it.'
        : toNext + ' more trophies to ' + upLeague!.name + '.',

    /* ---------- duel setup coaching ---------- */
    duelSetupDisplay:
      st.duelSetup !== null && DUEL_SETUP_PHASE[st.duelSetup] === st.phase
        ? 'flex'
        : 'none',
    duelSetupTitle:
      st.duelSetup === null
        ? ''
        : (DUEL_SETUP_STEPS[st.duelSetup]?.title ?? ''),
    duelSetupBody:
      st.duelSetup === null ? '' : (DUEL_SETUP_STEPS[st.duelSetup]?.body ?? ''),
    duelSetupDots: DUEL_SETUP_STEPS.map((_, i) => ({
      bg: i === st.duelSetup ? '#FCE370' : 'rgba(255,255,255,.22)',
    })),
    /* The last step IS the opt-in, and that is a real choice - so it has no
       Next to press past it with. */
    duelSetupNextDisplay:
      st.duelSetup !== null && st.duelSetup < DUEL_SETUP_STEPS.length - 1
        ? 'flex'
        : 'none',
    nextDuelSetup: app.nextDuelSetup,
    skipDuelSetup: app.skipDuelSetup,

    /* ---------- opt-in ---------- */
    isDuelOptIn: st.phase === 'duelOptIn',
    duelOptInCls: st.heroClass.toUpperCase(),
    duelOptInImg: (PERKS[st.heroClass] || PERKS['Hero']!).img,
    duelOptInPerk: (PERKS[st.heroClass] || PERKS['Hero']!).line,
    duelOptInSlots: duelSlotTiles(st.picked),
    duelOptInBusy: st.duelSaving ? 0.5 : 1,
    listAndShare: app.listAndShare,
    saveUnlisted: app.saveUnlisted,
    backToDuelGear: app.goStep('gear'),

    /* ---------- lobby ---------- */
    duelListed: !!st.profile.duelListed,
    duelListedLabel: st.profile.duelListed ? 'LISTED' : 'NOT LISTED',
    duelListedColor: st.profile.duelListed ? '#AEE45D' : '#9DB4D4',
    duelListedLine: st.profile.duelListed
      ? 'Other duellists near your trophies can draw you as an opponent.'
      : 'You are hidden from other lobbies. You can still duel anyone here.',
    duelListedToggleLabel: st.profile.duelListed ? 'GO PRIVATE' : 'LIST ME',
    toggleListed: app.toggleListed,
    postChallenge: app.postChallenge,
    openChallenge: app.openChallenge,
    challengeDisplay: st.challengeUrl ? 'flex' : 'none',
    shareDisplay: st.profile.duelListed ? 'flex' : 'none',
    editDuelLoadout: app.enterDuelSetup,
    leaveDuelSetup: app.leaveDuelSetup,
    myDuelCls: (st.profile.duelCls ?? st.heroClass).toUpperCase(),
    myDuelImg: (PERKS[st.profile.duelCls ?? st.heroClass] || PERKS['Hero']!)
      .img,
    myDuelSlots: duelSlotTiles(st.profile.duelPicked ?? []),

    refreshOpponents: app.refreshOpponents,
    refreshOpacity: st.duelLoading ? 0.5 : 1,
    duelPaddedDisplay: st.duelPadded ? 'block' : 'none',
    duelListEmptyDisplay:
      st.duelLoading && !st.duelOpponents.length ? 'block' : 'none',
    /* Reddit handles and snoovatars, not the game's class art: the row has to
       read as a PERSON you are challenging. Class art is the fallback for the
       house bots, which have no Reddit account behind them. */
    duelFoes: (st.duelOpponents as any[]).map((f) => {
      const lg = leagueOf(f.rating);
      return {
        name: f.kind === 'player' ? 'u/' + f.name : f.name,
        blurb: f.blurb,
        rating: f.rating,
        cls: f.cls.toUpperCase(),
        img: f.avatar || (PERKS[f.cls] || PERKS['Hero']!).img,
        avatarFit: f.avatar ? 'cover' : 'contain',
        badge: lg.name.toUpperCase(),
        badgeColor: lg.color,
        badgeBg: lg.shade,
        tagDisplay: f.kind === 'bot' ? 'flex' : 'none',
        perk: (PERKS[f.cls] || PERKS['Hero']!).line,
        run: app.startDuel(f),
      };
    }),
    duelRules: [
      {
        k: 'ATTACK',
        t: 'Your attack links hit their HP directly. There is no monster between you.',
      },
      {
        k: 'SABOTAGE',
        t:
          'Any link of ' +
          DUEL_JUNK_MIN_LINK +
          '+ dumps junk orbs into their grid. Junk cannot be linked.',
      },
      {
        k: 'DIG OUT',
        t: 'Junk is armoured. Only an orthogonal clear cracks it, and it takes two - or one bomb straight through.',
      },
      {
        k: 'BURIED',
        t: 'Run out of legal links and you lose on the spot. Junk lands nearest the column your foe ended their link in.',
      },
      {
        k: 'NO TURNS',
        t:
          'You both link on the same ' +
          DUEL_MATCH_SECONDS / 60 +
          '-minute clock, at once. On time, higher HP wins.',
      },
    ],
    ...(() => {
      const d = st.duel;
      if (!d) {
        return {
          duelMyHp: 0,
          duelMyPct: 0,
          duelFoeHp: 0,
          duelFoePct: 0,
          duelCells: [],
          duelFoeCells: [],
          duelClockLabel: '',
          duelTurnLabel: '',
          duelTurnColor: '#9DB4D4',
          duelLogRows: [],
          duelLogTop: [],
          duelClockColor: '#FFF2B0',
          duelClockPct: 100,
          // The duel's own floats ride on `pops`, which the arena screen reads;
          // `battle` is empty outside a gauntlet run, so nothing clobbers them.
          pops: [],
          duelFoePops: [],
          foeBannerColor: '#8A9BBF',
          foeBannerBg: '#141D2E',
          foeBannerText: '',
          foeBannerSub: '',
          foeBannerAnim: 'none',
          foeAvatarAnim: 'none',
          foeHitDisplay: 'none',
          foeHitLabel: '',
          foeJunkDisplay: 'none',
          foeJunkLabel: '',
          foeJunkAnim: 'none',
          attackIcon: INTENT_ICON.attack,
          junkIcon: JUNK_ICON,
          blockIcon: EFFECT_ICON.block,
          duelMiniCell: '13px',
          duelFtueDisplay: 'none',
          duelFtueTitle: '',
          duelFtueBody: '',
          duelFtueNext: 'NEXT',
          duelFtueDots: [],
          nextDuelFtue: app.nextDuelFtue,
          skipDuelFtue: app.skipDuelFtue,
          duelRematchDisplay: 'flex',
          duelLobbyLabel: 'LOBBY',
          duelFoeName: '',
          duelFoeNameUpper: '',
          duelFoeImg: '',
          duelMyImg: '',
          duelMyBlock: 0,
          duelFoeBlock: 0,
          duelMyStatuses: [],
          duelFoeStatuses: [],
          duelPreview: '',
          duelPreviewColor: '#9DB4D4',
          duelChainPoints: '',
          duelLineOpacity: 0,
          duelBoardW: 300,
          duelBoardH: 250,
          foeWrapRef: app.foeWrapRef,
          duelArenaRef: app.duelArenaRef,
          duelFoePanelDisplay: 'none',
          duelFoePanelFlex: '0 0 auto',
          duelFoeWrapFlex: '0 0 0px',
          duelFoeMiniDisplay: 'none',
          duelFoeMiniCells: [],
          duelMyShake: 'none',
          duelFoeShake: 'none',
          duelJunkMine: 0,
          duelJunkTheirs: 0,
          duelOverDisplay: 'none',
          duelOverTitle: '',
          duelOverBody: '',
          duelOverDelta: '',
          duelOverColor: '#FFF2B0',
        };
      }
      const mm = Math.floor(st.duelClock / 60),
        ss = st.duelClock % 60;
      const fname = ((st.duelFoe || {}).name || 'Foe').toUpperCase();
      const stat = (side: 'me' | 'foe') => {
        const sx = Object.assign({}, NO_STATUS, d[side].stx);
        return ['burn', 'mark', 'frost', 'strength', 'grit']
          .filter((k) => sx[k] > 0)
          .map((k: string) => ({
            icon: RID[k]!.icon,
            value: sx[k],
            color: RID[k]!.color,
          }));
      };
      const junkCount = (b: number[]) => b.filter(isJunk).length;
      const mine = d.me.board,
        theirs = d.foe.board;
      const cellFor = (
        v: number,
        i: number,
        loadout: any[],
        chainIdx: number
      ) => {
        const junk = isJunk(v);
        const sup = isSuper(v);
        const type = orbTypeOf(v);
        const orb = (loadout[type] || loadout[0])!;
        let ord = 0;
        for (let k = 0; k < type; k++)
          if (loadout[k] && loadout[k]!.effect === orb.effect) ord++;
        const jd = junk ? junkDamage(v) : 0;
        return {
          i,
          bg: junk
            ? jd > 0
              ? '#6A7387'
              : '#3E4657'
            : EFFECT_TINTS[orb.effect]![Math.min(ord, 2)],
          crackDisplay: jd > 0 ? 'block' : 'none',
          icon: junk
            ? JUNK_ICON
            : sup
              ? BOMB_ICON
              : getGearImageUrl(orb.id) || EFFECT_ICON[orb.effect],
          bd: chainIdx >= 0 ? '#FFFFFF' : junk ? '#20262F' : 'rgba(0,0,0,.3)',
          scale: chainIdx >= 0 ? 'scale(.93)' : 'none',
          order: chainIdx >= 0 ? String(chainIdx + 1) : '',
          opacity: junk ? (jd > 0 ? 0.7 : 0.85) : 1,
        };
      };
      const drop = st.drop;
      const suffix = drop && drop.gen % 2 === 0 ? 'B' : 'A';
      const fDrop = st.foeDrop;
      const fSuffix = fDrop && fDrop.gen % 2 === 0 ? 'B' : 'A';
      const fChain = st.foeChain || [],
        fClear = st.foeClearing || [];
      /* Their grid animates like yours - drop, clear, spawn - so a move you
           are not making is still legible as a move. */
      const foeCell = (v: number, i: number): any => {
        const idx = fChain.indexOf(i);
        const c: any = cellFor(v, i, d.foe.loadout, idx);
        const fell = fDrop ? fDrop.dist[i] || 0 : 0;
        c.anim =
          fClear.indexOf(i) >= 0
            ? 'glClear 460ms ease-in forwards'
            : fDrop && fDrop.spawn === i
              ? 'glSpawn' + fSuffix + ' 520ms ease-out forwards'
              : fell > 0
                ? 'glDrop' +
                  fSuffix +
                  Math.min(fell, 5) +
                  ' ' +
                  (150 + fell * 55) +
                  'ms linear'
                : idx >= 0
                  ? 'glHint 700ms ease-in-out infinite'
                  : isSuper(v)
                    ? 'glSuper 1.4s ease-in-out infinite'
                    : 'none';
        return c;
      };
      const duelCells = mine.map((v: number, i: number) => {
        const idx = st.chain.indexOf(i);
        const c: any = cellFor(v, i, d.me.loadout, idx);
        const fell = drop ? drop.dist[i] || 0 : 0;
        c.anim =
          st.clearing.indexOf(i) >= 0
            ? 'glClear 420ms ease-in forwards'
            : st.rejecting.indexOf(i) >= 0
              ? 'glReject 300ms ease-in-out'
              : drop && drop.spawn === i
                ? 'glSpawn' + suffix + ' 520ms ease-out forwards'
                : fell > 0
                  ? 'glDrop' +
                    suffix +
                    Math.min(fell, 5) +
                    ' ' +
                    (150 + fell * 55) +
                    'ms linear'
                  : isSuper(v)
                    ? 'glSuper 1.4s ease-in-out infinite'
                    : 'none';
        return c;
      });
      const pts = st.chain
        .map((i: number) => {
          const x = ((colOf(i) + 0.5) / GRID_COLS) * 100;
          const y = ((rowOf(i) + 0.5) / GRID_ROWS) * 100;
          return x + ',' + y;
        })
        .join(' ');
      const out = st.duelOutcome;
      return {
        duelFoeName: (st.duelFoe || {}).name || '',
        duelFoeNameUpper: fname,
        /* The arena keeps the face the lobby showed: a snoovatar when you are
           duelling a real account's loadout, class art for a house bot. */
        duelFoeImg:
          (st.duelFoe || {}).avatar || (PERKS[d.foe.cls] || PERKS['Hero']!).img,
        duelMyImg: (PERKS[d.me.cls] || PERKS['Hero']!).img,
        duelMyHp: d.me.hp,
        duelFoeHp: d.foe.hp,
        duelMyPct: Math.round((d.me.hp / DUEL_HP) * 100),
        duelFoePct: Math.round((d.foe.hp / DUEL_HP) * 100),
        duelMyBlock: d.me.block,
        duelFoeBlock: d.foe.block,
        duelMyStatuses: stat('me'),
        duelFoeStatuses: stat('foe'),
        duelJunkMine: junkCount(mine),
        duelJunkTheirs: junkCount(theirs),
        duelClockLabel: mm + ':' + (ss < 10 ? '0' + ss : ss),
        duelClockColor: st.duelClock <= 30 ? '#FF9EA1' : '#FFF2B0',
        duelClockPct: Math.round((st.duelClock / DUEL_MATCH_SECONDS) * 100),
        // The status line narrates the FOE, since the player narrates itself
        // by dragging. Thinking is stated so a pause never reads as a freeze.
        ...(() => {
          const beat = st.duelOutcome ? 'over' : st.foeBeat || 'thinking';
          const linking = beat === 'linking';
          const striking = beat === 'clearing' || beat === 'landed';
          const colour =
            beat === 'over'
              ? '#9DB4D4'
              : linking
                ? '#FFC24B'
                : striking
                  ? '#FF9EA1'
                  : '#8A9BBF';
          return {
            foeBannerColor: colour,
            foeBannerBg: linking
              ? 'rgba(255,194,75,.14)'
              : striking
                ? 'rgba(209,65,65,.2)'
                : '#141D2E',
            foeBannerText:
              beat === 'over'
                ? 'MATCH OVER'
                : linking
                  ? fname + ' IS LINKING'
                  : striking
                    ? fname + ' STRIKES'
                    : fname + ' IS THINKING',
            foeBannerSub:
              beat === 'over'
                ? ''
                : linking
                  ? (st.foeSaid || '').toUpperCase()
                  : striking
                    ? 'INCOMING'
                    : 'WATCH THEIR BOARD',
            // A new animation string on every beat change is what restarts it.
            foeBannerAnim: linking
              ? 'glPop 260ms ease-out'
              : striking
                ? 'glHit .3s ease'
                : 'none',
            foeAvatarAnim: linking
              ? 'glBounce 700ms ease-in-out infinite'
              : striking
                ? 'glHit .3s ease'
                : 'none',
            foeHitDisplay:
              striking && (st.foeHitFor || 0) > 0 ? 'flex' : 'none',
            foeHitLabel: '-' + (st.foeHitFor || 0),
            foeJunkDisplay:
              (linking || striking) && (st.foeJunk || 0) > 0 ? 'flex' : 'none',
            foeJunkLabel: '+' + (st.foeJunk || 0),
            foeJunkAnim: linking ? 'glHint 700ms ease-in-out infinite' : 'none',
            attackIcon: INTENT_ICON.attack,
            junkIcon: JUNK_ICON,
            blockIcon: EFFECT_ICON.block,
            // Their grid sized off YOUR cell, so the two boards read as a pair
            // rather than a board and a legend.
            duelMiniCell: (st.duelMini || 18) + 'px',
          };
        })(),
        duelTurnLabel: st.duelOutcome
          ? 'MATCH OVER'
          : st.foeBeat === 'linking' || st.foeBeat === 'clearing'
            ? st.foeSaid || fname + ' IS LINKING'
            : st.foeBeat === 'landed'
              ? st.foeSaid || fname + ' STRUCK'
              : fname + ' IS THINKING...',
        duelTurnColor: st.duelOutcome
          ? '#9DB4D4'
          : st.foeBeat === 'linking'
            ? '#FFC24B'
            : st.foeBeat === 'clearing' || st.foeBeat === 'landed'
              ? '#FF9EA1'
              : '#8A9BBF',
        duelLogRows: (st.duelLog || []).map((t: string, i: number) => ({
          text: t,
          opacity: i === 0 ? 1 : 0.5,
        })),
        duelLogTop: (st.duelLog || [])
          .slice(0, 1)
          .map((t: string) => ({ text: t })),
        duelCells,
        duelFoeCells: theirs.map(foeCell),
        duelChainPoints: pts,
        duelLineOpacity: st.chain.length >= 2 ? 1 : 0,
        duelPreview: st.preview
          ? st.preview.text
          : st.busy
            ? 'RESOLVING...'
            : 'DRAG TO LINK 3+  -  NO TURNS, LINK ANY TIME',
        duelPreviewColor: st.preview
          ? st.preview.color
          : st.busy
            ? '#FFC24B'
            : '#9DB4D4',
        pops: st.pops || [],
        duelFoePops: st.foePops || [],
        // Both bars on ONE row at every size, opponent left. Equal halves, so
        // the two are the same length and comparable at a glance.
        duelFtueDisplay:
          st.duelFtue === null || st.duelFtue === undefined ? 'none' : 'flex',
        duelFtueTitle: DUEL_FTUE_STEPS[st.duelFtue || 0]!.title,
        duelFtueBody: DUEL_FTUE_STEPS[st.duelFtue || 0]!.body,
        duelFtueNext:
          (st.duelFtue || 0) + 1 >= DUEL_FTUE_STEPS.length ? 'FIGHT!' : 'NEXT',
        duelFtueDots: DUEL_FTUE_STEPS.map((_: unknown, i: number) => ({
          bg: i === (st.duelFtue || 0) ? '#141D2E' : 'rgba(20,29,46,.25)',
        })),
        nextDuelFtue: app.nextDuelFtue,
        skipDuelFtue: app.skipDuelFtue,
        // A beaten opponent cannot be farmed: pick someone else.
        duelRematchDisplay: out && out.won ? 'none' : 'flex',
        duelLobbyLabel: out && out.won ? 'PICK NEXT OPPONENT' : 'LOBBY',
        duelBoardW: st.duelW || 300,
        duelBoardH: st.duelH || 250,
        foeWrapRef: app.foeWrapRef,
        duelArenaRef: app.duelArenaRef,
        // Equal stacked boards only where the arena can carry two of them;
        // otherwise the player keeps a full-size board and theirs is a
        // thumbnail in the info strip.
        duelFoePanelDisplay: st.duelStacked ? 'flex' : 'none',
        duelFoePanelFlex: st.duelStacked ? '1' : '0 0 auto',
        duelFoeWrapFlex: st.duelStacked ? '1' : '0 0 0px',
        duelFoeMiniDisplay: st.duelStacked ? 'none' : 'grid',
        duelFoeMiniCells: st.duelStacked ? [] : theirs.map(foeCell),
        duelMyShake: st.duelHit === 'me' ? 'glHit .3s ease' : 'none',
        duelFoeShake: st.duelHit === 'foe' ? 'glHit .3s ease' : 'none',
        duelOverDisplay: out ? 'flex' : 'none',
        duelOverTitle: out ? (out.won ? 'YOU WIN' : 'YOU LOSE') : '',
        duelOverColor: out ? (out.won ? '#AEE45D' : '#FF9EA1') : '#FFF2B0',
        duelOverDelta: out
          ? (out.delta > 0 ? '+' + out.delta : String(out.delta)) + ' TROPHIES'
          : '',
        duelOverBody: out
          ? out.kind === 'time-win'
            ? 'Clock ran out and you were ahead on HP.'
            : out.kind === 'time-loss'
              ? 'Clock ran out and they were ahead on HP.'
              : out.kind === 'win-buried'
                ? 'They ran out of legal links. Buried them.'
                : out.kind === 'loss-buried'
                  ? 'You ran out of legal links. Too much junk.'
                  : out.won
                    ? 'Their HP hit zero first.'
                    : 'Your HP hit zero first.'
          : '',
      };
    })(),

    /* ---------- QUESTS ----------

       Neura Knights' Daily Duties and Weekly Trials, as two tabs of one
       board. Each row is the quest, a progress bar, its reward, and one
       button: CLAIM when done, DONE once paid, and GO otherwise, which walks
       to the screen where the quest is actually played. */
    isQuests: st.phase === 'quests',
    ...(() => {
      const tab = st.questTab || 'daily';
      const list: any[] = questBoard ? questBoard[tab] : [];
      const pad = (n: number) => (n < 10 ? '0' + n : String(n));
      const until = (at: number) => {
        const ms = Math.max(0, at - Date.now());
        const h = Math.floor(ms / 3_600_000);
        const m = Math.floor((ms % 3_600_000) / 60_000);
        return h >= 24
          ? Math.floor(h / 24) + 'D ' + (h % 24) + 'H'
          : h + 'H ' + pad(m) + 'M';
      };
      const count = (p: 'daily' | 'weekly') =>
        questBoard ? questBoard[p].filter((q: any) => q.claimable).length : 0;
      const goFor = (metric: string) =>
        metric === 'duels' || metric === 'duelWins'
          ? app.goDuelLobby
          : metric === 'packs'
            ? app.goShop
            : metric === 'dailies'
              ? null
              : app.goMap;
      const metricOf = (id: string) =>
        (QUESTS.find((q) => q.id === id) || { metric: '' }).metric;
      return {
        questTabs: (['daily', 'weekly'] as const).map((id) => ({
          label: id === 'daily' ? 'DAILY DUTIES' : 'WEEKLY TRIALS',
          run: app.pickQuestTab(id),
          bg: tab === id ? '#428FFB' : 'transparent',
          fg: tab === id ? '#FFFFFF' : '#8A9BBF',
          badge: String(count(id)),
          badgeDisplay: count(id) > 0 ? 'flex' : 'none',
        })),
        questLoadingDisplay: questBoard ? 'none' : 'flex',
        questListDisplay: questBoard ? 'flex' : 'none',
        questResetLine: questBoard
          ? 'RESETS IN ' +
            until(
              tab === 'daily'
                ? questBoard.dailyResetAt
                : questBoard.weeklyResetAt
            )
          : '',
        questRows: list.map((q: any) => {
          const go = goFor(metricOf(q.id));
          const busy = st.questClaiming === q.id;
          const r = q.reward;
          const pack = r.kind === 'pack' ? packById(r.packId) : null;
          const state = q.claimable ? 'claim' : q.claimed ? 'done' : 'go';
          const btn =
            state === 'claim'
              ? BTN.primary
              : state === 'go' && go
                ? BTN.secondary
                : BTN.disabled;
          return {
            title: q.title,
            blurb: q.blurb,
            progressLabel: q.progress + '/' + q.target,
            barW: Math.round((q.progress / Math.max(1, q.target)) * 100) + '%',
            barBg: q.claimed ? '#5D6B8A' : q.claimable ? '#AEE45D' : '#428FFB',
            rowBd: q.claimable ? '#FCE270' : '#3A4C74',
            opacity: q.claimed ? 0.55 : 1,
            rewardIcon:
              r.kind === 'coins'
                ? COIN_ICON
                : r.kind === 'gems'
                  ? GEM_ICON
                  : pack?.img || '',
            rewardText:
              r.kind === 'pack'
                ? (pack?.name || 'PACK').replace(/ PACK$/, '')
                : String(r.amount),
            rewardColor:
              r.kind === 'coins'
                ? '#FCE370'
                : r.kind === 'gems'
                  ? '#8FE3FF'
                  : pack?.tint || '#FFF2B0',
            rewardTitle: rewardLabel(r),
            btnLabel: busy
              ? '...'
              : state === 'claim'
                ? 'CLAIM'
                : state === 'done'
                  ? 'DONE'
                  : 'GO',
            run:
              state === 'claim'
                ? app.claimQuest(q.id)
                : state === 'go' && go
                  ? go
                  : undefined,
            btnBg: btn.bg,
            btnShadow: btn.shadow,
            cursor:
              state === 'claim' || (state === 'go' && go)
                ? 'pointer'
                : 'default',
          };
        }),
      };
    })(),

    /* ---------- SHOP / BAG / PACKS ---------- */
    isShop: st.phase === 'shop',
    isInventory: st.phase === 'inventory',
    isOpening: st.phase === 'opening',
    goShop: app.goShop,
    goInventory: app.goInventory,
    revealNext: app.revealNext,
    revealAll: app.revealAll,
    collectPack: app.collectPack,
    gems: st.profile.gems,
    shopIcon: NAV_ICON.shop,
    coinIcon: COIN_ICON,
    gemIcon: GEM_ICON,
    shopMsg: st.shopMsg || '',
    ...(() => {
      const tab = st.shopTab || 'packs';
      const mk = (id: any, label: string, icon?: string) => ({
        label,
        run: app.pickShopTab(id),
        bg: tab === id ? '#428FFB' : 'transparent',
        fg: tab === id ? '#FFFFFF' : '#8A9BBF',
        icon: icon || '',
        iconDisplay: icon ? 'block' : 'none',
      });
      const bonus = (b: any) => ({
        bonusLabel: b.bonus > 0 ? '+' + b.bonus + '% BONUS' : '',
        bonusColor: b.bonus >= 40 ? '#FFC24B' : '#AEE45D',
        bonusDisplay: b.bonus > 0 ? 'block' : 'none',
      });
      return {
        shopTabs: [
          mk('packs', 'PACKS'),
          mk('coins', 'COINS', COIN_ICON),
          mk('gems', 'GEMS', GEM_ICON),
        ],
        packPaneDisplay: tab === 'packs' ? 'flex' : 'none',
        coinPaneDisplay: tab === 'coins' ? 'flex' : 'none',
        gemPaneDisplay: tab === 'gems' ? 'flex' : 'none',
        coinBundles: COIN_BUNDLES.map((b) => {
          const can = st.profile.gems >= (b.gems ?? 0);
          return Object.assign(
            {
              amount: b.amount.toLocaleString(),
              gems: b.gems,
              tint: b.tint,
              buy: app.buyCoins(b.id),
              cursor: can ? 'pointer' : 'not-allowed',
              opacity: can ? 1 : 0.5,
              btnBg: can ? BTN.secondary.bg : BTN.disabled.bg,
              btnShadow: can ? BTN.secondary.shadow : BTN.disabled.shadow,
            },
            bonus(b)
          );
        }),
        gemBundles: GEM_BUNDLES.map((b) =>
          Object.assign(
            {
              amount: b.amount.toLocaleString(),
              // Reddit Gold is the unit the checkout charges in, so it is the
              // unit the button quotes.
              priceLabel: b.gold + ' GOLD',
              tint: b.tint,
              buy: app.buyGems(b.id),
            },
            bonus(b)
          )
        ),
      };
    })(),
    shopMsgDisplay: st.shopMsg ? 'block' : 'none',
    shopPacks: PACKS.map((p) => {
      const bal = p.cur === 'gems' ? st.profile.gems : st.profile.coins;
      const can = bal >= p.price;
      return {
        name: p.name,
        blurb: p.blurb,
        tint: p.tint,
        cards: p.cards,
        img: p.img,
        price: p.price,
        curIcon: p.cur === 'gems' ? GEM_ICON : COIN_ICON,
        odds: p.odds.map(([r, w]: [string, number]) => ({
          label: r.toUpperCase(),
          pct: w + '%',
          color: RARITY_OUTLINE[r] || '#9FB3D1',
        })),
        buy: app.buyPack(p.id),
        cursor: can ? 'pointer' : 'not-allowed',
        opacity: can ? 1 : 0.5,
        btnBg: can ? BTN.primary.bg : BTN.disabled.bg,
        btnShadow: can ? BTN.primary.shadow : BTN.disabled.shadow,
      };
    }),
    ...(() => {
      const packs = st.profile.packs;
      const gear = st.profile.gear;
      const bag = PACKS.filter((p) => (packs[p.id] || 0) > 0).map((p) => ({
        name: p.name,
        tint: p.tint,
        cards: p.cards,
        img: p.img,
        count: packs[p.id],
        open: app.openPack(p.id),
      }));
      const ownedCount = GEAR.filter((g) => (gear[g.id] || 0) > 0).length;
      const tab = st.invTab || 'packs';
      const packTotal = PACKS.reduce((n, p) => n + (packs[p.id] || 0), 0);
      return {
        bagPacks: bag,
        noPacksDisplay: bag.length ? 'none' : 'flex',
        packsPaneDisplay: tab === 'packs' ? 'flex' : 'none',
        gearPaneDisplay: tab === 'gear' ? 'flex' : 'none',
        invTabs: [
          {
            label: 'PACKS',
            count: packTotal,
            run: app.pickInvTab('packs'),
            bg: tab === 'packs' ? '#428FFB' : 'transparent',
            fg: tab === 'packs' ? '#FFFFFF' : '#8A9BBF',
          },
          {
            label: 'GEAR',
            count: ownedCount + '/' + GEAR.length,
            run: app.pickInvTab('gear'),
            bg: tab === 'gear' ? '#428FFB' : 'transparent',
            fg: tab === 'gear' ? '#FFFFFF' : '#8A9BBF',
          },
        ],
        collectionLine:
          ownedCount +
          ' of ' +
          GEAR.length +
          ' gear found. Only gear you own can go in a loadout.',
        // Unowned cards stay VISIBLE but blacked out, so the collection reads
        // as a set with holes rather than a short list.
        collection: GEAR.map((g) => {
          const n = gear[g.id] || 0;
          return {
            short: g.name.replace(/^(Warrior|Archer|Mage) /, ''),
            icon: getGearImageUrl(g.id) || EFFECT_ICON[g.effect],
            bd: n > 0 ? RARITY_OUTLINE[g.rarity] || '#9FB3D1' : '#304A69',
            opacity: n > 0 ? 1 : 0.45,
            filter: n > 0 ? 'none' : 'grayscale(1) brightness(.45)',
            count: n > 1 ? 'x' + n : '',
            countDisplay: n > 1 ? 'flex' : 'none',
            inspect: app.inspectCard(g.id),
          };
        }),
      };
    })(),
    ...(() => {
      const op = st.openPack;
      if (!op) {
        return {
          openTitle: '',
          openTint: '#9FB3D1',
          openCards: [],
          openFooter: '',
          openGlow: '',
          openPackImg: '',
          sealedDisplay: 'none',
          cardsDisplay: 'none',
          collectDisplay: 'none',
          skipDisplay: 'none',
        };
      }
      const pack = packById(op.id)!;
      const left = op.cards.length - op.shown;
      const done = op.torn && left <= 0;
      return {
        openTitle: pack.name,
        openTint: pack.tint,
        openGlow: pack.glow,
        openPackImg: pack.img,
        sealedDisplay: op.torn ? 'none' : 'flex',
        cardsDisplay: op.torn ? 'flex' : 'none',
        collectDisplay: done ? 'flex' : 'none',
        skipDisplay:
          op.torn && left > 0 && op.cards.length > 1 ? 'flex' : 'none',
        openFooter: !op.torn
          ? ''
          : left > 0
            ? op.cards.length > 1
              ? 'Tap to reveal - ' + left + ' left'
              : 'Tap to reveal'
            : app.packSummary(op),
        openCards: op.cards.map((c: any, i: number) => {
          const shown = i < op.shown;
          const col = RARITY_OUTLINE[c.gear.rarity] || '#9FB3D1';
          return {
            short: c.gear.name.replace(/^(Warrior|Archer|Mage) /, ''),
            icon: getGearImageUrl(c.gear.id) || EFFECT_ICON[c.gear.effect],
            bd: shown ? col : '#141212',
            w: op.cards.length > 1 ? '96px' : '150px',
            anim: shown ? 'glReveal 420ms ease-out both' : 'none',
            glow:
              shown &&
              (c.gear.rarity === 'Epic' || c.gear.rarity === 'Legendary')
                ? '0 0 14px 3px ' + col
                : 'none',
            faceDisplay: shown ? 'block' : 'none',
            backDisplay: shown ? 'none' : 'flex',
            newDisplay: shown && c.isNew ? 'flex' : 'none',
            dupeDisplay: shown && !c.isNew ? 'flex' : 'none',
            refund: c.refund,
          };
        }),
      };
    })(),

    closeCardInfo: app.closeCardInfo,
    ...(() => {
      const g = st.cardInfo ? GEAR.find((x) => x.id === st.cardInfo) : null;
      if (!g) {
        return {
          cardInfoDisplay: 'none',
          cardInfoIcon: '',
          cardInfoName: '',
          cardInfoRarity: '',
          cardInfoRarityColor: '#8A93B5',
          cardInfoClass: '',
          cardInfoType: '',
          cardInfoTypeIcon: '',
          cardInfoTypeColor: '#8B7355',
          cardInfoOwn: '',
          cardInfoOwnColor: '#8B7355',
          cardInfoWhat: '',
          cardInfoFilter: 'none',
          cardInfoRiderDisplay: 'none',
          cardInfoRiderIcon: '',
          cardInfoRiderColor: '#CBD9EC',
          cardInfoRiderTitle: '',
          cardInfoRiderText: '',
        };
      }
      const n = st.profile.gear[g.id] || 0;
      const rd = riderOf(g.id);
      const R = rd ? RID[rd.r] : null;
      const m = app.mflags();
      const at = (k: number) => magnitudeFor(g.power, k, m);
      const verb =
        g.effect === 'attack'
          ? 'deals'
          : g.effect === 'block'
            ? 'gives'
            : 'heals';
      const unit =
        g.effect === 'attack'
          ? ' damage'
          : g.effect === 'block'
            ? ' block'
            : ' HP';
      return {
        cardInfoDisplay: 'flex',
        cardInfoIcon: getGearImageUrl(g.id) || EFFECT_ICON[g.effect],
        cardInfoFilter: n > 0 ? 'none' : 'grayscale(1) brightness(.5)',
        cardInfoName: g.name.replace(/^(Warrior|Archer|Mage) /, ''),
        cardInfoRarity: g.rarity.toUpperCase(),
        cardInfoRarityColor:
          n > 0 ? RARITY_OUTLINE[g.rarity] || '#9FB3D1' : '#8A93B5',
        cardInfoClass: g.cls === 'Hero' ? 'WARRIOR' : g.cls.toUpperCase(),
        cardInfoType: EFFECT_LABEL[g.effect],
        cardInfoTypeIcon: EFFECT_ICON[g.effect],
        cardInfoTypeColor: EFFECT_COLOR[g.effect],
        cardInfoOwn:
          n > 0
            ? n === 1
              ? 'Owned'
              : 'Owned x' + n
            : 'Not found yet - pull it from a pack',
        cardInfoOwnColor: n > 0 ? '#2E8B57' : '#8B7355',
        cardInfoWhat:
          'A 3-link ' +
          verb +
          ' ' +
          at(3) +
          unit +
          ', a 4-link ' +
          at(4) +
          ', a 5-link ' +
          at(5) +
          '.',
        cardInfoRiderDisplay: R ? 'flex' : 'none',
        cardInfoRiderIcon: R ? R.icon : '',
        cardInfoRiderColor: R ? R.color : '#CBD9EC',
        cardInfoRiderTitle: R
          ? 'At link ' + rd!.at + '+, ' + R.verb(rd!.v) + '.'
          : '',
        cardInfoRiderText: R ? R.blurb : '',
      };
    })(),

    isSplash: st.phase === 'splash',
    isHome: st.phase === 'home',
    /* The shell's size and bezel are CSS (.gl-page / .gl-frame / .gl-shell), so
       a phone-sized viewport can drop the frame without the view model or the
       board measurement knowing anything about it. */
    frameDisplay: st.phase === 'splash' ? 'none' : 'flex',
    splashActions: [
      {
        label: 'PLAY',
        run: app.goStep('home'),
        bg: BTN.primary.bg,
        shadow: BTN.primary.shadow,
      },
    ],
    /* Bottom app bar: Shop and Quests left of centre, Fight centre and
         raised, Duel and Bag right of it. Leaderboard moved into the header
         menu and How To Play into the header's own control. */
    /* Bottom app bar, matching the game's own Menu/MenuButton: a blurred
         #282A3C panel with #1D1C24 rule, buttons TALLER than the bar so they
         break its top and bottom edge, and the active tab carrying the blue
         fill, the MenuButtonPatten overlay and a stroked label floating above
         it. FIGHT is the active tab here since it is the default action.
         Deviation: the inactive tabs keep a small label, because BattlePass
         art does not yet read as Duel. Quests carries Neura Knights' alert
         dot while anything on the board is waiting to be claimed. */
    navItems: [
      {
        label: 'SHOP',
        run: app.goShop,
        img: NAV_ICON.shop,
        icon: '30px',
        active: false,
      },
      {
        label: 'QUESTS',
        run: app.goQuests,
        img: NAV_ICON.quests,
        icon: '30px',
        active: false,
        alert: questClaimable > 0,
      },
      {
        label: 'FIGHT',
        run: app.goMap,
        img: NAV_ICON.fight,
        icon: '34px',
        active: true,
      },
      {
        label: 'DUEL',
        run: app.goDuelLobby,
        img: NAV_ICON.duel,
        icon: '28px',
        active: false,
      },
      {
        label: 'BAG',
        run: app.goInventory,
        img: NAV_ICON.bag,
        icon: '30px',
        active: false,
      },
    ].map((n, k) =>
      Object.assign({}, n, {
        bd: n.active ? '#1D1C24' : 'transparent',
        bg: n.active ? '#428FFB' : 'transparent',
        patternDisplay: n.active ? 'block' : 'none',
        tipDisplay: n.active ? 'flex' : 'none',
        subDisplay: n.active ? 'none' : 'block',
        nudge: k === 0 ? '0' : '-2px',
        z: n.active ? 2 : 1,
        alertDisplay: 'alert' in n && n.alert ? 'block' : 'none',
      })
    ),
    toggleHomeMenu: app.toggleHomeMenu,
    homeMenuDisplay: st.homeMenu ? 'flex' : 'none',
    homeMenuItems: [
      { label: 'BLACKSMITHS', run: app.openBoardFromMenu },
      { label: 'HOW TO PLAY', run: app.openHowFromMenu },
    ],
    /* ---------- the map ---------- *

       HOME IS THE MAP, the way Neura Knights' home is: the artwork fills the
       screen, the locations are pins on it, and tapping one opens a panel with
       the way in. No title card and no best-run panel - the road itself is the
       screen, and the ladder moved into the header menu. */
    mapArt: MAP_ART.url,
    mapWrapRef: app.mapWrapRef,
    onMapDown: app.onMapDown,
    onMapMove: app.onMapMove,
    onMapUp: app.onMapUp,
    onMapClickCapture: app.onMapClickCapture,
    mapFrame: (() => {
      const f = app.mapFrame();
      return {
        w: f.w + 'px',
        h: f.h + 'px',
        transform: 'translate3d(' + f.x + 'px,' + f.y + 'px,0)',
      };
    })(),
    /* The ascension badge is the only place the run's difficulty tier is
       stated, so it shows even at zero rather than appearing from nowhere on
       the first King kill. */
    ascensionLabel:
      st.profile.ascension > 0
        ? 'ASCENSION ' + st.profile.ascension
        : 'FIRST CLIMB',
    ascensionColor: st.profile.ascension > 0 ? '#FFC24B' : '#9DB4D4',
    mapProgress:
      Math.min(st.profile.progress, MAP_LENGTH) + '/' + MAP_LENGTH + ' TAKEN',
    mapPins: LOCATIONS.map((loc, i) => {
      const cleared = i < st.profile.progress;
      const open = i <= st.profile.progress;
      const next = i === st.profile.progress;
      const isOpen = st.openLocation === loc.id;
      return {
        id: loc.id,
        // Percentages against the artwork, so a pin stays put at any scale.
        top: loc.at.top ?? 'auto',
        bottom: loc.at.bottom ?? 'auto',
        left: loc.at.left ?? 'auto',
        right: loc.at.right ?? 'auto',
        url: mapPinUrlFor(
          loc.pin,
          !open ? 'Locked' : isOpen ? 'Active' : 'Default'
        ),
        tap: app.tapLocation(loc.id),
        // The open pin and its panel sit above the others, or a neighbour's
        // sprite would overlap the panel that just opened.
        z: isOpen ? 6 : 4,
        // A pin that is next up pulses, so the road reads at a glance.
        anim: next && !isOpen ? 'glLoom 1800ms ease-in-out infinite' : 'none',
        newDisplay: next && !isOpen ? 'block' : 'none',
        panelDisplay: isOpen ? 'flex' : 'none',
        /* The panel sits BESIDE the pin, anchored to the pin's outer edge with
           a small gap - not overlapping it. Pins on the right-hand side of the
           map open leftwards and vice versa, so a panel never runs off the
           shell. */
        panelLeft: loc.at.right !== undefined ? 'auto' : 'calc(100% + 8px)',
        panelRight: loc.at.right !== undefined ? 'calc(100% + 8px)' : 'auto',
        name: loc.name,
        blurb: open
          ? loc.blurb
          : 'Take the location before this one to open the road.',
        bossUrl: monsterUrlFor(loc.boss),
        bossName: loc.boss.toUpperCase(),
        waves:
          loc.minWaves === loc.maxWaves
            ? loc.minWaves + ' WAVES'
            : loc.minWaves + '-' + loc.maxWaves + ' WAVES',
        tag: cleared ? 'CLEARED' : next ? 'NEXT' : 'LOCKED',
        tagBg: cleared ? '#2E8B57' : next ? '#FCE370' : '#3A4C74',
        tagFg: next ? '#1D2956' : '#FFFFFF',
        // A locked pin opens a panel that explains itself, but has no way in.
        enter: open ? app.pickLocation(loc.id) : null,
        enterLabel: open ? 'ENTER' : 'LOCKED',
        enterBg: open ? BTN.primary.bg : BTN.disabled.bg,
        enterShadow: open ? BTN.primary.shadow : BTN.disabled.shadow,
        enterCursor: open ? 'pointer' : 'default',
        kingDisplay: loc.king ? 'flex' : 'none',
      };
    }),
    homeWallet: [
      { icon: COIN_ICON, value: st.profile.coins.toLocaleString() },
      { icon: GEM_ICON, value: String(st.profile.gems) },
      { icon: HEART_PIECE_ICON, value: String(st.profile.heartPieces) },
    ],
    closeLocation: app.closeLocation,
    scrimDisplay: st.openLocation ? 'block' : 'none',
    /* ---------- heart pieces ---------- */
    heartIcon: HEART_PIECE_ICON,
    heartPieces: pieces,
    heartPiecesDisplay: st.flow === 'duel' ? 'none' : 'flex',
    heartPiecesLabel: pieces + ' HEART PIECE' + (pieces === 1 ? '' : 'S'),
    heartPiecesNote:
      'Location bosses drop them. ' +
      HEART_PIECES_PER_CONTAINER +
      ' make a container: +' +
      HP_PER_HEART_CONTAINER +
      ' max HP for one hero, up to ' +
      MAX_HEART_CONTAINERS +
      '.',
    isHeroStep: st.phase === 'hero',
    isGearStep: st.phase === 'gear',
    /* The hero and gear screens serve both flows, so their footers name the
       flow they are in - a duel build that ended in "ENTER THE ARENA" would
       read as starting a run. */
    isDuelFlow: st.flow === 'duel',
    heroStepTitle: st.flow === 'duel' ? 'PICK YOUR DUELLIST' : 'PICK YOUR HERO',
    startLabel: st.flow === 'duel' ? 'SAVE THIS FIVE' : 'ENTER THE ARENA',
    startRun: st.flow === 'duel' ? app.goDuelOptIn : app.startRun,
    heroStepActions: [
      {
        label: st.flow === 'duel' ? 'CANCEL' : 'MAP',
        run: st.flow === 'duel' ? app.leaveDuelSetup : app.goMap,
        h: '46px',
        size: '13px',
        flex: '0 0 34%',
        bg: BTN.secondary.bg,
        shadow: BTN.secondary.shadow,
      },
      {
        label: 'NEXT',
        run: app.goStep('gear'),
        h: '46px',
        size: '15px',
        flex: '1 1 auto',
        bg: BTN.primary.bg,
        shadow: BTN.primary.shadow,
      },
    ],
    gearStepActions: [{ label: 'BACK', run: app.goStep('hero') }],
    heroImg: perk.img,
    heroName: st.heroClass.toUpperCase(),
    heroPerkLine: perk.line,
    equipRule: 'Equip 5 pieces of ' + st.heroClass + ' gear',
    /* Readout sitting with the slots, so checking what a piece does never means
         looking to the bottom of the screen. Carries everything the old floating
         panel did: payout at 3/4/5 links and the full effect text. */
    closePeek: app.closePeek,
    ...(() => {
      const g = st.peek ? GEAR.find((x) => x.id === st.peek) : null;
      if (!g || g.cls !== st.heroClass || st.picked.indexOf(g.id) >= 0)
        return {
          peekDisplay: 'none',
          peekIcon: '',
          peekName: '',
          peekRarity: '',
          peekRarityColor: '#9FB3D1',
          peekTypeIcon: '',
          peekTypeColor: '#CBD9EC',
          peekPower: '',
          peekWhat: '',
          peekRiderDisplay: 'none',
          peekRiderIcon: '',
          peekRiderColor: '#CBD9EC',
          peekRiderTitle: '',
          peekRiderText: '',
        };
      const rd = riderOf(g.id);
      const R = rd ? RID[rd.r] : null;
      const m = app.mflags();
      const at = (n: number) => magnitudeFor(g.power, n, m);
      const verb =
        g.effect === 'attack'
          ? 'deals'
          : g.effect === 'block'
            ? 'gives'
            : 'heals';
      const unit =
        g.effect === 'attack'
          ? ' damage'
          : g.effect === 'block'
            ? ' block'
            : ' HP';
      return {
        peekDisplay: 'flex',
        peekIcon: getGearImageUrl(g.id) || EFFECT_ICON[g.effect],
        peekName: g.name.replace(/^(Warrior|Archer|Mage) /, ''),
        peekRarity: g.rarity.toUpperCase(),
        peekRarityColor: RARITY_OUTLINE[g.rarity] || '#9FB3D1',
        peekTypeIcon: EFFECT_ICON[g.effect],
        peekTypeColor: EFFECT_COLOR[g.effect],
        peekPower: g.power,
        peekWhat:
          'A 3-link ' +
          verb +
          ' ' +
          at(3) +
          unit +
          ', a 4-link ' +
          at(4) +
          ', a 5-link ' +
          at(5) +
          '.',
        peekRiderDisplay: R ? 'flex' : 'none',
        peekRiderIcon: R ? R.icon : '',
        peekRiderColor: R ? R.color : '#CBD9EC',
        peekRiderTitle: R
          ? 'At link ' + rd!.at + '+, ' + R.verb(rd!.v) + '.'
          : '',
        peekRiderText: R ? R.blurb : '',
      };
    })(),
    slotPrev: app.pageSlot(-1),
    slotNext: app.pageSlot(1),
    slotPagerDisplay: st.picked.filter(Boolean).length > 1 ? 'flex' : 'none',
    ...(() => {
      const g =
        st.lastGear && st.picked.indexOf(st.lastGear) >= 0
          ? GEAR.find((x) => x.id === st.lastGear)
          : null;
      if (!g || g.cls !== st.heroClass)
        return {
          slotInfoIconDisplay: 'none',
          slotInfoIcon: '',
          slotInfoTypeIcon: '',
          slotInfoTypeColor: '#CBD9EC',
          slotInfoPower: '',
          slotInfoRarity: '',
          slotInfoRarityColor: '#9FB3D1',
          slotInfoName: 'Tap a slot to read it.',
          slotInfoWhat:
            'Each equipped piece becomes one orb colour on the board.',
          slotInfoRiderDisplay: 'none',
          slotInfoRiderIcon: '',
          slotInfoRiderColor: '#CBD9EC',
          slotInfoRiderTitle: '',
          slotInfoRiderText: '',
        };
      const rd = riderOf(g.id);
      const R = rd ? RID[rd.r] : null;
      const m = app.mflags();
      const at = (n: number) => magnitudeFor(g.power, n, m);
      const verb =
        g.effect === 'attack'
          ? 'deals'
          : g.effect === 'block'
            ? 'gives'
            : 'heals';
      const unit =
        g.effect === 'attack'
          ? ' damage'
          : g.effect === 'block'
            ? ' block'
            : ' HP';
      return {
        slotInfoIconDisplay: 'flex',
        slotInfoIcon: getGearImageUrl(g.id) || EFFECT_ICON[g.effect],
        slotInfoTypeIcon: EFFECT_ICON[g.effect],
        slotInfoTypeColor: EFFECT_COLOR[g.effect],
        slotInfoPower: g.power,
        slotInfoRarity: g.rarity.toUpperCase(),
        slotInfoRarityColor: RARITY_OUTLINE[g.rarity] || '#9FB3D1',
        slotInfoName: g.name.replace(/^(Warrior|Archer|Mage) /, ''),
        slotInfoWhat:
          'A 3-link ' +
          verb +
          ' ' +
          at(3) +
          unit +
          ', a 4-link ' +
          at(4) +
          ', a 5-link ' +
          at(5) +
          '.',
        slotInfoRiderDisplay: R ? 'flex' : 'none',
        slotInfoRiderIcon: R ? R.icon : '',
        slotInfoRiderColor: R ? R.color : '#CBD9EC',
        slotInfoRiderTitle: R
          ? 'At link ' + rd!.at + '+, ' + R.verb(rd!.v) + '.'
          : '',
        slotInfoRiderText: R ? R.blurb : '',
      };
    })(),
    isBattle: st.phase === 'battle',
    isEnd: st.phase === 'end',
    heroCards,
    gearCards,
    tabs,
    slots,
    riderRows,
    pickedCount: st.picked.length,
    loadoutHint:
      st.picked.length === 5
        ? 'Five orb types go on the board, one per equipped card.'
        : 'Equip five cards to fill the board.',
    startBg: st.picked.length === 5 ? BTN.primary.bg : BTN.disabled.bg,
    startShadow:
      st.picked.length === 5 ? BTN.primary.shadow : BTN.disabled.shadow,
    startOpacity: st.picked.length === 5 ? 1 : 0.6,
    onDown: app.onDown,
    onMove: app.onMove,
    onUp: app.onUp,
    onCancel: app.onCancel,
    openHow: app.openHow,
    openBoard: app.openBoard,
    closeModal: app.closeModal,
    quitRun: app.quitRun,
    goLoadout: app.goLoadout,
    stop: app.stop,
    ...battle,
    endTitle:
      st.endReason === 'won'
        ? st.ascended
          ? 'ASCENDED'
          : 'LOCATION TAKEN'
        : st.endReason === 'stuck'
          ? 'BOARD LOCKED'
          : st.endReason === 'ended'
            ? 'RUN FORFEIT'
            : 'YOU FELL',
    endBody:
      st.endReason === 'won'
        ? st.ascended
          ? 'The King is down. The map opens again from Greenwood, and everything on it hits harder from here.'
          : 'The elite fell and the road ahead is open. The next location fields more waves and a bigger guard.'
        : st.endReason === 'stuck'
          ? 'No legal link left and no bomb to break the board open. Not stranding your last playable colours is part of the skill.'
          : st.endReason === 'ended'
            ? 'You walked out mid-battle. Nothing on the map moved.'
            : 'HP does not come back between waves. Clear the location in one go or not at all.',
    endTitleColor: st.endReason === 'won' ? '#FCE370' : '#FF9EA1',
    /* Won or lost, the way on is the map - there is nothing else to go back
       to now that a run is one location rather than an endless gauntlet. */
    endActionLabel: st.endReason === 'won' ? 'BACK TO THE MAP' : 'TRY AGAIN',
    endAction: app.goMap,
    endStats: [
      {
        label: 'WAVES CLEARED',
        value: app.rollUp(endBs.wavesCleared),
        color: '#3C63FF',
        anim: 'glPop 320ms ease-out both',
      },
      {
        label: 'BEST LINK',
        value: app.rollUp(endBs.maxChain),
        color: '#1D2956',
        anim: 'glPop 320ms 80ms ease-out both',
      },
      {
        label: 'TURNS',
        value: app.rollUp(endBs.turnsUsed),
        color: '#1D2956',
        anim: 'glPop 320ms 160ms ease-out both',
      },
      {
        label: 'SCORE',
        value: app.rollUp(app.scoreOf(endBs)).toLocaleString(),
        color: '#2E8B57',
        anim: 'glPop 320ms 240ms ease-out both',
      },
    ]
      .concat(
        !st.heartPiecesEarned
          ? []
          : [
              {
                label: 'HEART PIECES',
                value: '+' + app.rollUp(st.heartPiecesEarned),
                color: '#B23A48',
                anim: 'glPop 320ms 400ms ease-out both',
              },
            ]
      )
      .concat(
        !st.coinsEarned
          ? []
          : [
              {
                label: 'COINS EARNED',
                value: '+' + app.rollUp(st.coinsEarned),
                color: '#8A5A2B',
                anim: 'glPop 320ms 320ms ease-out both',
              },
            ]
      ),
    modalOpen: !!st.modal,
    modalTitle,
    modalRows,
    modalActions,
    openPause: app.openPause,
  };
};
