/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/refs -- The view model carries this screen's
   callback refs (setFtueRoot, boardWrapRef, ...) alongside its plain values.
   Because `v` appears in a `ref={}` position the rule then treats every `v.x`
   read as a ref access, which flags several hundred ordinary strings and
   colours. Callback refs in props are supported React; there is nothing here
   to fix. */
/**
 * The whole GearLink UI, as one render off a view model.
 *
 * This is a direct translation of the design's template: it holds no state and
 * makes no decisions. Every string, colour, flag and handler it reads comes out
 * of `buildView`, which is where the state lives - so a layout change is made
 * here and a behaviour change is made there, never both at once.
 */
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { View } from './buildView.js';
import { MenuIcon, SpeakerIcon, VolumeSlider } from './SettingsControls.js';
import { WorldMap } from './WorldMap.js';
import { GENERAL_GEAR } from '../splash-style.js';

const PIXEL = 'VolterTitle,Volter,monospace';

/** Yoster Island draws `#` as a star, so any `#` in pixel text is set in
 *  Volter instead to read as the hash it is. */
const withHash = (text: string | number): ReactNode =>
  String(text)
    .split('#')
    .map((part, i) => (
      <Fragment key={i}>
        {i > 0 ? (
          <span style={{ fontFamily: 'Volter,monospace' }}>#</span>
        ) : null}
        {part}
      </Fragment>
    ));

/** One side of the pre-fight screen: who, what class, and the five. */
const DuelSideCard = ({
  label,
  name,
  img,
  fit,
  cls,
  perk,
  rating,
  slots,
  border,
  tag,
}: {
  label: string;
  name: string;
  img: string;
  fit: string;
  cls: string;
  perk: string;
  rating: number;
  slots: any[];
  border: string;
  tag: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: '#1D2956',
      border: `2px solid ${border}`,
      borderRadius: '8px 0 8px 0',
      padding: '10px',
      flexShrink: '0',
    }}
  >
    <div style={{ fontSize: '8px', color: '#9DB4D4', letterSpacing: '.14em' }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <div
        style={{
          width: '44px',
          height: '44px',
          flexShrink: '0',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: 'rgba(0,0,0,.35)',
          backgroundImage: `url(${img})`,
          backgroundSize: fit,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      ></div>
      <div
        style={{
          flex: '1',
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <div
            style={{
              fontFamily: PIXEL,
              fontSize: '12px',
              color: '#FFFFFF',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          {tag}
        </div>
        <div style={{ fontSize: '8px', color: '#9DB4D4' }}>{cls}</div>
        <div style={{ fontSize: '8px', color: '#8A9BBF' }}>{perk}</div>
      </div>
      <div
        style={{
          flexShrink: '0',
          fontFamily: PIXEL,
          fontSize: '12px',
          color: '#FCE370',
        }}
      >
        {rating}
      </div>
    </div>
    <div style={{ display: 'flex', gap: '6px' }}>
      {slots.map((g: any, gI: number) => (
        <Fragment key={gI}>
          <div
            style={{
              flex: '1',
              aspectRatio: '1',
              maxWidth: '52px',
              borderRadius: '8px 0 8px 0',
              background: g.bg,
              backgroundImage: `url(${g.icon})`,
              backgroundSize: '78%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated',
              opacity: g.opacity,
            }}
          ></div>
        </Fragment>
      ))}
    </div>
  </div>
);

const btn = (bg: string, lip: string) => ({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #000000',
  borderRadius: '8px 2px 8px 2px',
  background: bg,
  boxShadow: `0 -2px 0 0 ${lip} inset, 0 2px 0 0 #FFF inset`,
  color: '#000000',
  fontFamily: PIXEL,
});

/** This tier's three prizes, with what the reset does at each level - the
 *  incentive shown wherever a player decides whether to enter. */
const TierPrizes = ({ v }: { v: View }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      flexShrink: '0',
    }}
  >
    {(v.tierPrizes || []).map((p: any, pI: number) => (
      <Fragment key={pI}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '6px 0 6px 0',
            background: p.bg,
            border: p.border,
          }}
        >
          <div
            style={{
              flex: '0 0 74px',
              fontFamily: PIXEL,
              fontSize: '10px',
              color: p.color,
            }}
          >
            {p.league}
          </div>
          <div
            style={{
              flex: '1',
              minWidth: '0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}
          >
            <div style={{ fontSize: '9px', color: '#FFFFFF' }}>{p.label}</div>
            <div style={{ fontSize: '8px', color: '#9DB4D4' }}>{p.note}</div>
          </div>
          <div
            style={{
              flexShrink: '0',
              fontSize: '8px',
              color: '#FCE370',
              letterSpacing: '.1em',
            }}
          >
            {p.tag}
          </div>
        </div>
      </Fragment>
    ))}
  </div>
);

const Bullet = ({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) => (
  <div style={{ display: 'flex', gap: '7px', alignItems: 'baseline' }}>
    <div
      style={{
        flexShrink: '0',
        width: '6px',
        height: '6px',
        transform: 'rotate(45deg) translateY(-1px)',
        background: color ?? '#9DB4D4',
      }}
    ></div>
    <div
      style={{
        flex: '1',
        fontSize: '9px',
        color: '#E8EEF8',
        lineHeight: '1.6',
      }}
    >
      {children}
    </div>
  </div>
);

/* The in-game splash's decoration: the title split into letters so each can
   drop in, six pieces of gear orbiting the icon, sparks in the sky and motes
   rising off the bottom. Positions and delays are fixed so it reads the same
   every time. */
/* Sparkles round an Epic or Legendary piece in the Bag > Gear card info. */
const GEAR_SPARKS = [
  { left: '20%', top: '22%', size: '10px', delay: '0s' },
  { left: '76%', top: '18%', size: '8px', delay: '.6s' },
  { left: '80%', top: '62%', size: '12px', delay: '1.2s' },
  { left: '14%', top: '66%', size: '7px', delay: '1.8s' },
];

const SPLASH_TITLE = 'GEARLINK'.split('');
const SPLASH_ORBIT = GENERAL_GEAR.slice(0, 6).map((src, i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return {
    src,
    left: `${50 + 50 * Math.cos(a)}%`,
    top: `${50 + 50 * Math.sin(a)}%`,
    delay: `${0.55 + i * 0.08}s`,
    float: `${i * 0.4}s`,
  };
});
const SPLASH_SPARKS = [
  { left: '10%', top: '12%', size: 10, delay: '0s' },
  { right: '12%', top: '9%', size: 8, delay: '.9s' },
  { left: '22%', top: '30%', size: 6, delay: '1.7s' },
  { right: '20%', top: '26%', size: 9, delay: '.4s' },
  { left: '7%', top: '52%', size: 7, delay: '2.1s' },
  { right: '8%', top: '48%', size: 10, delay: '1.3s' },
  { left: '34%', top: '5%', size: 6, delay: '2.6s' },
  { right: '30%', top: '40%', size: 7, delay: '1.1s' },
];
const SPLASH_MOTES = [
  { left: '18%', delay: '0s', tint: '#FFD34E' },
  { left: '27%', delay: '1.4s', tint: '#5CC45A' },
  { left: '38%', delay: '2.8s', tint: '#FFD34E' },
  { left: '47%', delay: '.6s', tint: '#E8453C' },
  { left: '55%', delay: '2.1s', tint: '#FFD34E' },
  { left: '63%', delay: '3.4s', tint: '#8C7CFF' },
  { left: '72%', delay: '1s', tint: '#FFD34E' },
  { left: '81%', delay: '2.5s', tint: '#5CC45A' },
];

export const Screen = ({ v }: { v: View }) => (
  <div
    className="gl-page"
    style={{
      backgroundColor: '#0B1020',
      backgroundImage: 'url(/art/PocketKnights/sky_v3.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center bottom',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Volter,ui-monospace,monospace',
    }}
  >
    {v.isSplash ? (
      <>
        <div
          style={{
            position: 'fixed',
            inset: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0',
            overflow: 'hidden',
            backgroundColor: '#101528',
            backgroundImage: 'url(/art/PocketKnights/sky_v3.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '0',
              background:
                'linear-gradient(180deg,rgba(11,16,32,.72),rgba(11,16,32,.3) 40%,rgba(16,21,40,.96))',
            }}
          ></div>

          {SPLASH_SPARKS.map((p, i) => (
            <span
              key={i}
              className="gls-spark"
              style={{
                left: p.left,
                right: p.right,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: p.delay,
              }}
            />
          ))}
          {SPLASH_MOTES.map((m, i) => (
            <span
              key={i}
              className="gls-mote"
              style={{
                left: m.left,
                background: m.tint,
                boxShadow: `0 0 6px ${m.tint}`,
                animationDelay: m.delay,
              }}
            />
          ))}

          <div
            style={{
              position: 'relative',
              marginTop: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '0 24px',
            }}
          >
            {/* The icon's stage: light wheeling behind it, a warm glow
                breathing, and the gear it links orbiting round it. */}
            <div
              style={{
                position: 'relative',
                width: '210px',
                height: '210px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="gls-rays gls-rays-a" />
              <div className="gls-rays gls-rays-b" />
              <div className="gls-glow" />
              <div className="gls-orbit">
                {SPLASH_ORBIT.map((g) => (
                  <div
                    key={g.src}
                    className="gls-orbit-slot"
                    style={{ left: g.left, top: g.top }}
                  >
                    <div
                      className="gls-orbit-in"
                      style={{ animationDelay: g.delay }}
                    >
                      <img
                        src={g.src}
                        alt=""
                        className="gls-orbit-gear"
                        style={{ animationDelay: g.float }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="gls-icon-in" style={{ position: 'relative' }}>
                <div
                  className="gls-icon"
                  style={{
                    width: '112px',
                    height: '116px',
                    backgroundImage: `url(${v.gearlinkIcon})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                ></div>
              </div>
            </div>
            <div
              aria-label="GEARLINK"
              style={{
                fontFamily: 'VolterTitle,Volter,monospace',
                fontSize: 'clamp(32px,7vw,52px)',
                color: '#FFF2B0',
                textAlign: 'center',
                letterSpacing: '.04em',
                WebkitTextStroke: '4px #141D2E',
                paintOrder: 'stroke fill',
                textShadow: '0 5px 0 #141D2E, 0 0 22px rgba(255,180,60,.5)',
              }}
            >
              {SPLASH_TITLE.map((c, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="gls-letter"
                  style={{
                    animationDelay: `${0.35 + i * 0.06}s,${1.1 + i * 0.12}s,${1.5 + i * 0.08}s`,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
            <div
              className="gls-rise"
              style={{
                animationDelay: '.9s',
                fontSize: '12px',
                color: '#CBD9EC',
                textAlign: 'center',
                lineHeight: '1.7',
                maxWidth: '38ch',
              }}
            >
              Link your gear, break the wave, and see how deep the ladder takes
              you.
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '340px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '28px',
              marginBottom: 'auto',
              padding: '0 24px 0',
            }}
          >
            {(v.splashActions || []).map((a: any, aI: number) => (
              <Fragment key={aI}>
                <div
                  className="gls-rise"
                  style={{
                    position: 'relative',
                    animationDelay: `${1.05 + aI * 0.1}s`,
                  }}
                >
                  <div className="gls-nudge" style={{ position: 'relative' }}>
                    {aI === 0 ? <div className="gls-halo" /> : null}
                    <div
                      onClick={a.run}
                      className="gls-btn"
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '48px',
                        border: '3px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: a.bg,
                        boxShadow: a.shadow,
                        color: '#000000',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '24px',
                        lineHeight: '1.05',
                        textAlign: 'center',
                        textWrap: 'balance',
                      }}
                    >
                      <span style={{ position: 'relative' }}>{a.label}</span>
                      {aI === 0 ? <span className="gls-sheen" /> : null}
                    </div>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </>
    ) : null}

    <div className="gl-frame" style={{ display: v.frameDisplay }}>
      <div
        ref={v.setFtueRoot}
        className="gl-shell"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: '#1C2134',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {v.isHome ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                position: 'relative',
                overflow: 'hidden',
                background: '#141D2E',
              }}
            >
              {/* The World Map diorama: tap a location to focus it, ENTER runs
                  that pin's own enter. The HUD and nav tuck away while focused. */}
              <div
                ref={v.setFtueMap}
                style={{ position: 'absolute', inset: '0' }}
              >
                <WorldMap
                  embedded
                  lockedIds={v.wmLocked}
                  nextId={v.wmNext}
                  focusRequest={v.wmFocusReq}
                  onEnter={v.wmEnter}
                  onFocusChange={v.wmFocus}
                />
              </div>

              {/* Top HUD, floating over the map rather than pushing it down. */}
              <div
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  zIndex: '14',
                  transform: v.wmHeaderT,
                  transition: v.wmChromeTr,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '10px 12px',
                  pointerEvents: 'none',
                  background:
                    'linear-gradient(180deg,rgba(20,29,46,.92),rgba(20,29,46,0))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    pointerEvents: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 7px',
                      border: '1px solid #3A4C74',
                      borderRadius: '4px',
                      background: 'rgba(20,29,46,.85)',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '10px',
                      color: v.ascensionColor,
                    }}
                  >
                    {v.ascensionLabel}
                  </div>
                  <div
                    style={{
                      fontSize: '8px',
                      letterSpacing: '.12em',
                      color: '#9DB4D4',
                      textShadow: '0 2px 0 #141D2E',
                    }}
                  >
                    {v.mapProgress}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    pointerEvents: 'auto',
                  }}
                >
                  {(v.homeWallet || []).map((c: any, cI: number) => (
                    <Fragment key={cI}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          height: '22px',
                          padding: '0 7px 0 5px',
                          border: '1px solid #3A4C74',
                          borderRadius: '4px',
                          background: 'rgba(20,29,46,.85)',
                        }}
                      >
                        <div
                          style={{
                            width: '13px',
                            height: '13px',
                            backgroundImage: `url(${c.icon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <div style={{ fontSize: '10px', color: '#FFF2B0' }}>
                          {c.value}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                  <div
                    onClick={v.openHow}
                    style={{
                      cursor: 'pointer',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #3A4C74',
                      borderRadius: '9999px',
                      background: 'rgba(20,29,46,.85)',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '11px',
                      color: '#9DB4D4',
                    }}
                  >
                    ?
                  </div>
                  <div
                    onClick={v.toggleHomeMenu}
                    style={{
                      cursor: 'pointer',
                      width: '30px',
                      minHeight: '30px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      boxSizing: 'border-box',
                      border: '2px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: v.homeMenuOpen ? '#428FFB' : '#B5C0FF',
                      boxShadow: v.homeMenuOpen
                        ? 'none'
                        : '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    {[0, 1, 2].map((n) => (
                      <div
                        key={n}
                        style={{
                          width: '16px',
                          height: '3px',
                          borderRadius: '9999px',
                          background: '#000000',
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '12px',
                  zIndex: '20',
                  width: '168px',
                  display: v.homeMenuDisplay,
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                  padding: '6px',
                  background: '#D7E8FF',
                  border: '2px solid #000000',
                  borderRadius: '2px',
                }}
              >
                {(v.homeMenuItems || []).map((m: any, mI: number) => (
                  <Fragment key={mI}>
                    <div
                      className="gl-menu-item"
                      onClick={m.run}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '38px',
                        padding: '0 8px',
                        borderRadius: '2px',
                        fontFamily: PIXEL,
                        fontSize: '12px',
                        color: '#2B3E60',
                        textAlign: 'left',
                      }}
                    >
                      <MenuIcon kind={m.icon} />
                      {m.label}
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                ref={v.setFtueHomeNav}
                style={{
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  zIndex: '12',
                  transform: v.wmNavT,
                  transition: v.wmChromeTr,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(40,42,60,.7)',
                    border: '2px solid #1D1C24',
                    borderRadius: '6px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {(v.navItems || []).map((n: any, nI: number) => (
                    <Fragment key={nI}>
                      <div
                        data-fx={n.fx}
                        onClick={n.run}
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          marginLeft: n.nudge,
                          zIndex: n.z,
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '80px',
                            aspectRatio: '1 / 1',
                            borderRadius: '6px',
                            border: `2px solid ${n.bd}`,
                            background: n.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '6px',
                              backgroundImage:
                                'url(/art/PocketKnights/Pattern/MenuButtonPatten.svg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: n.patternDisplay,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              top: '-17px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              display: n.tipDisplay,
                              whiteSpace: 'nowrap',
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '19px',
                              color: '#FFFFFF',
                              WebkitTextStroke: '5px #000000',
                              paintOrder: 'stroke fill',
                            }}
                          >
                            {n.label}
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '8px',
                              zIndex: '1',
                              width: '12px',
                              height: '12px',
                              animation:
                                'glDotBounce 700ms cubic-bezier(.3,1.8,.5,1)',
                              borderRadius: '50%',
                              background: '#FF4D4D',
                              border: '1.5px solid #1D1C24',
                              display: n.alertDisplay,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                            }}
                          >
                            <div
                              style={{
                                width: `calc(${n.icon} * 1.45)`,
                                height: `calc(${n.icon} * 1.45)`,
                                backgroundImage: `url(${n.img})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated',
                              }}
                            ></div>
                            <div
                              style={{
                                display: n.subDisplay,
                                fontFamily: 'VolterTitle,Volter,monospace',
                                fontSize: '12px',
                                lineHeight: '1',
                                color: '#CBD9EC',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {n.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isHeroStep ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                background: '#283C74',
                padding: '16px',
                gap: '14px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontFamily: 'VolterTitle,Volter,monospace',
                  fontSize: '18px',
                  color: '#FFF2B0',
                  letterSpacing: '.02em',
                }}
              >
                {v.heroStepTitle}
              </div>

              <div
                style={{
                  display: v.heartPiecesDisplay,
                  alignItems: 'center',
                  gap: '9px',
                  border: '1px solid #3A4C74',
                  borderRadius: '6px',
                  background: 'rgba(20,29,46,.55)',
                  padding: '8px 10px',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    flexShrink: '0',
                    backgroundImage: `url(${v.heartIcon})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    minWidth: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '11px',
                      color: '#FFF2B0',
                    }}
                  >
                    {v.heartPiecesLabel}
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#9DB4D4',
                      lineHeight: '1.6',
                    }}
                  >
                    {v.heartPiecesNote}
                  </div>
                </div>
              </div>

              <div
                ref={v.setFtueHero}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {(v.heroCards || []).map((h: any, hI: number) => (
                  <Fragment key={hI}>
                    <div
                      onClick={h.pick}
                      style={{
                        cursor: 'pointer',
                        border: `2px solid ${h.bd}`,
                        background: h.bg,
                        borderRadius: '8px 0 8px 0',
                        padding: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          flexShrink: '0',
                          border: '2px solid #304A69',
                          borderRadius: '3px',
                          backgroundColor: '#141D2E',
                          backgroundImage: `url(${h.img})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center top',
                          backgroundRepeat: 'no-repeat',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '14px',
                            color: '#FDFDFD',
                          }}
                        >
                          {h.name}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#FFFFFF',
                            opacity: '.8',
                            lineHeight: '1.5',
                          }}
                        >
                          {h.perkLine}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            fontSize: '9px',
                            letterSpacing: '.08em',
                          }}
                        >
                          <span style={{ color: '#FF9EA1' }}>{h.hpLabel}</span>
                          <span style={{ color: '#9DB4D4' }}>
                            HEARTS {h.heartsLabel}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '3px',
                          background: h.tickBg,
                          color: '#141212',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {h.tick}
                      </div>
                    </div>
                    <div
                      onClick={h.upgradeRun || undefined}
                      style={{
                        display: h.upgradeDisplay,
                        cursor: h.upgradeCursor,
                        opacity: h.upgradeOpacity,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        height: '34px',
                        marginTop: '-2px',
                        padding: '0 10px',
                        border: '3px solid #000000',
                        borderRadius: '0 0 8px 2px',
                        background: h.upgradeBg,
                        boxShadow: h.upgradeShadow,
                        color: '#000000',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '11px',
                      }}
                    >
                      <span>{h.upgradeLabel}</span>
                      <span style={{ fontSize: '9px', opacity: '.75' }}>
                        {h.upgradeCost}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                ref={v.setFtueHeroCta}
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  display: 'flex',
                  gap: '9px',
                }}
              >
                {(v.heroStepActions || []).map((a: any, aI: number) => (
                  <Fragment key={aI}>
                    <div
                      onClick={a.run}
                      style={{
                        cursor: 'pointer',
                        flex: a.flex,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: a.h,
                        border: '3px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: a.bg,
                        boxShadow: a.shadow,
                        color: '#000000',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: `calc(${a.size} * 1.5)`,
                        lineHeight: '1.05',
                        textAlign: 'center',
                        textWrap: 'balance',
                      }}
                    >
                      {a.label}
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {v.isGearStep ? (
          <>
            <div
              style={{
                position: 'relative',
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                background: '#283C74',
                padding: '16px',
                gap: '9px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {(v.gearStepActions || []).map((a: any, aI: number) => (
                  <Fragment key={aI}>
                    <div
                      onClick={a.run}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '26px',
                        padding: '0 10px',
                        border: '1px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: '#B5C0FF',
                        boxShadow:
                          '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                        color: '#000000',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '15px',
                        lineHeight: '1.05',
                        textAlign: 'center',
                        textWrap: 'balance',
                      }}
                    >
                      {a.label}
                    </div>
                  </Fragment>
                ))}
                <div
                  style={{ flex: '1', height: '1px', background: '#485E9C' }}
                ></div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#1D2956',
                  borderRadius: '8px 0 8px 0',
                  padding: '7px 10px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      flexShrink: '0',
                      border: '2px solid #304A69',
                      borderRadius: '3px',
                      backgroundColor: '#141D2E',
                      backgroundImage: `url(${v.heroImg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center top',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                    }}
                  ></div>
                  <div
                    style={{
                      flex: '1',
                      minWidth: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#141D2E',
                      borderRadius: '3px',
                      height: '22px',
                      paddingLeft: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '12px',
                        color: '#FDFDFD',
                      }}
                    >
                      {v.heroName}
                    </div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        background: '#FFF2B0',
                        padding: '0 6px',
                      }}
                    >
                      <span style={{ fontSize: '9px', color: '#141212' }}>
                        {v.heroPerkLine}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  background: '#1D2956',
                  borderRadius: '8px 0 8px 0',
                  padding: '10px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    zIndex: '15',
                    display: v.peekDisplay,
                    flexDirection: 'column',
                    gap: '5px',
                    background: 'rgba(20,29,46,.97)',
                    border: '1px solid #3A4C74',
                    borderRadius: '8px 0 8px 0',
                    padding: '9px 10px',
                    boxShadow: '0 6px 14px rgba(0,0,0,.45)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        flexShrink: '0',
                        borderRadius: '4px',
                        backgroundColor: '#141D2E',
                        backgroundImage: `url(${v.peekIcon})`,
                        backgroundSize: '80%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      style={{
                        flex: '1',
                        minWidth: '0',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '5px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.peekName}
                      </div>
                      <div
                        style={{
                          flexShrink: '0',
                          fontSize: '8px',
                          color: v.peekRarityColor,
                          letterSpacing: '.1em',
                        }}
                      >
                        {v.peekRarity}
                      </div>
                    </div>
                    <div
                      style={{
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundImage: `url(${v.peekTypeIcon})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <span
                        style={{
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '12px',
                          color: v.peekTypeColor,
                        }}
                      >
                        {v.peekPower}
                      </span>
                    </div>
                    <div
                      onClick={v.closePeek}
                      style={{
                        flexShrink: '0',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '3px',
                        background: '#2B3A5C',
                        color: '#CBD9EC',
                        fontSize: '11px',
                        lineHeight: '1',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#CBD9EC',
                      lineHeight: '1.5',
                      textWrap: 'pretty',
                    }}
                  >
                    {v.peekWhat}
                  </div>
                  <div
                    style={{
                      display: v.peekRiderDisplay,
                      alignItems: 'flex-start',
                      gap: '5px',
                      borderTop: '1px solid #2B3A5C',
                      paddingTop: '5px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        flexShrink: '0',
                        marginTop: '1px',
                        backgroundImage: `url(${v.peekRiderIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      style={{
                        flex: '1',
                        minWidth: '0',
                        fontSize: '9px',
                        color: '#CBD9EC',
                        lineHeight: '1.5',
                        textWrap: 'pretty',
                      }}
                    >
                      <span style={{ color: v.peekRiderColor }}>
                        {v.peekRiderTitle}
                      </span>{' '}
                      {v.peekRiderText}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#8A9BBF',
                      letterSpacing: '.08em',
                    }}
                  >
                    NOT EQUIPPED - TAP THE GEAR TO EQUIP
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#FFFFFF',
                      opacity: '.75',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.equipRule}
                  </div>
                  <div
                    style={{
                      flexShrink: '0',
                      fontSize: '9px',
                      color: '#FFFFFF',
                      opacity: '.75',
                    }}
                  >
                    Max 2 per type
                  </div>
                </div>
                <div
                  ref={v.setFtueSlots}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {(v.slots || []).map((s: any, sI: number) => (
                    <Fragment key={sI}>
                      <div
                        onClick={s.inspect}
                        style={{
                          position: 'relative',
                          flex: '1',
                          maxWidth: '52px',
                          aspectRatio: '1/1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          borderRadius: '3px',
                          border: `2px solid ${s.bd}`,
                          background: s.bg,
                          cursor: s.cursor,
                          boxShadow: s.ring,
                        }}
                      >
                        <div
                          style={{
                            width: '80%',
                            height: '80%',
                            backgroundImage: `url(${s.icon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                            opacity: s.iconOpacity,
                          }}
                        ></div>
                        <div
                          style={{
                            position: 'absolute',
                            inset: '8%',
                            border: '2px dashed #283C74',
                            borderRadius: '6px',
                            opacity: s.emptyOpacity,
                          }}
                        ></div>
                        <div
                          onClick={s.clear}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-8px',
                            zIndex: '3',
                            width: '30px',
                            height: '30px',
                            display: s.infoDisplay,
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            padding: '7px',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              width: '15px',
                              height: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '0 0 4px 0',
                              background: '#B5C0FF',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '10px',
                                lineHeight: '1',
                                color: '#141212',
                              }}
                            >
                              ×
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '16px',
                            height: '16px',
                            background: '#485E9C',
                            borderRadius: '3px 0 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: s.iconOpacity,
                          }}
                        >
                          <div
                            style={{
                              width: '9px',
                              height: '9px',
                              backgroundImage: `url(${s.typeIcon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                            }}
                          ></div>
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderTop: '1px solid #2B3A5C',
                    paddingTop: '7px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <div
                      onClick={v.slotPrev}
                      style={{
                        flexShrink: '0',
                        width: '18px',
                        height: '18px',
                        display: v.slotPagerDisplay,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '3px',
                        background: '#2B3A5C',
                        color: '#CBD9EC',
                        fontSize: '10px',
                        lineHeight: '1',
                        cursor: 'pointer',
                      }}
                    >
                      ‹
                    </div>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        flexShrink: '0',
                        display: v.slotInfoIconDisplay,
                        backgroundImage: `url(${v.slotInfoIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      style={{
                        flex: '1',
                        minWidth: '0',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '5px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.slotInfoName}
                      </div>
                      <div
                        style={{
                          flexShrink: '0',
                          fontSize: '8px',
                          color: v.slotInfoRarityColor,
                          letterSpacing: '.1em',
                        }}
                      >
                        {v.slotInfoRarity}
                      </div>
                    </div>
                    <div
                      style={{
                        flexShrink: '0',
                        display: v.slotInfoIconDisplay,
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <div
                        style={{
                          width: '11px',
                          height: '11px',
                          backgroundImage: `url(${v.slotInfoTypeIcon})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <span
                        style={{
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '11px',
                          color: v.slotInfoTypeColor,
                        }}
                      >
                        {v.slotInfoPower}
                      </span>
                    </div>
                    <div
                      onClick={v.slotNext}
                      style={{
                        flexShrink: '0',
                        width: '18px',
                        height: '18px',
                        display: v.slotPagerDisplay,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '3px',
                        background: '#2B3A5C',
                        color: '#CBD9EC',
                        fontSize: '10px',
                        lineHeight: '1',
                        cursor: 'pointer',
                      }}
                    >
                      ›
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#CBD9EC',
                      lineHeight: '1.5',
                      textWrap: 'pretty',
                    }}
                  >
                    {v.slotInfoWhat}
                  </div>
                  <div
                    style={{
                      display: v.slotInfoRiderDisplay,
                      alignItems: 'flex-start',
                      gap: '5px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        flexShrink: '0',
                        marginTop: '1px',
                        backgroundImage: `url(${v.slotInfoRiderIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      style={{
                        flex: '1',
                        minWidth: '0',
                        fontSize: '9px',
                        color: '#CBD9EC',
                        lineHeight: '1.5',
                        textWrap: 'pretty',
                      }}
                    >
                      <span style={{ color: v.slotInfoRiderColor }}>
                        {v.slotInfoRiderTitle}
                      </span>{' '}
                      {v.slotInfoRiderText}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: '1',
                  minHeight: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#1D2956',
                  borderRadius: '8px 0 8px 0',
                  padding: '0 0 10px',
                }}
              >
                <div
                  style={{
                    flexShrink: '0',
                    display: 'flex',
                    height: '32px',
                    width: '100%',
                    background: '#141D2E',
                    borderRadius: '8px 0 8px 0',
                    overflow: 'hidden',
                  }}
                >
                  {(v.tabs || []).map((t: any, tI: number) => (
                    <Fragment key={tI}>
                      <div
                        onClick={t.pick}
                        style={{
                          flex: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          background: t.bg,
                          color: t.fg,
                          fontSize: '12px',
                          letterSpacing: '.06em',
                          borderRadius: '8px 0 8px 0',
                        }}
                      >
                        {t.label} {t.count}
                      </div>
                    </Fragment>
                  ))}
                </div>
                <div
                  ref={v.setFtueGear}
                  style={{
                    flex: '1',
                    minHeight: '0',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4,1fr)',
                    gap: '6px',
                    padding: '0 10px',
                    justifyItems: 'center',
                    alignContent: 'start',
                  }}
                >
                  {(v.gearCards || []).map((g: any, gI: number) => (
                    <Fragment key={gI}>
                      <div
                        onClick={g.toggle}
                        style={{
                          width: '100%',
                          maxWidth: '68px',
                          aspectRatio: '1/1',
                          padding: '2px',
                          cursor: g.cursor,
                          opacity: g.opacity,
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            height: '100%',
                            width: '100%',
                            borderRadius: '8px 0 8px 0',
                            background: '#485E9C',
                            border: '2px solid #657BB9',
                            padding: '7px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '80%',
                              height: '80%',
                              backgroundImage: `url(${g.icon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                              filter: g.lockFilter,
                            }}
                          ></div>
                          <div
                            onClick={g.inspect}
                            style={{
                              position: 'absolute',
                              right: '-10px',
                              top: '-10px',
                              zIndex: '3',
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-end',
                              padding: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '0 0 0 4px',
                                background: g.infoBg,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'VolterTitle,Volter,monospace',
                                  fontSize: '10px',
                                  lineHeight: '1',
                                  color: '#141212',
                                }}
                              >
                                i
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              left: '-2px',
                              top: '-2px',
                              display: g.riderDisplay,
                              alignItems: 'center',
                              height: '14px',
                              padding: '0 3px',
                              borderRadius: '8px 0 4px 0',
                              background: g.riderColor,
                              zIndex: '1',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'VolterTitle,Volter,monospace',
                                fontSize: '8px',
                                color: '#141212',
                              }}
                            >
                              {g.riderTag}
                            </span>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              left: '0',
                              bottom: '0',
                              width: '100%',
                              padding: '0 4px',
                              background: g.rarityColor,
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '8px',
                              lineHeight: '1.5',
                              color: '#141212',
                              overflow: 'hidden',
                              textOverflow: 'clip',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {g.levelName}
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              right: '-2px',
                              bottom: '-2px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              borderRadius: '4px 0 8px 0',
                              background: '#657BB9',
                              padding: '0 4px',
                            }}
                          >
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                backgroundImage: `url(${g.typeIcon})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated',
                              }}
                            ></div>
                            <span
                              style={{
                                fontFamily: 'VolterTitle,Volter,monospace',
                                fontSize: '10px',
                                color: '#FFFFFF',
                              }}
                            >
                              {g.power}
                            </span>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              left: '-2px',
                              top: '-2px',
                              width: 'calc(100% + 4px)',
                              height: 'calc(100% + 4px)',
                              zIndex: '2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0,0,0,.5)',
                              borderRadius: '8px 0 8px 0',
                              opacity: g.tickOpacity,
                            }}
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '22px',
                                borderRight: '5px solid #AEE45D',
                                borderBottom: '5px solid #AEE45D',
                                transform: 'rotate(45deg)',
                                marginTop: '-6px',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>

              <div
                ref={v.setFtueGearCta}
                style={{
                  flexShrink: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingTop: '2px',
                }}
              >
                <div
                  onClick={v.startRun}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '46px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: v.startBg,
                    boxShadow: v.startShadow,
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '22.5px',
                    opacity: v.startOpacity,
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  {v.startLabel}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isBattle ? (
          <>
            <div
              data-juice="column"
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 auto',
                  minHeight: 'clamp(190px,34vh,300px)',
                  backgroundImage: `url(${v.bgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingTop: '44px',
                  paddingBottom: '14px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    background:
                      'linear-gradient(180deg,rgba(11,16,32,.55),rgba(11,16,32,.15) 45%,rgba(28,33,52,.95))',
                  }}
                ></div>

                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    zIndex: '2',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      flex: '1',
                      minWidth: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      background: 'rgba(33,56,84,.85)',
                      border: '1px solid #213854',
                      borderRadius: '4px',
                      padding: '4px 8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '7px',
                        minWidth: '0',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '13px',
                          color: '#FFF2B0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.waveLabel}
                      </div>
                      <div
                        style={{
                          display: v.bossFlagDisplay,
                          flexShrink: '0',
                          alignItems: 'center',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          background: '#7A3038',
                          color: '#FFD9DC',
                          fontSize: '8px',
                          letterSpacing: '.1em',
                        }}
                      >
                        {v.bossFlagLabel}
                      </div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          fontSize: '11px',
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.monsterName}
                      </div>
                      <div
                        style={{
                          flexShrink: '0',
                          fontSize: '9px',
                          letterSpacing: '.06em',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          color: v.affixColor,
                          border: `1px solid ${v.affixBd}`,
                          background: v.affixBg,
                          opacity: v.affixOpacity,
                        }}
                      >
                        {v.affixLabel}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#9DB4D4',
                        letterSpacing: '.1em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.locationName} / {v.scoreLabel} {v.score} / TURN{' '}
                      {v.turns}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: '0 0 auto',
                      minWidth: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        marginTop: '2px',
                      }}
                    >
                      <div
                        onClick={v.openPause}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          width: '34px',
                          height: '34px',
                          border: '2px solid #213854',
                          background: 'rgba(33,56,84,.85)',
                          borderRadius: '4px',
                        }}
                      >
                        <div
                          style={{
                            width: '4px',
                            height: '14px',
                            background: '#FFF2B0',
                          }}
                        ></div>
                        <div
                          style={{
                            width: '4px',
                            height: '14px',
                            background: '#FFF2B0',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    zIndex: '1',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    data-juice="monster"
                    style={{
                      position: 'relative',
                      width: 'clamp(96px,22vh,190px)',
                      height: 'clamp(96px,22vh,190px)',
                      opacity: v.monsterOpacity,
                      backgroundImage: v.monsterSheet
                        ? 'none'
                        : `url(${v.monsterUrl})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center bottom',
                      imageRendering: 'pixelated',
                      animation: v.monsterAnim,
                    }}
                  >
                    {/* Idle sheet: one strip of 8 square frames slid a frame
                        at a time inside a square window; the juice tweens
                        above still move the whole monster. */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '0',
                        height: '100%',
                        aspectRatio: '1 / 1',
                        maxWidth: '100%',
                        transform: 'translateX(-50%)',
                        overflow: 'hidden',
                        display: v.monsterSheet ? 'block' : 'none',
                      }}
                    >
                      <div
                        data-idle=""
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '0',
                          width: '800%',
                          height: '100%',
                          background: `url(${v.monsterSheet}) 0 0/100% 100% no-repeat`,
                          imageRendering: 'pixelated',
                          animation: v.monsterIdleAnim,
                          willChange: 'transform',
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        inset: '0',
                        overflow: 'visible',
                        display: v.slashDisplay,
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          width: '120%',
                          height: '7px',
                          borderRadius: '9999px',
                          background:
                            'linear-gradient(90deg,rgba(255,255,255,0),#FFFFFF 45%,#FFF2B0 60%,rgba(255,242,176,0))',
                          boxShadow: '0 0 12px 4px rgba(255,255,255,.75)',
                          animation: v.slashAnimA,
                        }}
                      ></div>
                      <div
                        style={{
                          position: 'absolute',
                          width: '96%',
                          height: '5px',
                          borderRadius: '9999px',
                          background:
                            'linear-gradient(90deg,rgba(255,255,255,0),#FFFFFF 50%,rgba(255,158,161,0))',
                          boxShadow: '0 0 10px 3px rgba(255,140,140,.7)',
                          animation: v.slashAnimB,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div
                    ref={v.setFtueEnemy}
                    style={{
                      width: '250px',
                      maxWidth: '80%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        height: '10px',
                        border: '2px solid #000000',
                        borderRadius: '3px',
                        background: '#213854',
                        overflow: 'hidden',
                        animation: v.enemyBarAnim,
                      }}
                    >
                      {/* A pale trail lags the red bar, so a hit reads as a chunk
                          knocked off before it drains. */}
                      <div style={{ position: 'relative', height: '100%' }}>
                        <div
                          style={{
                            position: 'absolute',
                            inset: '0',
                            background: '#FFB0A8',
                            transformOrigin: '0 50%',
                            transform: `scaleX(${v.enemyFrac})`,
                            transition: 'transform 400ms ease-out 250ms',
                          }}
                        ></div>
                        <div
                          style={{
                            position: 'absolute',
                            inset: '0',
                            background: '#D14141',
                            transformOrigin: '0 50%',
                            transform: `scaleX(${v.enemyFrac})`,
                            transition: 'transform 120ms ease-out',
                          }}
                        ></div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: '0',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '9px',
                            color: '#9DB4D4',
                            whiteSpace: 'nowrap',
                            animation: v.enemyHpAnim,
                          }}
                        >
                          {v.enemyHpShown} / {v.enemyMaxHp}
                        </div>
                        <div
                          style={{
                            position: 'relative',
                            display: v.monsterStatusDisplay,
                            alignItems: 'center',
                            gap: '8px',
                            flexShrink: '0',
                            pointerEvents: 'auto',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: '-4px',
                              bottom: '100%',
                              marginBottom: '7px',
                              width: '158px',
                              display: v.monsterTipDisplay,
                              flexDirection: 'column',
                              gap: '2px',
                              background: 'rgba(20,29,46,.96)',
                              border: '1px solid #3A4C74',
                              borderRadius: '4px',
                              padding: '5px 7px',
                              zIndex: '20',
                              pointerEvents: 'none',
                            }}
                          >
                            <div
                              style={{
                                fontFamily: 'VolterTitle,Volter,monospace',
                                fontSize: '9px',
                                color: '#FFF2B0',
                              }}
                            >
                              {v.monsterTipName}
                            </div>
                            <div
                              style={{
                                fontSize: '9px',
                                color: '#CBD9EC',
                                lineHeight: '1.5',
                                textWrap: 'pretty',
                              }}
                            >
                              {v.monsterTipText}
                            </div>
                          </div>
                          {(v.monsterStatuses || []).map(
                            (s: any, sI: number) => (
                              <Fragment key={sI}>
                                <div
                                  onPointerEnter={s.enter}
                                  onPointerLeave={s.leave}
                                  onClick={s.tap}
                                  style={{
                                    position: 'relative',
                                    width: '15px',
                                    height: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'help',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '15px',
                                      height: '15px',
                                      backgroundImage: `url(${s.icon})`,
                                      backgroundSize: 'contain',
                                      backgroundRepeat: 'no-repeat',
                                      backgroundPosition: 'center',
                                      imageRendering: 'pixelated',
                                    }}
                                  ></div>
                                  <span
                                    style={{
                                      position: 'absolute',
                                      right: '-1px',
                                      bottom: '-1px',
                                      fontFamily:
                                        'VolterTitle,Volter,monospace',
                                      fontSize: '9px',
                                      lineHeight: '1',
                                      color: '#FFFFFF',
                                      WebkitTextStroke: '3px #000000',
                                      paintOrder: 'stroke fill',
                                    }}
                                  >
                                    {s.value}
                                  </span>
                                </div>
                              </Fragment>
                            )
                          )}
                        </div>
                      </div>
                      <div
                        onPointerEnter={v.intentEnter}
                        onPointerLeave={v.intentLeave}
                        onClick={v.intentTap}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'help',
                          pointerEvents: 'auto',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            right: '-4px',
                            bottom: '100%',
                            marginBottom: '7px',
                            width: '170px',
                            display: v.intentTipDisplay,
                            flexDirection: 'column',
                            gap: '2px',
                            background: 'rgba(20,29,46,.96)',
                            border: '1px solid #3A4C74',
                            borderRadius: '4px',
                            padding: '5px 7px',
                            zIndex: '20',
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '9px',
                              color: '#FFF2B0',
                            }}
                          >
                            {v.intentTipName}
                          </div>
                          <div
                            style={{
                              fontSize: '9px',
                              color: '#CBD9EC',
                              lineHeight: '1.5',
                              textWrap: 'pretty',
                            }}
                          >
                            {v.intentTipText}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: v.intentColor,
                            whiteSpace: 'nowrap',
                            animation: v.intentAnim,
                          }}
                        >
                          {v.intentValue}
                        </div>
                        <div
                          ref={v.setFtueTrack}
                          style={{ display: 'flex', gap: '3px' }}
                        >
                          {(v.meterNotches || []).map((n: any, nI: number) => (
                            <Fragment key={nI}>
                              <div
                                style={{
                                  width: '16px',
                                  height: '7px',
                                  border: '2px solid #000000',
                                  borderRadius: '2px',
                                  background: n.fill,
                                }}
                              ></div>
                            </Fragment>
                          ))}
                        </div>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            marginLeft: '1px',
                            backgroundImage: `url(${v.intentIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                            animation: v.intentAnim,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    pointerEvents: 'none',
                    boxShadow: `inset 0 0 46px 10px ${v.telegraphColor}`,
                    opacity: v.telegraphOpacity,
                    animation: v.telegraphAnim,
                  }}
                ></div>
              </div>

              <div
                style={{
                  background: '#1C2134',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderTop: '1px solid #213854',
                  /* This strip is fixed-height content and must not shrink.
                     Saying so also fixes the board measurement: measureBoard
                     charges a shrinkable sibling its min-height, and this one
                     had none, so it was charged nothing and the board was sized
                     ~46px too tall before trimBoard clawed it back. */
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    flexShrink: '0',
                    borderRadius: '3px',
                    backgroundImage: `url(${v.heroImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                    animation: v.playerAnim,
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div
                    style={{
                      height: '9px',
                      border: '2px solid #000000',
                      borderRadius: '3px',
                      background: '#213854',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      data-juice="hero-hp"
                      style={{
                        height: '100%',
                        background: '#2F9E5B',
                        width: `${v.playerPct}%`,
                        transition: 'width .3s',
                      }}
                    ></div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '9px',
                      color: '#9DB4D4',
                    }}
                  >
                    <span>
                      {v.playerHp} / {v.playerMaxHp} HP
                    </span>
                    <span>{v.perkText}</span>
                  </div>
                </div>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: '0',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: '0',
                      bottom: '100%',
                      marginBottom: '7px',
                      width: '158px',
                      display: v.heroTipDisplay,
                      flexDirection: 'column',
                      gap: '2px',
                      background: 'rgba(20,29,46,.96)',
                      border: '1px solid #3A4C74',
                      borderRadius: '4px',
                      padding: '5px 7px',
                      zIndex: '20',
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '9px',
                        color: '#FFF2B0',
                      }}
                    >
                      {v.heroTipName}
                    </div>
                    <div
                      data-juice="hero-status"
                      style={{
                        fontSize: '9px',
                        color: '#CBD9EC',
                        lineHeight: '1.5',
                        textWrap: 'pretty',
                      }}
                    >
                      {v.heroTipText}
                    </div>
                  </div>
                  {(v.heroStatuses || []).map((s: any, sI: number) => (
                    <Fragment key={sI}>
                      <div
                        onPointerEnter={s.enter}
                        onPointerLeave={s.leave}
                        onClick={s.tap}
                        style={{
                          position: 'relative',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'help',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundImage: `url(${s.icon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span
                          style={{
                            position: 'absolute',
                            right: '-1px',
                            bottom: '-1px',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '9px',
                            lineHeight: '1',
                            color: '#FFFFFF',
                            WebkitTextStroke: '3px #000000',
                            paintOrder: 'stroke fill',
                          }}
                        >
                          {s.value}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>

              <div
                style={{
                  flex: '0 0 auto',
                  background: 'rgba(28,33,52,.96)',
                  borderTop: '2px solid rgba(255,242,176,.4)',
                  borderRadius: '16px 16px 0 0',
                  padding: '9px 9px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    height: '20px',
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: v.previewDisplay,
                      fontSize: '11px',
                      color: v.previewColor,
                      transition: 'color .2s',
                    }}
                  >
                    {v.previewText}
                  </div>
                  {/* Chain maths as chips: power x mult = value, plus a bomb
                      badge when the chain will forge one. */}
                  <div
                    style={{
                      display: v.chipsDisplay,
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      rowGap: '4px',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      lineHeight: '1',
                    }}
                  >
                    <div
                      style={{
                        padding: '3px 8px 4px',
                        border: '2px solid #000000',
                        borderRadius: '6px 2px 6px 2px',
                        background: '#3459C2',
                        boxShadow: 'inset 0 -3px 0 #142663',
                        color: '#FFFFFF',
                        fontSize: '15px',
                        animation: v.chipPowerAnim,
                      }}
                    >
                      {v.chipPower}
                    </div>
                    <div
                      style={{
                        padding: '3px 8px 4px',
                        border: '2px solid #000000',
                        borderRadius: '6px 2px 6px 2px',
                        background: '#B23A44',
                        boxShadow: 'inset 0 -3px 0 #561520',
                        color: '#FFFFFF',
                        fontSize: '15px',
                        animation: v.chipMultAnim,
                      }}
                    >
                      {v.chipMult}
                    </div>
                    <div style={{ fontSize: '13px', color: v.previewColor }}>
                      {v.chipRest}
                    </div>
                    <div
                      style={{
                        display: v.chipBombDisplay,
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px 3px 4px',
                        border: '2px solid #000000',
                        borderRadius: '6px 2px 6px 2px',
                        background: '#FFC24B',
                        boxShadow: 'inset 0 -3px 0 #B5701A',
                        color: '#000000',
                        fontSize: '13px',
                        animation: 'glBombBadge 700ms ease-in-out infinite',
                      }}
                    >
                      <div
                        style={{
                          width: '17px',
                          height: '17px',
                          background:
                            'url(/fx/icons/bomb.png) 0 0/17px 17px no-repeat',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      +BOMB
                    </div>
                    <div
                      style={{
                        display: v.chipExtraDisplay,
                        fontSize: '11px',
                        color: '#CBD9EC',
                      }}
                    >
                      {v.chipExtra}
                    </div>
                  </div>
                </div>
                <div
                  ref={v.boardWrapRef}
                  style={{
                    height: `${v.boardH}px`,
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: v.boardOpacity,
                    transition: 'opacity .2s',
                  }}
                >
                  <div
                    data-juice-board="main"
                    ref={v.setFtueBoard}
                    onPointerDown={v.onDown}
                    onPointerMove={v.onMove}
                    onPointerUp={v.onUp}
                    onPointerCancel={v.onCancel}
                    style={{
                      position: 'relative',
                      width: `${v.boardW}px`,
                      height: `${v.boardH}px`,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6,minmax(0,1fr))',
                      gridTemplateRows: 'repeat(5,minmax(0,1fr))',
                      gap: '4px',
                      touchAction: 'none',
                      userSelect: 'none',
                      animation: v.boardAnim,
                    }}
                  >
                    {(v.cells || []).map((c: any, cI: number) => (
                      <Fragment key={cI}>
                        <div
                          data-cell={c.i}
                          style={{
                            position: 'relative',
                            minHeight: '0',
                            transform: c.scale,
                            transition:
                              'transform 160ms cubic-bezier(.34,1.8,.64,1)',
                            zIndex: c.z,
                            opacity: c.cellOpacity,
                            animation: c.anim,
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '8px',
                              border: `2px solid ${c.bd}`,
                              background: c.face,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                              animation: c.glowAnim,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '-3px',
                              borderRadius: '10px',
                              pointerEvents: 'none',
                              boxShadow:
                                '0 0 0 2px #FFF2B0, 0 0 14px 4px rgba(255,242,176,.75)',
                              opacity: c.hintOpacity,
                              animation: c.hintAnim,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '-6px',
                              borderRadius: '9999px',
                              border: '3px solid rgba(255,240,200,.95)',
                              boxShadow: '0 0 18px 6px rgba(255,150,60,.85)',
                              pointerEvents: 'none',
                              opacity: c.ringOpacity,
                              animation: c.ring,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '2px',
                              pointerEvents: 'none',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: '13%',
                                background: `url(${c.icon}) center/contain no-repeat`,
                                filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.45))',
                              }}
                            ></div>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              top: '1px',
                              left: '3px',
                              fontSize: '9px',
                              color: '#FFFFFF',
                              pointerEvents: 'none',
                            }}
                          >
                            {c.order}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                    <svg
                      viewBox={'0 0 100 100'}
                      preserveAspectRatio={'none'}
                      style={{
                        position: 'absolute',
                        inset: '0',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: '6',
                        opacity: v.lineOpacity,
                      }}
                    >
                      <polyline
                        points={v.chainPoints}
                        fill={'none'}
                        stroke={'#0B0D1A'}
                        strokeWidth={v.chainUnderW}
                        strokeLinecap={'square'}
                        strokeLinejoin={'miter'}
                        vectorEffect={'non-scaling-stroke'}
                      />
                      <polyline
                        points={v.chainPoints}
                        fill={'none'}
                        stroke={v.chainColor}
                        strokeWidth={v.chainW}
                        strokeLinecap={'square'}
                        strokeLinejoin={'miter'}
                        strokeDasharray={v.chainDash}
                        vectorEffect={'non-scaling-stroke'}
                        style={{
                          animation: 'glDashFlow 520ms linear infinite',
                          filter: v.chainGlow,
                        }}
                      />
                    </svg>
                    {(v.pops || []).map((p: any, pI: number) => (
                      <Fragment key={pI}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            top: p.top,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: p.size,
                            color: p.color,
                            textShadow: '0 2px 0 #141D2E',
                            WebkitTextStroke: '4px #141D2E',
                            paintOrder: 'stroke fill',
                            animation: p.anim,
                          }}
                        >
                          {p.text}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: '0',
                    /* Fixed two-line box. This line's text changes with the
                       wave's affix, and a one-line vs two-line wrap would move
                       the panel's chrome height - which is what measureBoard
                       subtracts to size the grid. Letting it wrap resized the
                       board every time an affixed wave walked in. */
                    height: '29px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    textAlign: 'center',
                    fontSize: '9px',
                    color: '#9DB4D4',
                    lineHeight: '1.6',
                  }}
                >
                  {v.boardHint}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isShop ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                background: '#283C74',
                padding: '14px',
                gap: '10px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '0',
                  }}
                >
                  <div
                    onClick={v.goHome}
                    style={{
                      cursor: 'pointer',
                      flexShrink: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '26px',
                      padding: '0 10px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    HOME
                  </div>
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      color: '#FFF2B0',
                    }}
                  >
                    SHOP
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(33,56,84,.85)',
                      border: '1px solid #213854',
                      borderRadius: '4px',
                      padding: '3px 7px',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        flexShrink: '0',
                        backgroundImage: `url(${v.coinIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      data-fx="coins"
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '12px',
                        color: '#FCE370',
                        animation: v.coinAnim,
                      }}
                    >
                      {v.coinsShown}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(33,56,84,.85)',
                      border: '1px solid #213854',
                      borderRadius: '4px',
                      padding: '3px 7px',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        flexShrink: '0',
                        backgroundImage: `url(${v.gemIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      data-fx="gems"
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '12px',
                        color: '#8FE3FF',
                        animation: v.gemAnim,
                      }}
                    >
                      {v.gemsShown}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  height: '42px',
                  width: '100%',
                  background: '#141D2E',
                  borderRadius: '4px',
                  padding: '2px',
                  gap: '2px',
                  flexShrink: '0',
                }}
              >
                {(v.shopTabs || []).map((t: any, tI: number) => (
                  <Fragment key={tI}>
                    <div
                      onClick={t.run}
                      style={{
                        cursor: 'pointer',
                        flex: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        borderRadius: '3px',
                        background: t.bg,
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '15px',
                        color: t.fg,
                      }}
                    >
                      <div
                        style={{
                          width: '13px',
                          height: '13px',
                          display: t.iconDisplay,
                          backgroundImage: `url(${t.icon})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <span>{t.label}</span>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  display: v.shopMsgDisplay,
                  background: '#1D2956',
                  border: '1px solid #3A4C74',
                  borderRadius: '4px',
                  padding: '7px 9px',
                  fontSize: '9px',
                  color: '#FFF2B0',
                  flexShrink: '0',
                }}
              >
                {v.shopMsg}
              </div>

              <div
                style={{
                  display: v.coinPaneDisplay,
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: '#CBD9EC',
                    lineHeight: '1.6',
                  }}
                >
                  Trade gems for coins. Coins buy packs and one-time monster
                  unlocks.
                </div>
                {(v.coinBundles || []).map((b: any, bI: number) => (
                  <Fragment key={bI}>
                    <div
                      data-fx-bundle
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#1D2956',
                        border: `2px solid ${b.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '9px',
                        animation: b.inAnim,
                      }}
                    >
                      <div
                        data-fx-stack
                        style={{
                          position: 'relative',
                          width: '38px',
                          height: b.stackH,
                          flexShrink: '0',
                        }}
                      >
                        {(b.stack || []).map((c: any, cI: number) => (
                          <div
                            key={cI}
                            style={{
                              position: 'absolute',
                              left: c.x,
                              bottom: c.y,
                              width: '26px',
                              height: '26px',
                              background: `url(${v.coinIcon}) center/contain no-repeat`,
                              imageRendering: 'pixelated',
                              filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.35))',
                            }}
                          ></div>
                        ))}
                      </div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '13px',
                            color: '#FCE370',
                          }}
                        >
                          {b.amount}
                        </div>
                        <div
                          style={{
                            display: b.bonusDisplay,
                            alignSelf: 'flex-start',
                            padding: '2px 10px 3px 6px',
                            background: b.bonusColor,
                            color: '#141212',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '11px',
                            clipPath:
                              'polygon(0 0,100% 0,calc(100% - 6px) 50%,100% 100%,0 100%)',
                            transformOrigin: '0 50%',
                            animation: 'glRibbon 1.8s ease-in-out infinite',
                          }}
                        >
                          {b.bonusLabel}
                        </div>
                      </div>
                      <div
                        onClick={b.buy}
                        style={{
                          cursor: b.cursor,
                          opacity: b.opacity,
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          minHeight: '34px',
                          padding: '0 11px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: b.btnBg,
                          boxShadow: b.btnShadow,
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '16.5px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            backgroundImage: `url(${v.gemIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span>{b.gems}</span>
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  display: v.gemPaneDisplay,
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: '#CBD9EC',
                    lineHeight: '1.6',
                  }}
                >
                  Gems buy premium packs and coin bundles. Gem bundles are
                  purchased with Reddit Gold.
                </div>
                {(v.gemBundles || []).map((b: any, bI: number) => (
                  <Fragment key={bI}>
                    <div
                      data-fx-bundle
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#1D2956',
                        border: `2px solid ${b.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '9px',
                        animation: b.inAnim,
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          flexShrink: '0',
                          backgroundImage: `url(${v.gemIcon})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '13px',
                            color: '#8FE3FF',
                          }}
                        >
                          {b.amount}
                        </div>
                        <div
                          style={{
                            display: b.bonusDisplay,
                            alignSelf: 'flex-start',
                            padding: '2px 10px 3px 6px',
                            background: b.bonusColor,
                            color: '#141212',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '11px',
                            clipPath:
                              'polygon(0 0,100% 0,calc(100% - 6px) 50%,100% 100%,0 100%)',
                            transformOrigin: '0 50%',
                            animation: 'glRibbon 1.8s ease-in-out infinite',
                          }}
                        >
                          {b.bonusLabel}
                        </div>
                      </div>
                      <div
                        onClick={b.buy}
                        role="button"
                        aria-label={b.priceAria}
                        style={{
                          cursor: 'pointer',
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          height: '32px',
                          padding: '0 14px 0 10px',
                          borderRadius: '999px',
                          background: '#0A449B',
                          color: '#FFFFFF',
                          fontFamily:
                            '"Reddit Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
                          fontSize: '14px',
                          fontWeight: '600',
                          lineHeight: '1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {/* Official Reddit Gold icon (filled), from the Devvit
                            payments design guidelines. */}
                        <svg
                          viewBox="0 0 20 20"
                          width="18"
                          height="18"
                          fill="currentColor"
                          aria-hidden="true"
                          style={{ flexShrink: '0' }}
                        >
                          <path d="m17.08 4.953-4.073-2.958a5.118 5.118 0 0 0-6.018 0L2.917 4.953a5.12 5.12 0 0 0-1.86 5.723l1.555 4.786A5.12 5.12 0 0 0 7.482 19h5.032a5.12 5.12 0 0 0 4.87-3.537l1.554-4.786a5.117 5.117 0 0 0-1.859-5.723ZM14.31 9.765l-1.277 3.928a1.022 1.022 0 0 1-.972.706h-4.13c-.443 0-.835-.285-.972-.706L5.683 9.765a1.023 1.023 0 0 1 .371-1.143l3.342-2.427c.358-.26.843-.26 1.201 0l3.342 2.427c.358.26.51.722.372 1.143Z" />
                        </svg>
                        <span>{b.priceLabel}</span>
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  display: v.packPaneDisplay,
                  flexDirection: 'column',
                  gap: '9px',
                }}
              >
                {(v.shopPacks || []).map((p: any, pI: number) => (
                  <Fragment key={pI}>
                    <div
                      data-fx-pack
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: '#1D2956',
                        border: `2px solid ${p.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '10px',
                        animation: p.inAnim,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '9px',
                        }}
                      >
                        <div
                          data-fx-packimg
                          style={{
                            position: 'relative',
                            width: '52px',
                            height: '62px',
                            flexShrink: '0',
                            transformOrigin: '50% 100%',
                            animation: `glPackSway 3s ease-in-out ${p.swayDelay} infinite`,
                          }}
                        >
                          <div
                            data-tilt
                            style={{ position: 'absolute', inset: '-8px' }}
                          >
                            <div
                              data-tilt-inner
                              style={{ position: 'absolute', inset: '8px' }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: '0',
                                  background: `url(${p.img}) center/contain no-repeat`,
                                  imageRendering: 'pixelated',
                                }}
                              ></div>
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: '0',
                                  WebkitMask: `url(${p.img}) center/contain no-repeat`,
                                  mask: `url(${p.img}) center/contain no-repeat`,
                                  background:
                                    'linear-gradient(115deg,transparent 42%,rgba(255,255,255,.7) 50%,transparent 58%)',
                                  backgroundSize: '260% 100%',
                                  animation: `glShineSweep 2.5s ease-in-out ${p.shineDelay} infinite`,
                                }}
                              ></div>
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: '0',
                                  WebkitMask: `url(${p.img}) center/contain no-repeat`,
                                  mask: `url(${p.img}) center/contain no-repeat`,
                                  background:
                                    'radial-gradient(circle at calc(50% + var(--tilt-x,0) * 45%) calc(45% + var(--tilt-y,0) * 45%),rgba(255,255,255,.45),transparent 55%)',
                                  opacity: 'var(--tilt-on,0)',
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            flex: '1',
                            minWidth: '0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '14px',
                              color: '#FFFFFF',
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: '9px',
                              color: '#CBD9EC',
                              lineHeight: '1.5',
                            }}
                          >
                            {p.blurb}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              marginTop: '2px',
                            }}
                          >
                            {(p.odds || []).map((o: any, oI: number) => (
                              <Fragment key={oI}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    border: `1px solid ${o.color}`,
                                    borderRadius: '3px',
                                    padding: '1px 4px',
                                  }}
                                >
                                  <span
                                    style={{ fontSize: '8px', color: o.color }}
                                  >
                                    {o.label}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '8px',
                                      color: '#FFFFFF',
                                    }}
                                  >
                                    {o.pct}
                                  </span>
                                </div>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={p.buy}
                        style={{
                          cursor: p.cursor,
                          opacity: p.opacity,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          minHeight: '36px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: p.btnBg,
                          boxShadow: p.btnShadow,
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '18px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        <span>OPEN</span>
                        <div
                          style={{
                            width: '15px',
                            height: '15px',
                            backgroundImage: `url(${p.curIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span>{p.price}</span>
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  display: v.packPaneDisplay,
                  fontSize: '9px',
                  color: '#9DB4D4',
                  lineHeight: '1.6',
                  flexShrink: '0',
                }}
              >
                Coins come from ranked runs. Duplicate gear refunds coins by
                rarity, so a pull is never wasted.
              </div>
            </div>
          </>
        ) : null}

        {v.isQuests ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                background: '#283C74',
                padding: '14px',
                gap: '10px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '0',
                  }}
                >
                  <div
                    onClick={v.goHome}
                    style={{
                      cursor: 'pointer',
                      flexShrink: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '26px',
                      padding: '0 10px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    HOME
                  </div>
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      color: '#FFF2B0',
                    }}
                  >
                    QUESTS
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(33,56,84,.85)',
                      border: '1px solid #213854',
                      borderRadius: '4px',
                      padding: '3px 7px',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        flexShrink: '0',
                        backgroundImage: `url(${v.coinIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      data-fx="coins"
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '12px',
                        color: '#FCE370',
                        animation: v.coinAnim,
                      }}
                    >
                      {v.coinsShown}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(33,56,84,.85)',
                      border: '1px solid #213854',
                      borderRadius: '4px',
                      padding: '3px 7px',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        flexShrink: '0',
                        backgroundImage: `url(${v.gemIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      data-fx="gems"
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '12px',
                        color: '#8FE3FF',
                        animation: v.gemAnim,
                      }}
                    >
                      {v.gemsShown}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  height: '42px',
                  width: '100%',
                  background: '#141D2E',
                  borderRadius: '4px',
                  padding: '2px',
                  gap: '2px',
                  flexShrink: '0',
                }}
              >
                {(v.questTabs || []).map((t: any, tI: number) => (
                  <Fragment key={tI}>
                    <div
                      onClick={t.run}
                      style={{
                        cursor: 'pointer',
                        flex: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        borderRadius: '3px',
                        background: t.bg,
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '15px',
                        color: t.fg,
                      }}
                    >
                      <span>{t.label}</span>
                      <div
                        style={{
                          display: t.badgeDisplay,
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '20px',
                          height: '20px',
                          padding: '0 5px',
                          borderRadius: '10px',
                          background: '#FF4D4D',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                      >
                        {t.badge}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  display: v.shopMsgDisplay,
                  background: '#1D2956',
                  border: '1px solid #3A4C74',
                  borderRadius: '4px',
                  padding: '7px 9px',
                  fontSize: '9px',
                  color: '#FFF2B0',
                  flexShrink: '0',
                }}
              >
                {v.shopMsg}
              </div>

              <div
                style={{
                  display: v.questLoadingDisplay,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 0',
                  fontFamily: 'VolterTitle,Volter,monospace',
                  fontSize: '11px',
                  color: '#8A9BBF',
                }}
              >
                LOADING QUESTS...
              </div>

              <div
                style={{
                  display: v.questListDisplay,
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div
                    style={{
                      display: v.metaDisplay,
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '13px',
                        color: '#FFF2B0',
                      }}
                    >
                      DUTIES
                    </span>
                    {(v.metaPips || []).map((m: any, mI: number) => (
                      <div
                        key={mI}
                        style={{
                          width: '18px',
                          height: '18px',
                          border: `2px solid ${m.bd}`,
                          borderRadius: '3px',
                          background: m.bg,
                          boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.25)',
                          animation: m.anim,
                        }}
                      ></div>
                    ))}
                    <span
                      style={{
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '12px',
                        color: '#CBD9EC',
                      }}
                    >
                      {v.metaLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '9px',
                      color: '#8A9BBF',
                    }}
                  >
                    {v.questResetLine}
                  </div>
                </div>
                <div
                  onClick={v.claimAll}
                  style={{
                    display: v.claimAllDisplay,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '46px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#FCE270',
                    boxShadow: '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '21px',
                    cursor: 'pointer',
                    animation: 'glClaimBounce 2s ease-in-out infinite',
                  }}
                >
                  CLAIM ALL
                </div>
                {(v.questRows || []).map((q: any, qI: number) => (
                  <Fragment key={qI}>
                    <div
                      data-fx-quest={q.id}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#1D2956',
                        border: `2px solid ${q.rowBd}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '9px',
                        opacity: q.opacity,
                        animation: `${q.rowIn}, ${q.glowAnim}`,
                      }}
                    >
                      <div
                        style={{
                          display: q.shineDisplay,
                          position: 'absolute',
                          inset: '0',
                          pointerEvents: 'none',
                          background:
                            'linear-gradient(110deg,transparent 40%,rgba(255,242,176,.22) 50%,transparent 60%)',
                          backgroundSize: '250% 100%',
                          animation: 'glShineSweep 2.6s ease-in-out infinite',
                        }}
                      ></div>
                      <div
                        title={q.rewardTitle}
                        style={{
                          minWidth: '44px',
                          flexShrink: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <div
                          data-fx-reward
                          style={{
                            width: '30px',
                            height: '30px',
                            backgroundImage: `url(${q.rewardIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                            animation: q.iconAnim,
                          }}
                        ></div>
                        <div
                          style={{
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '12px',
                            color: q.rewardColor,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {q.rewardText}
                        </div>
                      </div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '14px',
                            color: '#FFF2B0',
                          }}
                        >
                          {q.title}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            color: '#CBD9EC',
                            lineHeight: '1.4',
                          }}
                        >
                          {q.blurb}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <div
                            style={{
                              flex: '1',
                              minWidth: '0',
                              display: 'flex',
                              gap: '2px',
                              height: '10px',
                            }}
                          >
                            {(q.segs || []).map((sg: any, sgI: number) => (
                              <div
                                key={sgI}
                                style={{
                                  flex: '1',
                                  minWidth: '0',
                                  background: sg.bg,
                                  border: '1px solid #000000',
                                  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.25)',
                                  animation: sg.anim,
                                }}
                              ></div>
                            ))}
                          </div>
                          <div
                            style={{
                              flexShrink: '0',
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '9px',
                              color: '#CBD9EC',
                            }}
                          >
                            {q.progressLabel}
                          </div>
                        </div>
                      </div>
                      <div
                        data-fx-claim
                        onClick={q.run}
                        style={{
                          animation: q.claimAnim,
                          cursor: q.cursor,
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '58px',
                          minHeight: '34px',
                          padding: '0 10px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: q.btnBg,
                          boxShadow: q.btnShadow,
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '16.5px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        {q.btnLabel}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {v.isInventory ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                background: '#283C74',
                padding: '14px',
                gap: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '0',
                  }}
                >
                  <div
                    onClick={v.goHome}
                    style={{
                      cursor: 'pointer',
                      flexShrink: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '26px',
                      padding: '0 10px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    HOME
                  </div>
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      color: '#FFF2B0',
                    }}
                  >
                    BAG
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(33,56,84,.85)',
                    border: '1px solid #213854',
                    borderRadius: '4px',
                    padding: '3px 7px',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      flexShrink: '0',
                      backgroundImage: `url(${v.coinIcon})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                    }}
                  ></div>
                  <div
                    data-fx="coins"
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '12px',
                      color: '#FCE370',
                      animation: v.coinAnim,
                    }}
                  >
                    {v.coinsShown}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  height: '42px',
                  width: '100%',
                  background: '#141D2E',
                  borderRadius: '4px',
                  padding: '2px',
                  gap: '2px',
                  flexShrink: '0',
                }}
              >
                {(v.invTabs || []).map((t: any, tI: number) => (
                  <Fragment key={tI}>
                    <div
                      onClick={t.run}
                      style={{
                        cursor: 'pointer',
                        flex: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        borderRadius: '3px',
                        background: t.bg,
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '15px',
                        color: t.fg,
                      }}
                    >
                      <span>{t.label}</span>
                      <span
                        style={{
                          padding: '2px 5px',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,.28)',
                          fontFamily: 'Volter,monospace',
                          fontSize: '9px',
                          lineHeight: '1',
                        }}
                      >
                        {t.count}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  flex: '1',
                  minHeight: '0',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: v.packsPaneDisplay,
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {(v.bagPacks || []).map((p: any, pI: number) => (
                  <Fragment key={pI}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        background: '#1D2956',
                        border: `2px solid ${p.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '9px',
                        animation: p.inAnim,
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '50px',
                          flexShrink: '0',
                          backgroundImage: `url(${p.img})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                          animation: 'glBob 2.4s ease-in-out infinite',
                        }}
                      ></div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '14px',
                            color: '#FFFFFF',
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#CBD9EC' }}>
                          {p.count} unopened - {p.cards} gear each
                        </div>
                      </div>
                      <div
                        onClick={p.open}
                        style={{
                          cursor: 'pointer',
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '32px',
                          padding: '0 12px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '16.5px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        OPEN
                      </div>
                    </div>
                  </Fragment>
                ))}
                <div
                  style={{
                    display: v.noPacksDisplay,
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '22px 12px',
                    background: '#1D2956',
                    border: '1px dashed #3A4C74',
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#CBD9EC',
                      textAlign: 'center',
                      lineHeight: '1.6',
                    }}
                  >
                    No packs in the bag. Buy one in the shop, then open it here.
                  </div>
                  <div
                    onClick={v.goShop}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '32px',
                      padding: '0 14px',
                      border: '2px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '16.5px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    GO TO SHOP
                  </div>
                </div>
              </div>

              <div
                data-fx-bag
                style={{
                  flex: '1',
                  minHeight: '0',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: v.gearPaneDisplay,
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    flexShrink: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    background: '#1D2956',
                    border: '1px solid #304A69',
                    borderRadius: '8px 0 8px 0',
                    padding: '8px 9px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: PIXEL,
                        fontSize: '13px',
                        color: '#FFF2B0',
                      }}
                    >
                      COLLECTION
                    </div>
                    <div
                      style={{
                        fontFamily: PIXEL,
                        fontSize: '13px',
                        color: '#FFFFFF',
                      }}
                    >
                      {v.collectionCount}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      height: '10px',
                      background: '#141D2E',
                      border: '1px solid #000000',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="glb-fill"
                      style={{
                        position: 'relative',
                        width: v.collectionPct,
                        height: '100%',
                        overflow: 'hidden',
                        background:
                          'linear-gradient(180deg,#FCE270 0 50%,#F4B740 50% 100%)',
                      }}
                    >
                      <div className="glb-tile-sheen"></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(v.rarityTally || []).map((r: any, rI: number) => (
                      <Fragment key={rI}>
                        <div
                          style={{
                            flex: '1',
                            minWidth: '0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '3px 2px',
                            background: '#141D2E',
                            borderTop: `2px solid ${r.color}`,
                            borderRadius: '2px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '8px',
                              color: r.color,
                              letterSpacing: '.04em',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {r.label}
                          </div>
                          <div
                            style={{
                              fontFamily: PIXEL,
                              fontSize: '11px',
                              color: r.fg,
                            }}
                          >
                            {r.tally}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#9DB4D4',
                      lineHeight: '1.5',
                    }}
                  >
                    {v.collectionLine}
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: '0',
                    display: 'flex',
                    gap: '5px',
                    padding: '7px 4px 0 0',
                  }}
                >
                  {(v.gearFilters || []).map((f: any, fI: number) => (
                    <Fragment key={fI}>
                      <div
                        className="glb-press"
                        onClick={f.run}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          flex: '1 1 0',
                          minWidth: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '28px',
                          padding: '0 2px',
                          border: `2px solid ${f.bd}`,
                          borderRadius: '6px 2px 6px 2px',
                          background: f.bg,
                          boxShadow: f.shadow,
                          color: f.fg,
                          fontFamily: PIXEL,
                          fontSize: '10px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.label}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-4px',
                            minWidth: '15px',
                            height: '13px',
                            padding: '0 3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #000000',
                            borderRadius: '7px',
                            background: f.badgeBg,
                            color: '#FFFFFF',
                            fontFamily: 'Volter,monospace',
                            fontSize: '8px',
                            lineHeight: '1',
                          }}
                        >
                          {f.count}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>

                <div
                  style={{
                    display: v.collectionEmptyDisplay,
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '22px 12px',
                    background: '#1D2956',
                    border: '1px dashed #3A4C74',
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#CBD9EC',
                      textAlign: 'center',
                      lineHeight: '1.6',
                    }}
                  >
                    {v.collectionEmptyLine}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4,1fr)',
                    gap: '6px',
                    justifyItems: 'center',
                    paddingTop: '2px',
                  }}
                >
                  {(v.collection || []).map((c: any, cI: number) => (
                    <Fragment key={cI}>
                      <div
                        onClick={c.inspect}
                        style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          cursor: 'pointer',
                          opacity: c.opacity,
                          animation: c.inAnim,
                        }}
                      >
                        <div
                          className="glb-tile"
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            border: `2px solid ${c.bd}`,
                            borderRadius: '3px',
                            backgroundColor: '#141D2E',
                            boxShadow: c.glow,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: '0',
                              right: '0',
                              top: '0',
                              bottom: '30px',
                              padding: '5px',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundImage: `url(${c.icon})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated',
                                filter: c.filter,
                              }}
                            ></div>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              left: '0',
                              right: '0',
                              top: '0',
                              bottom: '30px',
                              display: c.lockDisplay,
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: PIXEL,
                              fontSize: '22px',
                              color: '#7F93B8',
                              textShadow: '0 2px 0 #000000',
                            }}
                          >
                            ?
                          </div>
                          <div
                            className="glb-tile-sheen"
                            style={{
                              display: c.sheenDisplay,
                              animationDelay: c.sheenDelay,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              left: '3px',
                              top: '3px',
                              display: c.typeDisplay,
                              width: '12px',
                              height: '12px',
                              backgroundImage: `url(${c.typeIcon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                              filter: 'drop-shadow(0 1px 0 #000000)',
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              right: '-2px',
                              top: '-2px',
                              display: c.countDisplay,
                              alignItems: 'center',
                              height: '18px',
                              padding: '0 4px',
                              borderRadius: '0 0 4px 0',
                              background: '#141212',
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '12px',
                              color: '#FFF2B0',
                            }}
                          >
                            {c.count}
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              left: '0',
                              bottom: '0',
                              width: '100%',
                              padding: '2px 3px',
                              background: c.bd,
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '12px',
                              lineHeight: '1.1',
                              color: '#141212',
                              overflow: 'hidden',
                              whiteSpace: 'normal',
                              textWrap: 'balance',
                              overflowWrap: 'anywhere',
                              minHeight: '30px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {c.short}
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>

              <div
                data-fx-bag
                className="glb-scrim"
                onClick={v.closeCardInfo}
                style={{
                  position: 'absolute',
                  inset: '0',
                  zIndex: '26',
                  display: v.cardInfoDisplay,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  background: 'rgba(6,27,62,.78)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  key={v.cardInfoKey}
                  className="glb-panel"
                  onClick={v.stop}
                  style={{
                    width: '100%',
                    maxWidth: '340px',
                    maxHeight: '94%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#CDD6F6',
                    borderRadius: '8px',
                    padding: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      background: '#F0F0F0',
                      border: '2px solid #F7F7F5',
                      borderRadius: '4px',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        flexShrink: '0',
                        height: '186px',
                        overflow: 'hidden',
                        borderRadius: '2px 2px 0 0',
                        background: `radial-gradient(circle at 50% 58%,${v.cardInfoGlow}66 0%,#1D2956 68%)`,
                      }}
                    >
                      <div
                        className="glb-rays"
                        style={{
                          display: v.cardInfoRaysDisplay,
                          background: `repeating-conic-gradient(from 0deg,${v.cardInfoGlow}80 0deg 7deg,rgba(0,0,0,0) 7deg 22.5deg)`,
                        }}
                      ></div>
                      {GEAR_SPARKS.map((s, sI) => (
                        <Fragment key={sI}>
                          <div
                            className="gls-spark"
                            style={{
                              display: v.cardInfoSparkDisplay,
                              left: s.left,
                              top: s.top,
                              width: s.size,
                              height: s.size,
                              animationDelay: s.delay,
                            }}
                          ></div>
                        </Fragment>
                      ))}
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: '22px',
                          width: '120px',
                          height: '20px',
                          marginLeft: '-60px',
                        }}
                      >
                        <div
                          className="glb-shadow"
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background:
                              'radial-gradient(closest-side,rgba(6,8,20,.6),rgba(6,8,20,0))',
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '24px',
                          width: '132px',
                          height: '132px',
                          marginLeft: '-66px',
                        }}
                      >
                        <div
                          className="glb-hero-in"
                          style={{ width: '100%', height: '100%' }}
                        >
                          <div
                            className="glb-sway"
                            style={{ width: '100%', height: '100%' }}
                          >
                            <div
                              className="glb-float"
                              style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                filter: 'drop-shadow(0 5px 0 rgba(0,0,0,.35))',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: '0',
                                  backgroundImage: `url(${v.cardInfoIcon})`,
                                  backgroundSize: 'contain',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'center',
                                  imageRendering: 'pixelated',
                                  filter: v.cardInfoFilter,
                                }}
                              ></div>
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: '0',
                                  display: v.cardInfoRaysDisplay,
                                  overflow: 'hidden',
                                  WebkitMaskImage: `url(${v.cardInfoIcon})`,
                                  maskImage: `url(${v.cardInfoIcon})`,
                                  WebkitMaskSize: 'contain',
                                  maskSize: 'contain',
                                  WebkitMaskRepeat: 'no-repeat',
                                  maskRepeat: 'no-repeat',
                                  WebkitMaskPosition: 'center',
                                  maskPosition: 'center',
                                }}
                              >
                                <div className="glb-band"></div>
                              </div>
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: '0',
                                  display: v.cardInfoLockDisplay,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontFamily: PIXEL,
                                  fontSize: '54px',
                                  color: '#B5C0FF',
                                  WebkitTextStroke: '6px #000000',
                                  paintOrder: 'stroke fill',
                                }}
                              >
                                ?
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        className="glb-press"
                        onClick={v.closeCardInfo}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#B5C0FF',
                          boxShadow:
                            '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
                          fontFamily: PIXEL,
                          fontSize: '16px',
                          color: '#000000',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '8px',
                          display: v.cardInfoNavDisplay,
                          padding: '3px 7px',
                          border: '2px solid #000000',
                          borderRadius: '6px 2px 6px 2px',
                          background: 'rgba(20,29,46,.92)',
                          fontFamily: PIXEL,
                          fontSize: '11px',
                          color: '#CBD9EC',
                        }}
                      >
                        {v.cardInfoPos}
                      </div>
                      <div
                        className="glb-press"
                        onClick={v.cardInfoPrev}
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          marginTop: '-18px',
                          width: '30px',
                          height: '36px',
                          display: v.cardInfoNavDisplay,
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="glb-nudge-l">◀</span>
                      </div>
                      <div
                        className="glb-press"
                        onClick={v.cardInfoNext}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          marginTop: '-18px',
                          width: '30px',
                          height: '36px',
                          display: v.cardInfoNavDisplay,
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="glb-nudge-r">▶</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '0 14px 14px',
                      }}
                    >
                      <div
                        className="glb-title"
                        style={{
                          position: 'relative',
                          marginTop: '-16px',
                          fontFamily: PIXEL,
                          fontSize: '22px',
                          lineHeight: '1.1',
                          color: '#FFF2B0',
                          WebkitTextStroke: '5px #000000',
                          paintOrder: 'stroke fill',
                          textShadow: '0 3px 0 #141D2E',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        {v.cardInfoName}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          className="glb-chip-in"
                          style={{
                            animationDelay: '320ms',
                            fontSize: '9px',
                            color: '#1D2956',
                            background: v.cardInfoRarityColor,
                            border: '1px solid #000000',
                            borderRadius: '3px',
                            padding: '2px 6px',
                            letterSpacing: '.08em',
                          }}
                        >
                          {v.cardInfoRarity}
                        </span>
                        <span
                          className="glb-chip-in"
                          style={{
                            animationDelay: '380ms',
                            fontSize: '9px',
                            color: '#8B7355',
                            background: '#E6E9F5',
                            borderRadius: '3px',
                            padding: '2px 6px',
                          }}
                        >
                          {v.cardInfoClass}
                        </span>
                        <span
                          className="glb-chip-in"
                          style={{
                            animationDelay: '440ms',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: '#E6E9F5',
                            borderRadius: '3px',
                            padding: '2px 6px',
                          }}
                        >
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              backgroundImage: `url(${v.cardInfoTypeIcon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                            }}
                          ></span>
                          <span
                            style={{
                              fontSize: '9px',
                              color: v.cardInfoTypeColor,
                            }}
                          >
                            {v.cardInfoType}
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: v.cardInfoOwnColor,
                        }}
                      >
                        {v.cardInfoOwn}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3,1fr)',
                          gap: '6px',
                        }}
                      >
                        {(v.cardInfoLinks || []).map((l: any, lI: number) => (
                          <Fragment key={lI}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '6px 4px',
                                background: '#1D2956',
                                border: '2px solid #000000',
                                borderRadius: '6px 2px 6px 2px',
                                animation: l.anim,
                              }}
                            >
                              <div
                                style={{ fontSize: '8px', color: '#9DB4D4' }}
                              >
                                {l.label}
                              </div>
                              <div
                                style={{
                                  fontFamily: PIXEL,
                                  fontSize: '20px',
                                  lineHeight: '1',
                                  color: l.color,
                                  textShadow: '0 2px 0 #000000',
                                }}
                              >
                                {l.value}
                              </div>
                              <div
                                style={{ fontSize: '8px', color: '#CBD9EC' }}
                              >
                                {l.unit}
                              </div>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          display: v.cardInfoRiderDisplay,
                          alignItems: 'flex-start',
                          gap: '8px',
                          background: '#E6E9F5',
                          borderLeft: `3px solid ${v.cardInfoRiderColor}`,
                          borderRadius: '4px',
                          padding: '8px 9px',
                          animation: 'glsRise 360ms ease-out 600ms both',
                        }}
                      >
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            flexShrink: '0',
                            backgroundImage: `url(${v.cardInfoRiderIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <div
                          style={{
                            flex: '1',
                            minWidth: '0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <div style={{ fontSize: '10px', color: '#1D2956' }}>
                            {v.cardInfoRiderTitle}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#8B7355',
                              lineHeight: '1.6',
                            }}
                          >
                            {v.cardInfoRiderText}
                          </div>
                        </div>
                      </div>
                      <div className="glb-cta-in" style={{ width: '100%' }}>
                        <div
                          className="glb-press"
                          onClick={v.cardInfoCtaRun}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '44px',
                            border: '3px solid #000000',
                            borderRadius: '8px 2px 8px 2px',
                            background: v.cardInfoCtaBg,
                            boxShadow: v.cardInfoCtaShadow,
                            color: '#000000',
                            fontFamily: PIXEL,
                            fontSize: '18px',
                            lineHeight: '1.05',
                            textAlign: 'center',
                            textWrap: 'balance',
                            animation: v.cardInfoCtaAnim,
                          }}
                        >
                          {v.cardInfoCta}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isOpening ? (
          <>
            <div
              onClick={v.revealNext}
              style={{
                visibility: 'hidden',
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                padding: '18px',
                background:
                  'radial-gradient(circle at 50% 38%,#3B4E92,#141D2E 72%)',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {/* The pack-opening stage (src/client/fx/packStage) draws here;
                  the classic reveal below stays mounted but hidden. */}
              <div
                data-fx-stage
                style={{
                  position: 'absolute',
                  inset: '0',
                  zIndex: '30',
                  visibility: 'visible',
                }}
              ></div>
              <div
                style={{
                  fontFamily: 'VolterTitle,Volter,monospace',
                  fontSize: '13px',
                  color: '#FFF2B0',
                  textAlign: 'center',
                }}
              >
                {v.openTitle}
              </div>

              <div
                style={{
                  display: v.sealedDisplay,
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '150px',
                    height: '190px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'glBob 2.4s ease-in-out infinite',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-14px',
                      backgroundImage: `url(${v.openGlow})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                      opacity: '.9',
                    }}
                  ></div>
                  <div
                    style={{
                      position: 'relative',
                      width: '118px',
                      height: '180px',
                      backgroundImage: `url(${v.openPackImg})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                    }}
                  ></div>
                </div>
                <div style={{ fontSize: '10px', color: '#CBD9EC' }}>
                  Tap to tear it open
                </div>
              </div>

              <div
                style={{
                  display: v.cardsDisplay,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  maxWidth: '100%',
                }}
              >
                {(v.openCards || []).map((c: any, cI: number) => (
                  <Fragment key={cI}>
                    <div
                      style={{
                        position: 'relative',
                        width: c.w,
                        aspectRatio: '3/4',
                        border: `2px solid ${c.bd}`,
                        borderRadius: '5px',
                        backgroundColor: '#141D2E',
                        overflow: 'hidden',
                        animation: c.anim,
                        boxShadow: c.glow,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '0',
                          right: '0',
                          top: '0',
                          bottom: '13px',
                          padding: '9px',
                          boxSizing: 'border-box',
                          display: c.faceDisplay,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${c.icon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          inset: '0',
                          display: c.backDisplay,
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(160deg,${v.openTint},#141D2E)`,
                        }}
                      >
                        <div
                          style={{
                            width: '62%',
                            height: '62%',
                            backgroundImage: `url(${v.openPackImg})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                            opacity: '.55',
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '0',
                          display: c.newDisplay,
                          alignItems: 'center',
                          height: '14px',
                          padding: '0 4px',
                          borderRadius: '0 0 4px 0',
                          background: '#AEE45D',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '8px',
                          color: '#141212',
                        }}
                      >
                        NEW
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          right: '0',
                          top: '0',
                          display: c.dupeDisplay,
                          alignItems: 'center',
                          gap: '2px',
                          height: '14px',
                          padding: '0 4px',
                          borderRadius: '0 0 0 4px',
                          background: '#141212',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '8px',
                          color: '#FCE370',
                        }}
                      >
                        <div
                          style={{
                            width: '9px',
                            height: '9px',
                            backgroundImage: `url(${v.coinIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span>+{c.refund}</span>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          left: '0',
                          bottom: '0',
                          width: '100%',
                          padding: '1px 3px',
                          background: c.bd,
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '7px',
                          lineHeight: '1.5',
                          color: '#141212',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          display: c.faceDisplay,
                        }}
                      >
                        {c.short}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  minHeight: '16px',
                  fontSize: '10px',
                  color: '#CBD9EC',
                  textAlign: 'center',
                  lineHeight: '1.5',
                }}
              >
                {v.openFooter}
              </div>

              <div
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <div
                  onClick={v.revealAll}
                  style={{
                    cursor: 'pointer',
                    display: v.skipDisplay,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '32px',
                    padding: '0 14px',
                    border: '2px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '16.5px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  REVEAL ALL
                </div>
                <div
                  onClick={v.collectPack}
                  style={{
                    cursor: 'pointer',
                    display: v.collectDisplay,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '38px',
                    padding: '0 20px',
                    border: '2px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#FCE270',
                    boxShadow: '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '19.5px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  COLLECT
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isDuelOptIn ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px',
                background: '#283C74',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontFamily: 'VolterTitle,Volter,monospace',
                  fontSize: '17px',
                  color: '#FFF2B0',
                  flexShrink: '0',
                }}
              >
                {v.optInTitle}
              </div>
              {/* Entering locks a player in for the week, so the page says so
                  before the button does - and says what it is worth. */}
              <div
                style={{
                  display: v.optInEnterDisplay,
                  flexDirection: 'column',
                  gap: '6px',
                  background: '#1D2956',
                  border: '2px solid #FF9EA1',
                  borderRadius: '8px 0 8px 0',
                  padding: '10px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: '#FF9EA1',
                    letterSpacing: '.14em',
                  }}
                >
                  BEFORE YOU ENTER
                </div>
                <Bullet color="#FF9EA1">
                  <b>You are locked in until the Monday reset</b> (in{' '}
                  {v.resetIn}). You can change your five, but you cannot leave
                  the league this week.
                </Bullet>
                <Bullet>
                  Your five joins the {v.myTier} opponent pool, and a challenge
                  post goes up with your name on it. Anyone in {v.myTier} can
                  duel it while you are away.
                </Bullet>
                <Bullet>
                  Only entered duels move trophies and count toward the weekly
                  prize.
                </Bullet>
                <Bullet>
                  Entry lasts one week. After the reset you start outside the
                  league and can choose to enter again.
                </Bullet>
              </div>
              <div
                style={{
                  display: v.optInEnteredDisplay,
                  fontSize: '10px',
                  color: '#CBD9EC',
                  lineHeight: '1.6',
                  flexShrink: '0',
                }}
              >
                You are in this week&apos;s {v.myTier} league until the reset in{' '}
                {v.resetIn}. Saving swaps the five your challengers face.
              </div>

              <div
                style={{
                  display: v.optInEnterDisplay,
                  flexDirection: 'column',
                  gap: '6px',
                  background: '#1D2956',
                  border: '2px solid #FCE370',
                  borderRadius: '8px 0 8px 0',
                  padding: '10px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: '#FCE370',
                    letterSpacing: '.14em',
                  }}
                >
                  WIN THIS WEEK IN {v.myTier}
                </div>
                <TierPrizes v={v} />
                <div style={{ fontSize: '8px', color: '#9DB4D4' }}>
                  Paid at the reset for the level you finish on. Play{' '}
                  {v.minDuels} entered duels to qualify.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#1D2956',
                  border: '2px solid #3A4C74',
                  borderRadius: '8px 0 8px 0',
                  padding: '10px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    flexShrink: '0',
                    backgroundImage: `url(${v.duelOptInImg})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    minWidth: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '13px',
                      color: '#FFFFFF',
                    }}
                  >
                    {v.duelOptInCls}
                  </div>
                  <div style={{ fontSize: '9px', color: '#8A9BBF' }}>
                    {v.duelOptInPerk}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(v.duelOptInSlots || []).map((g: any, gI: number) => (
                      <Fragment key={gI}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px 0 6px 0',
                            background: g.bg,
                            backgroundImage: `url(${g.icon})`,
                            backgroundSize: '80%',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                            opacity: g.opacity,
                          }}
                        ></div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: '0',
                  opacity: v.duelOptInBusy,
                }}
              >
                <div
                  onClick={v.listAndShare}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '46px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#FCE270',
                    boxShadow: '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '21px',
                    textAlign: 'center',
                    lineHeight: '1.05',
                    textWrap: 'balance',
                  }}
                >
                  {v.optInPrimaryLabel}
                </div>
                <div
                  onClick={v.saveUnlisted}
                  style={{
                    cursor: 'pointer',
                    display: v.optInFriendlyDisplay,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '38px',
                    border: '2px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '18px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  FRIENDLY DUELS ONLY
                </div>
                <div
                  onClick={v.backToDuelGear}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '9px',
                    color: '#9DB4D4',
                    letterSpacing: '.14em',
                    paddingTop: '2px',
                  }}
                >
                  BACK TO THE FIVE
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isDuelLobby ? (
          <div
            style={{
              flex: '1',
              minHeight: '0',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <div
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px',
                background: '#283C74',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                <div
                  onClick={v.goHome}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '26px',
                    padding: '0 10px',
                    border: '1px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '15px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  HOME
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#FCE370',
                      letterSpacing: '.14em',
                    }}
                  >
                    {v.trophies} TROPHIES
                  </div>
                  <div
                    onClick={v.openDuelRules}
                    aria-label="How duels work"
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '1px solid #000000',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '12px',
                    }}
                  >
                    i
                  </div>
                </div>
              </div>

              {/* The league banner: which rung you are on, how far up it you
                  are, and what the next one costs. */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: v.leagueShade,
                  border: `2px solid ${v.leagueColor}`,
                  borderRadius: '8px 0 8px 0',
                  padding: '10px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {/* The rank sprite with its level numeral over the corner,
                      the way the Neura Knights battle rank icon draws it. */}
                  <div
                    style={{
                      position: 'relative',
                      width: '34px',
                      height: '34px',
                      flexShrink: '0',
                      backgroundImage: `url(${v.leagueIcon})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: '-2px',
                        bottom: '-4px',
                        display: v.leagueNumeralDisplay,
                        lineHeight: '1',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '11px',
                        color: '#FFFFFF',
                        WebkitTextStroke: '1.5px #000000',
                        paintOrder: 'stroke fill',
                      }}
                    >
                      {v.leagueNumeral}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: '1',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      color: v.leagueColor,
                    }}
                  >
                    {v.leagueName}
                  </div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {(v.leaguePips || []).map((p: any, pI: number) => (
                      <Fragment key={pI}>
                        <div
                          style={{
                            width: '9px',
                            height: '9px',
                            transform: 'rotate(45deg)',
                            background: p.bg,
                          }}
                        ></div>
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    background: 'rgba(0,0,0,.45)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: v.leaguePct,
                      height: '100%',
                      background: v.leagueColor,
                    }}
                  ></div>
                </div>
                <div style={{ fontSize: '9px', color: '#E8EEF8' }}>
                  {v.leagueNextLine}
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: v.leaguePrizeColor,
                    lineHeight: '1.5',
                  }}
                >
                  {v.leaguePrizeLine}
                </div>
              </div>

              {/* Your own listing: the five other people's lobbies hand their
                  bot, and whether it is on the board at all. */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#1D2956',
                  borderRadius: '8px 0 8px 0',
                  padding: '10px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '9px' }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      flexShrink: '0',
                      backgroundImage: `url(${v.myDuelImg})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                    }}
                  ></div>
                  <div
                    style={{
                      flex: '1',
                      minWidth: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '11px',
                          color: '#FFFFFF',
                        }}
                      >
                        YOUR LOADOUT
                      </div>
                      <div
                        style={{
                          fontSize: '8px',
                          color: v.duelListedColor,
                          letterSpacing: '.1em',
                        }}
                      >
                        {v.duelListedLabel}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(v.myDuelSlots || []).map((g: any, gI: number) => (
                        <Fragment key={gI}>
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '6px 0 6px 0',
                              background: g.bg,
                              backgroundImage: `url(${g.icon})`,
                              backgroundSize: '80%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                              opacity: g.opacity,
                            }}
                          ></div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div
                    onClick={v.editDuelLoadout}
                    style={{
                      cursor: 'pointer',
                      flexShrink: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '24px',
                      padding: '0 9px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '13.5px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    EDIT
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#CBD9EC',
                    lineHeight: '1.6',
                  }}
                >
                  {v.duelListedLine}
                </div>
                <div
                  style={{
                    display: v.optInEnterDisplay,
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#FCE370',
                      letterSpacing: '.14em',
                    }}
                  >
                    UP FOR GRABS THIS WEEK IN {v.myTier}
                  </div>
                  <TierPrizes v={v} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div
                    onClick={v.toggleListed}
                    style={{
                      cursor: 'pointer',
                      flex: '1',
                      display: v.duelListedToggleDisplay,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '28px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '13.5px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    {v.duelListedToggleLabel}
                  </div>
                  <div
                    onClick={v.postChallenge}
                    style={{
                      cursor: 'pointer',
                      flex: '1',
                      display: v.shareDisplay,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '28px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#FCE270',
                      boxShadow:
                        '0 -2px 0 0 #FF961D inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '13.5px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    POST CHALLENGE
                  </div>
                  <div
                    onClick={v.openChallenge}
                    style={{
                      cursor: 'pointer',
                      flex: '0 0 auto',
                      display: v.challengeDisplay,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '28px',
                      padding: '0 9px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#AEE45D',
                      boxShadow:
                        '0 -2px 0 0 #6FA02E inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '13.5px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    VIEW POST
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: '#9DB4D4',
                    letterSpacing: '.14em',
                  }}
                >
                  IN YOUR LEAGUE
                </div>
                <div
                  onClick={v.refreshOpponents}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '24px',
                    padding: '0 10px',
                    border: '1px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '13.5px',
                    opacity: v.refreshOpacity,
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                    gap: '6px',
                  }}
                >
                  REFRESH
                  <div
                    style={{
                      display: v.refreshFreeDisplay,
                      fontSize: '9px',
                      letterSpacing: '.08em',
                      color: '#2A2F7A',
                    }}
                  >
                    {v.refreshFreeLabel}
                  </div>
                  <div
                    style={{
                      display: v.refreshCostDisplay,
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        flexShrink: '0',
                        backgroundImage: `url(${v.coinIcon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    {v.refreshCostLabel}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: v.duelListEmptyDisplay,
                  fontSize: '9px',
                  color: '#8A9BBF',
                  flexShrink: '0',
                }}
              >
                Finding duellists at your rating...
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {(v.duelFoes || []).map((f: any, fI: number) => (
                  <Fragment key={fI}>
                    <div
                      onClick={f.run}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        background: '#1D2956',
                        border: f.rowBorder,
                        borderRadius: '8px 0 8px 0',
                        padding: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: '0',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: 'rgba(0,0,0,.35)',
                          backgroundImage: `url(${f.img})`,
                          backgroundSize: f.avatarFit,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '6px',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '11px',
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {f.name}
                          </div>
                          <div
                            style={{
                              display: f.tagDisplay,
                              flexShrink: '0',
                              fontSize: '7px',
                              color: '#8A9BBF',
                              letterSpacing: '.1em',
                            }}
                          >
                            BOT
                          </div>
                          <div
                            style={{
                              display: f.challengerDisplay,
                              flexShrink: '0',
                              fontSize: '7px',
                              color: '#FCE370',
                              letterSpacing: '.1em',
                            }}
                          >
                            CHALLENGER
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <div
                            style={{
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: f.badgeBg,
                              color: f.badgeColor,
                              fontSize: '7px',
                              letterSpacing: '.1em',
                            }}
                          >
                            {f.badge}
                          </div>
                          <div style={{ fontSize: '8px', color: '#9DB4D4' }}>
                            {f.cls}
                          </div>
                        </div>
                        <div style={{ fontSize: '8px', color: '#8A9BBF' }}>
                          {f.perk}
                        </div>
                      </div>
                      <div
                        style={{
                          flexShrink: '0',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '11px',
                          color: '#FCE370',
                        }}
                      >
                        {f.rating}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
              <div
                style={{
                  display: v.duelPaddedDisplay,
                  fontSize: '8px',
                  color: '#8A9BBF',
                  lineHeight: '1.6',
                  flexShrink: '0',
                }}
              >
                Not enough listed duellists in your league yet, so the rest of
                this lobby is house bots. List your own loadout to put a real
                name in somebody else&apos;s.
              </div>
            </div>

            {/* How duels work: kept off the lobby itself, behind the info
                button, so the page leads with who you can fight. */}
            <div
              onClick={v.closeDuelRules}
              style={{
                position: 'absolute',
                inset: '0',
                zIndex: '26',
                display: v.duelRulesDisplay,
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'rgba(6,27,62,.7)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                onClick={v.stop}
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  maxHeight: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  overflowY: 'auto',
                  background: '#1D2956',
                  border: '2px solid #3A4C74',
                  borderRadius: '8px 0 8px 0',
                  padding: '12px',
                  animation: 'glFadeUp 240ms ease-out',
                }}
              >
                <div
                  style={{
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '13px',
                    color: '#FFFFFF',
                  }}
                >
                  HOW DUELS WORK
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderRadius: '8px 0 8px 0',
                    padding: '9px',
                    flexShrink: '0',
                  }}
                >
                  {(v.duelRules || []).map((r: any, rI: number) => (
                    <Fragment key={rI}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '7px',
                          alignItems: 'baseline',
                        }}
                      >
                        <div
                          style={{
                            flex: '0 0 52px',
                            fontSize: '8px',
                            color: '#9DB4D4',
                            letterSpacing: '.1em',
                          }}
                        >
                          {r.k}
                        </div>
                        <div
                          style={{
                            flex: '1',
                            fontSize: '9px',
                            color: '#CBD9EC',
                            lineHeight: '1.6',
                          }}
                        >
                          {r.t}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: PIXEL,
                    fontSize: '11px',
                    color: '#FFFFFF',
                    flexShrink: '0',
                  }}
                >
                  WEEKLY PRIZES
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#CBD9EC',
                    lineHeight: '1.6',
                    flexShrink: '0',
                  }}
                >
                  Paid at every Monday reset for the league you finish the week
                  in, once you have played enough duels that week.
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    flexShrink: '0',
                  }}
                >
                  {(v.prizeTable || []).map((p: any, pI: number) => (
                    <Fragment key={pI}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '7px',
                          alignItems: 'baseline',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          background: p.bg,
                        }}
                      >
                        <div
                          style={{
                            flex: '0 0 70px',
                            fontSize: '8px',
                            color: p.color,
                            letterSpacing: '.08em',
                          }}
                        >
                          {p.league}
                        </div>
                        <div
                          style={{
                            flex: '1',
                            fontSize: '8px',
                            color: '#E8EEF8',
                            lineHeight: '1.5',
                          }}
                        >
                          {p.label}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                <div
                  onClick={v.closeDuelRules}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '32px',
                    flexShrink: '0',
                    border: '1px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '16.5px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  GOT IT
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {v.isDuelConfirm ? (
          <>
            <div
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px',
                background: '#283C74',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexShrink: '0',
                }}
              >
                <div
                  onClick={v.backToLobby}
                  style={{
                    ...btn('#B5C0FF', '#7E84E6'),
                    minHeight: '26px',
                    padding: '0 10px',
                    fontSize: '15px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                  }}
                >
                  LOBBY
                </div>
                <div
                  style={{
                    fontFamily: PIXEL,
                    fontSize: '14px',
                    color: '#FFFFFF',
                    letterSpacing: '.08em',
                  }}
                >
                  READY TO DUEL
                </div>
              </div>

              <DuelSideCard
                label="YOUR LOADOUT"
                name={v.confirmMeName}
                img={v.confirmMeImg}
                fit="contain"
                cls={v.confirmMeCls}
                perk={v.confirmMePerk}
                rating={v.confirmMeRating}
                slots={v.confirmMeSlots || []}
                border="#3A4C74"
                tag={
                  <div
                    onClick={v.editDuelForFoe}
                    style={{
                      ...btn('#B5C0FF', '#7E84E6'),
                      marginLeft: 'auto',
                      flexShrink: '0',
                      minHeight: '22px',
                      padding: '0 8px',
                      fontSize: '13.5px',
                      lineHeight: '1.05',
                      textAlign: 'center',
                      textWrap: 'balance',
                    }}
                  >
                    CHANGE
                  </div>
                }
              />

              <div
                style={{
                  alignSelf: 'center',
                  fontFamily: PIXEL,
                  fontSize: '20px',
                  color: '#FCE370',
                  WebkitTextStroke: '1.5px #000000',
                  paintOrder: 'stroke fill',
                  flexShrink: '0',
                }}
              >
                VS
              </div>

              <DuelSideCard
                label="OPPONENT"
                name={v.confirmFoeName}
                img={v.confirmFoeImg}
                fit={v.confirmFoeFit}
                cls={v.confirmFoeCls}
                perk={v.confirmFoePerk}
                rating={v.confirmFoeRating}
                slots={v.confirmFoeSlots || []}
                border="#FCE370"
                tag={
                  <>
                    <div
                      style={{
                        flexShrink: '0',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: v.confirmFoeBadgeBg,
                        color: v.confirmFoeBadgeColor,
                        fontSize: '7px',
                        letterSpacing: '.1em',
                      }}
                    >
                      {v.confirmFoeBadge}
                    </div>
                    <div
                      style={{
                        display: v.confirmFoeBotDisplay,
                        flexShrink: '0',
                        fontSize: '7px',
                        color: '#8A9BBF',
                        letterSpacing: '.1em',
                      }}
                    >
                      BOT
                    </div>
                  </>
                }
              />
              <div
                style={{
                  fontSize: '9px',
                  color: '#CBD9EC',
                  lineHeight: '1.6',
                  flexShrink: '0',
                }}
              >
                {v.confirmFoeBlurb}
              </div>

              <div style={{ flex: '1' }}></div>
              <div
                style={{
                  alignSelf: 'center',
                  fontSize: '9px',
                  color: v.confirmRankColor,
                  letterSpacing: '.1em',
                  textAlign: 'center',
                  flexShrink: '0',
                }}
              >
                {v.confirmRankLabel}
              </div>
              <div
                onClick={v.confirmDuel}
                style={{
                  ...btn('#FCE270', '#FF961D'),
                  minHeight: '44px',
                  flexShrink: '0',
                  fontSize: '22.5px',
                  letterSpacing: '.06em',
                  lineHeight: '1.05',
                  textAlign: 'center',
                  textWrap: 'balance',
                }}
              >
                START DUEL
              </div>
            </div>
          </>
        ) : null}

        {v.isDuel ? (
          <>
            <div
              data-juice="column"
              ref={v.duelArenaRef}
              style={{
                flex: '1',
                minHeight: '0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                background: '#141D2E',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: '#1C2134',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    flex: '1',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '13px',
                    color: v.duelClockColor,
                  }}
                >
                  {v.duelClockLabel}
                </div>
                <div
                  onClick={v.leaveDuel}
                  style={{
                    cursor: 'pointer',
                    flexShrink: '0',
                    fontSize: '9px',
                    color: '#FF9EA1',
                    border: '1px solid #213854',
                    background: 'rgba(33,56,84,.85)',
                    borderRadius: '5px',
                    padding: '5px 8px',
                    letterSpacing: '.08em',
                  }}
                >
                  QUIT
                </div>
              </div>
              <div
                style={{
                  height: '3px',
                  flexShrink: '0',
                  background: '#213854',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: v.duelClockColor,
                    width: `${v.duelClockPct}%`,
                    transition: 'width 1s linear',
                  }}
                ></div>
              </div>

              <div
                style={{
                  flexShrink: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: v.foeBannerBg,
                  borderBottom: `2px solid ${v.foeBannerColor}`,
                  animation: v.foeBannerAnim,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '26px',
                    height: '26px',
                    flexShrink: '0',
                    backgroundImage: `url(${v.duelFoeImg})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated',
                    animation: v.foeAvatarAnim,
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    minWidth: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '11px',
                      color: v.foeBannerColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.foeBannerText}
                  </div>
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#8A9BBF',
                      letterSpacing: '.1em',
                    }}
                  >
                    {v.foeBannerSub}
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: '0',
                    display: v.foeHitDisplay,
                    alignItems: 'center',
                    gap: '3px',
                    border: '1px solid #FF9EA1',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    background: 'rgba(209,65,65,.25)',
                  }}
                >
                  <div
                    style={{
                      width: '11px',
                      height: '11px',
                      backgroundImage: `url(${v.attackIcon})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                    }}
                  ></div>
                  <span
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '10px',
                      color: '#FF9EA1',
                    }}
                  >
                    {v.foeHitLabel}
                  </span>
                </div>
                <div
                  style={{
                    flexShrink: '0',
                    display: v.foeJunkDisplay,
                    alignItems: 'center',
                    gap: '3px',
                    border: '1px solid #FFC24B',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    background: 'rgba(255,194,75,.18)',
                    animation: v.foeJunkAnim,
                  }}
                >
                  <div
                    style={{
                      width: '11px',
                      height: '11px',
                      backgroundImage: `url(${v.junkIcon})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated',
                    }}
                  ></div>
                  <span
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '10px',
                      color: '#FFC24B',
                    }}
                  >
                    {v.foeJunkLabel}
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '3px 10px',
                  background: '#141D2E',
                  flexShrink: '0',
                  height: '16px',
                }}
              >
                {(v.duelLogTop || []).map((l: any, lI: number) => (
                  <Fragment key={lI}>
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#CBD9EC',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.text}
                    </div>
                  </Fragment>
                ))}
              </div>

              <div
                style={{
                  flex: v.duelFoePanelFlex,
                  minHeight: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '5px 5px 8px',
                  background: '#141D2E',
                }}
              >
                <div
                  style={{
                    display: v.duelFoeMiniDisplay,
                    alignSelf: 'center',
                    gridTemplateColumns: `repeat(6,${v.duelMiniCell})`,
                    gridTemplateRows: `repeat(5,${v.duelMiniCell})`,
                    gap: '2px',
                    margin: 'auto',
                  }}
                >
                  {(v.duelFoeMiniCells || []).map((c: any, cI: number) => (
                    <Fragment key={cI}>
                      <div
                        style={{
                          position: 'relative',
                          opacity: c.opacity,
                          animation: c.anim,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: '0',
                            borderRadius: '3px',
                            border: '1px solid rgba(0,0,0,.35)',
                            background: c.face,
                          }}
                        ></div>
                        <div
                          style={{
                            position: 'absolute',
                            inset: '1px',
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: '13%',
                              background: `url(${c.icon}) center/contain no-repeat`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                <div
                  ref={v.foeWrapRef}
                  style={{
                    flex: v.duelFoeWrapFlex,
                    minHeight: '0',
                    display: v.duelFoePanelDisplay,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    data-juice-board="foe"
                    style={{
                      position: 'relative',
                      width: `${v.duelBoardW}px`,
                      height: `${v.duelBoardH}px`,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6,minmax(0,1fr))',
                      gridTemplateRows: 'repeat(5,minmax(0,1fr))',
                      gap: '3px',
                      pointerEvents: 'none',
                      opacity: '.92',
                    }}
                  >
                    {(v.duelFoePops || []).map((p: any, pI: number) => (
                      <Fragment key={pI}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            top: p.top,
                            textAlign: 'center',
                            pointerEvents: 'none',
                            zIndex: '8',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '15px',
                            color: p.color,
                            WebkitTextStroke: '4px #000000',
                            paintOrder: 'stroke fill',
                            animation: 'glFloat 900ms ease-out forwards',
                          }}
                        >
                          {p.text}
                        </div>
                      </Fragment>
                    ))}
                    {(v.duelFoeCells || []).map((c: any, cI: number) => (
                      <Fragment key={cI}>
                        <div
                          style={{
                            position: 'relative',
                            minHeight: '0',
                            opacity: c.opacity,
                            animation: c.anim,
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '8px',
                              border: `2px solid ${c.bd}`,
                              background: c.face,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                              animation: c.glowAnim,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              display: c.crackDisplay,
                              pointerEvents: 'none',
                              background:
                                'linear-gradient(115deg,transparent 44%,rgba(0,0,0,.55) 46%,transparent 48%),linear-gradient(65deg,transparent 60%,rgba(0,0,0,.45) 62%,transparent 64%)',
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '2px',
                              pointerEvents: 'none',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: '13%',
                                background: `url(${c.icon}) center/contain no-repeat`,
                                filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.45))',
                              }}
                            ></div>
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  padding: '5px 8px',
                  background: '#1C2134',
                  borderTop: '1px solid #3A4C74',
                  borderBottom: '1px solid #3A4C74',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'stretch', gap: '7px' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      flex: '1 1 0',
                      minWidth: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      animation: v.duelFoeShake,
                    }}
                  >
                    {(v.duelFoePops || []).map((p: any, pI: number) => (
                      <Fragment key={pI}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            top: '-2px',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            zIndex: '8',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '14px',
                            color: p.color,
                            WebkitTextStroke: '4px #000000',
                            paintOrder: 'stroke fill',
                            animation: 'glFloat 900ms ease-out forwards',
                          }}
                        >
                          {p.text}
                        </div>
                      </Fragment>
                    ))}
                    <div
                      style={{
                        height: '17px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '0',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          flexShrink: '0',
                          backgroundImage: `url(${v.duelFoeImg})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          fontSize: '8px',
                          color: '#FF9EA1',
                          letterSpacing: '.06em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.duelFoeNameUpper}
                      </div>
                      <div
                        style={{
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {(v.duelFoeStatuses || []).map((s: any, sI: number) => (
                          <Fragment key={sI}>
                            <div
                              style={{
                                position: 'relative',
                                width: '11px',
                                height: '11px',
                                backgroundImage: `url(${s.icon})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated',
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  right: '-2px',
                                  bottom: '-3px',
                                  fontFamily: 'VolterTitle,Volter,monospace',
                                  fontSize: '7px',
                                  lineHeight: '1',
                                  color: '#FFFFFF',
                                  WebkitTextStroke: '3px #000000',
                                  paintOrder: 'stroke fill',
                                }}
                              >
                                {s.value}
                              </span>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        border: '2px solid #000000',
                        borderRadius: '3px',
                        background: '#213854',
                        overflow: 'hidden',
                        display: 'flex',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#D14141',
                          width: `${v.duelFoePct}%`,
                          marginLeft: 'auto',
                          transition: 'width .35s ease-out',
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        height: '13px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '8px',
                        color: '#9DB4D4',
                      }}
                    >
                      <span>{v.duelFoeHp}/60</span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            backgroundImage: `url(${v.blockIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span style={{ color: '#89BCFF' }}>
                          {v.duelFoeBlock}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            backgroundImage: `url(${v.junkIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span style={{ color: '#8A9BBF' }}>
                          {v.duelJunkTheirs}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      flexShrink: '0',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '9px',
                      color: '#8A9BBF',
                    }}
                  >
                    VS
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      flex: '1 1 0',
                      minWidth: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      animation: v.duelMyShake,
                    }}
                  >
                    <div
                      style={{
                        height: '17px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '0',
                      }}
                    >
                      <div
                        style={{
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {(v.duelMyStatuses || []).map((s: any, sI: number) => (
                          <Fragment key={sI}>
                            <div
                              style={{
                                position: 'relative',
                                width: '11px',
                                height: '11px',
                                backgroundImage: `url(${s.icon})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated',
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  right: '-2px',
                                  bottom: '-3px',
                                  fontFamily: 'VolterTitle,Volter,monospace',
                                  fontSize: '7px',
                                  lineHeight: '1',
                                  color: '#FFFFFF',
                                  WebkitTextStroke: '3px #000000',
                                  paintOrder: 'stroke fill',
                                }}
                              >
                                {s.value}
                              </span>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          fontSize: '8px',
                          color: '#AEE45D',
                          letterSpacing: '.06em',
                          textAlign: 'right',
                        }}
                      >
                        YOU
                      </div>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          flexShrink: '0',
                          backgroundImage: `url(${v.duelMyImg})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        border: '2px solid #000000',
                        borderRadius: '3px',
                        background: '#213854',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#2F9E5B',
                          width: `${v.duelMyPct}%`,
                          transition: 'width .35s ease-out',
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        height: '13px',
                        flexShrink: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        fontSize: '8px',
                        color: '#9DB4D4',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            backgroundImage: `url(${v.junkIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span style={{ color: '#8A9BBF' }}>
                          {v.duelJunkMine}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            backgroundImage: `url(${v.blockIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
                        <span style={{ color: '#89BCFF' }}>
                          {v.duelMyBlock}
                        </span>
                      </div>
                      <span>{v.duelMyHp}/60</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: '1',
                  minHeight: '0',
                  background: 'rgba(28,33,52,.96)',
                  borderTop: '2px solid rgba(255,242,176,.4)',
                  borderRadius: '16px 16px 0 0',
                  padding: '5px 5px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    height: '16px',
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', color: v.duelPreviewColor }}>
                    {v.duelPreview}
                  </div>
                </div>
                <div
                  ref={v.boardWrapRef}
                  style={{
                    flex: '1',
                    minHeight: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    data-juice-board="duel"
                    onPointerDown={v.onDown}
                    onPointerMove={v.onMove}
                    onPointerUp={v.onUp}
                    onPointerCancel={v.onCancel}
                    style={{
                      position: 'relative',
                      width: `${v.duelBoardW}px`,
                      height: `${v.duelBoardH}px`,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6,minmax(0,1fr))',
                      gridTemplateRows: 'repeat(5,minmax(0,1fr))',
                      gap: '3px',
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {(v.duelCells || []).map((c: any, cI: number) => (
                      <Fragment key={cI}>
                        <div
                          data-cell={c.i}
                          style={{
                            position: 'relative',
                            minHeight: '0',
                            transform: c.scale,
                            transition:
                              'transform 160ms cubic-bezier(.34,1.8,.64,1)',
                            opacity: c.opacity,
                            animation: c.anim,
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '8px',
                              border: `2px solid ${c.bd}`,
                              background: c.face,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                              animation: c.glowAnim,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '0',
                              display: c.crackDisplay,
                              pointerEvents: 'none',
                              background:
                                'linear-gradient(115deg,transparent 44%,rgba(0,0,0,.55) 46%,transparent 48%),linear-gradient(65deg,transparent 60%,rgba(0,0,0,.45) 62%,transparent 64%)',
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              inset: '2px',
                              pointerEvents: 'none',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: '13%',
                                background: `url(${c.icon}) center/contain no-repeat`,
                                filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.45))',
                              }}
                            ></div>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              top: '1px',
                              left: '3px',
                              fontSize: '9px',
                              color: '#FFFFFF',
                              pointerEvents: 'none',
                            }}
                          >
                            {c.order}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                    <svg
                      viewBox={'0 0 100 100'}
                      preserveAspectRatio={'none'}
                      style={{
                        position: 'absolute',
                        inset: '0',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: '6',
                        opacity: v.duelLineOpacity,
                      }}
                    >
                      <polyline
                        points={v.duelChainPoints}
                        fill={'none'}
                        stroke={'#FFFFFF'}
                        strokeWidth={'9'}
                        strokeLinecap={'round'}
                        strokeLinejoin={'round'}
                        vectorEffect={'non-scaling-stroke'}
                        opacity={'0.95'}
                      />
                    </svg>
                    {(v.pops || []).map((p: any, pI: number) => (
                      <Fragment key={pI}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            top: p.top,
                            textAlign: 'center',
                            pointerEvents: 'none',
                            zIndex: '8',
                            fontFamily: 'VolterTitle,Volter,monospace',
                            fontSize: '16px',
                            color: p.color,
                            WebkitTextStroke: '4px #000000',
                            paintOrder: 'stroke fill',
                            animation: 'glFloat 900ms ease-out forwards',
                          }}
                        >
                          {p.text}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  zIndex: '32',
                  display: v.duelFtueDisplay,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  background: 'rgba(6,27,62,.8)',
                  backdropFilter: 'blur(3px)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '320px',
                    background: 'rgba(255,255,255,.94)',
                    border: '2px solid #141D2E',
                    borderRadius: '12px 2px 12px 2px',
                    boxShadow: '0 4px 0 0 rgba(0,0,0,.25)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                    animation: 'glFadeUp 260ms ease-out',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '14px',
                      color: '#141D2E',
                    }}
                  >
                    {v.duelFtueTitle}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#141D2E',
                      lineHeight: '1.7',
                      textWrap: 'pretty',
                    }}
                  >
                    {v.duelFtueBody}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingTop: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {(v.duelFtueDots || []).map((d: any, dI: number) => (
                        <Fragment key={dI}>
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '9999px',
                              background: d.bg,
                            }}
                          ></div>
                        </Fragment>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                      }}
                    >
                      <div
                        onClick={v.skipDuelFtue}
                        style={{
                          cursor: 'pointer',
                          fontSize: '10px',
                          color: '#485E9C',
                          letterSpacing: '.06em',
                        }}
                      >
                        SKIP
                      </div>
                      <div
                        onClick={v.nextDuelFtue}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '30px',
                          padding: '0 14px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '16.5px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        {v.duelFtueNext}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  zIndex: '30',
                  display: v.duelOverDisplay,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '22px',
                  background: 'rgba(6,27,62,.82)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#1D2956',
                    border: '2px solid #3A4C74',
                    borderRadius: '12px 0 12px 0',
                    padding: '18px',
                    animation: 'glFadeUp 300ms ease-out',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '20px',
                      color: v.duelOverColor,
                    }}
                  >
                    {v.duelOverTitle}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#CBD9EC',
                      textAlign: 'center',
                      lineHeight: '1.6',
                    }}
                  >
                    {v.duelOverBody}
                  </div>
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '14px',
                      color: '#FCE370',
                    }}
                  >
                    {v.duelOverDelta}
                  </div>
                  <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                    <div
                      onClick={v.leaveDuel}
                      style={{
                        cursor: 'pointer',
                        flex: '1',
                        textAlign: 'center',
                        padding: '11px',
                        border: '2px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: '#B5C0FF',
                        boxShadow:
                          '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
                        color: '#000000',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '18px',
                        lineHeight: '1.05',
                        textWrap: 'balance',
                      }}
                    >
                      {v.duelLobbyLabel}
                    </div>
                    <div
                      onClick={v.duelAgain}
                      style={{
                        cursor: 'pointer',
                        flex: '1',
                        display: v.duelRematchDisplay,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '11px',
                        border: '2px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: '#FCE270',
                        boxShadow:
                          '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                        color: '#000000',
                        fontFamily: 'VolterTitle,Volter,monospace',
                        fontSize: '18px',
                        lineHeight: '1.05',
                        textAlign: 'center',
                        textWrap: 'balance',
                      }}
                    >
                      REMATCH
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isEnd ? (
          <>
            <div
              style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                padding: '20px',
                background: '#141D2E',
              }}
            >
              {/* The title sits over the card, white with a glow, the way the
                  Neura Knights battle result modal heads its result. */}
              <div
                style={{
                  fontFamily: 'VolterTitle,Volter,monospace',
                  fontSize: '28px',
                  color: '#FFFFFF',
                  textShadow: '0 0 15px rgba(255, 255, 255, 0.60)',
                  textAlign: 'center',
                  animation: 'glFadeUp 320ms ease-out both',
                }}
              >
                {withHash(v.endTitle)}
              </div>
              <div
                style={{
                  width: '100%',
                  background: '#CDD6F6',
                  borderRadius: '8px',
                  padding: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#F0F0F0',
                    border: '2px solid #F7F7F5',
                    borderRadius: '4px',
                    padding: '18px 16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8B7355',
                      textAlign: 'center',
                      lineHeight: '1.7',
                      maxWidth: '32ch',
                    }}
                  >
                    {v.endBody}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      borderTop: '1px solid #D8DCE6',
                      paddingTop: '14px',
                    }}
                  >
                    {(v.endStats || []).map((e: any, eI: number) => (
                      <Fragment key={eI}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            animation: e.anim,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '9px',
                              color: '#8B7355',
                              letterSpacing: '.12em',
                            }}
                          >
                            {e.label}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontFamily: 'VolterTitle,Volter,monospace',
                              fontSize: '22px',
                              color: e.color,
                            }}
                          >
                            {e.icon ? (
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  flexShrink: '0',
                                  backgroundImage: `url(${e.icon})`,
                                  backgroundSize: 'contain',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'center',
                                  imageRendering: 'pixelated',
                                }}
                              ></div>
                            ) : null}
                            {withHash(e.value)}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  onClick={v.endAction}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#FCE270',
                    boxShadow:
                      '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '21px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                    gap: '8px',
                  }}
                >
                  {v.endActionIcon ? (
                    <MenuIcon kind={v.endActionIcon} color="#000000" />
                  ) : null}
                  {v.endActionLabel}
                </div>
                <div
                  onClick={v.goLoadout}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '40px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#AEE45D',
                    boxShadow:
                      '0 -4px 0 0 rgba(0,0,0,.3) inset, 0 4px 0 0 #FFFFCB inset, 0 2px 0 0 rgba(0,0,0,.25)',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '21px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                    gap: '8px',
                  }}
                >
                  <MenuIcon kind="home" color="#000000" />
                  HOME
                </div>
                <div
                  onClick={v.openBoard}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '40px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow:
                      '0 -4px 0 0 #7E84E6 inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                    color: '#000000',
                    fontFamily: 'VolterTitle,Volter,monospace',
                    fontSize: '21px',
                    lineHeight: '1.05',
                    textAlign: 'center',
                    textWrap: 'balance',
                    gap: '8px',
                  }}
                >
                  <MenuIcon kind="board" color="#000000" />
                  BLACKSMITHS
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.modalOpen ? (
          <>
            <div
              data-pt-skip
              onClick={v.closeModal}
              style={{
                position: 'absolute',
                inset: '0',
                zIndex: '30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'rgba(6,27,62,.7)',
                backdropFilter: 'blur(4px)',
                borderRadius: '16px',
              }}
            >
              <div
                onClick={v.stop}
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  maxHeight: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#CDD6F6',
                  borderRadius: '8px',
                  padding: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflowY: 'auto',
                    background: '#F0F0F0',
                    border: '2px solid #F7F7F5',
                    borderRadius: '4px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '15px',
                      color: '#3C63FF',
                      textAlign: 'center',
                    }}
                  >
                    {v.modalTitle}
                  </div>
                  {v.modalBar ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {v.modalBar.art ? (
                        <img
                          src={v.modalBar.art}
                          alt=""
                          style={{
                            alignSelf: 'center',
                            height: '72px',
                            imageRendering: 'pixelated',
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          position: 'relative',
                          height: '14px',
                          background: '#1D2956',
                          border: '2px solid #000000',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: v.modalBar.w,
                            height: '100%',
                            background: '#FCE270',
                            boxShadow: '0 -3px 0 0 #FF961D inset',
                            transition: 'width 400ms ease-out',
                          }}
                        />
                        {v.modalBar.ticks.map((t: any, tI: number) => (
                          <div
                            key={tI}
                            style={{
                              position: 'absolute',
                              top: '0',
                              bottom: '0',
                              left: t.left,
                              width: '2px',
                              marginLeft: '-2px',
                              background: t.reached ? '#3FAF6E' : '#F0F0F0',
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '10px',
                        }}
                      >
                        <span style={{ color: '#1D2956' }}>
                          {v.modalBar.label}
                        </span>
                        <span style={{ color: v.modalBar.statusColor }}>
                          {v.modalBar.status}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  {(v.modalRows || []).map((r: any, rI: number) => (
                    <Fragment key={rI}>
                      {/* A heading row breaks one list into sections, e.g. the
                          war chest's tiers from its donors. */}
                      {r.heading ? (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '7px 8px 6px',
                            borderRadius: '2px',
                            background: '#1D2956',
                            color: '#FCE370',
                            fontFamily: PIXEL,
                            fontSize: '11px',
                          }}
                        >
                          {r.heading}
                        </div>
                      ) : (
                        <div
                          onClick={r.run}
                          style={{
                            cursor: r.run ? 'pointer' : 'default',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #D8DCE6',
                            paddingBottom: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                            }}
                          >
                            <div style={{ fontSize: '11px', color: '#1D2956' }}>
                              {r.title}
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#8B7355',
                                lineHeight: '1.6',
                              }}
                            >
                              {r.detail}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: r.metaColor,
                              whiteSpace: 'pre-line',
                              textAlign: 'right',
                              lineHeight: '1.6',
                            }}
                          >
                            {r.meta}
                          </div>
                        </div>
                      )}
                    </Fragment>
                  ))}
                  {v.modalChips && v.modalChips.length ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {v.modalChips.map((ch: any, cI: number) => (
                        <div
                          key={cI}
                          onClick={ch.run}
                          style={{
                            flex: '1',
                            cursor: ch.run ? 'pointer' : 'default',
                            opacity: ch.opacity,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            minHeight: '40px',
                            border: '3px solid #000000',
                            borderRadius: '8px 2px 8px 2px',
                            background: ch.bg,
                            boxShadow: ch.shadow,
                            color: '#000000',
                            fontFamily: PIXEL,
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <img
                            src={ch.icon}
                            alt=""
                            style={{ width: '14px', height: '14px' }}
                          />
                          {ch.label}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {v.modalSliders && v.modalSliders.length ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#FDFDFD',
                        borderRadius: '2px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '28px',
                          background: '#7981F2',
                          borderRadius: '2px 2px 0 0',
                          fontFamily: PIXEL,
                          fontSize: '13px',
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                        }}
                      >
                        Music
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          padding: '16px',
                        }}
                      >
                        {v.modalSliders.map((sl: any, sI: number) => (
                          <Fragment key={sI}>
                            <div
                              style={{
                                marginTop: sI ? '4px' : '0',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#4B6A85',
                              }}
                            >
                              {sl.label}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <SpeakerIcon value={sl.value} />
                              <VolumeSlider
                                label={sl.label}
                                value={sl.value}
                                onChange={sl.set}
                              />
                            </div>
                          </Fragment>
                        ))}
                        <div
                          onClick={v.resetVolumes}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '40px',
                            marginTop: '12px',
                            boxSizing: 'border-box',
                            border: '3px solid #000000',
                            borderRadius: '8px 2px 8px 2px',
                            background: '#B5C0FF',
                            boxShadow:
                              '0 -4px 0 0 #7E84E6 inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                            color: '#000000',
                            fontFamily: PIXEL,
                            fontSize: '18px',
                            lineHeight: '1.05',
                            textAlign: 'center',
                            textWrap: 'balance',
                          }}
                        >
                          DEFAULT
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {(v.modalActions || []).map((a: any, aI: number) => (
                    <Fragment key={aI}>
                      <div
                        onClick={a.run}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '40px',
                          border: '3px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: a.bg,
                          boxShadow: a.shadow,
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '18px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        {a.label}
                      </div>
                    </Fragment>
                  ))}
                  {v.modalFooter ? (
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#8B7355',
                        textAlign: 'center',
                        whiteSpace: 'pre-line',
                        lineHeight: '1.6',
                      }}
                    >
                      {v.modalFooter}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.ftueOn ? (
          <>
            <div
              data-pt-skip
              style={{
                position: 'absolute',
                inset: '0',
                zIndex: '40',
                pointerEvents: 'none',
              }}
            >
              {(v.ftueScrim || []).map((s: any, sI: number) => (
                <Fragment key={sI}>
                  <div
                    style={{
                      position: 'absolute',
                      top: s.top,
                      left: s.left,
                      right: s.right,
                      bottom: s.bottom,
                      width: s.width,
                      height: s.height,
                      background: 'rgba(28,33,52,.72)',
                      opacity: v.ftueScrimOpacity,
                      pointerEvents: 'auto',
                    }}
                  ></div>
                </Fragment>
              ))}
              <div
                style={{
                  position: 'absolute',
                  top: v.ftueRingTop,
                  left: v.ftueRingLeft,
                  width: v.ftueRingW,
                  height: v.ftueRingH,
                  border: `2px solid ${v.ftueRingColor}`,
                  borderRadius: '8px',
                  boxShadow: '0 0 16px 4px rgba(255,242,176,.5)',
                  opacity: v.ftueRingOpacity,
                  pointerEvents: 'none',
                }}
              ></div>

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '92%',
                  maxWidth: '320px',
                  top: v.ftueCardTop,
                  bottom: v.ftueCardBottom,
                  maxHeight: 'calc(100% - 8px)',
                  visibility: v.ftueCardVis,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '15px',
                    lineHeight: '1',
                    color: '#FFF2B0',
                    textShadow: '0 1px 0 #141D2E',
                    opacity: v.ftueArrowUp,
                    animation: 'glBounce 1s ease-in-out infinite',
                  }}
                >
                  ▲
                </div>
                <div
                  ref={v.setFtueCard}
                  style={{
                    width: '100%',
                    flex: '0 1 auto',
                    minHeight: '0',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,.94)',
                    border: '2px solid #141D2E',
                    borderRadius: '12px 2px 12px 2px',
                    boxShadow: '0 4px 0 0 rgba(0,0,0,.25)',
                    padding: '10px',
                    pointerEvents: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'VolterTitle,Volter,monospace',
                      fontSize: '14px',
                      color: '#141D2E',
                    }}
                  >
                    {v.ftueTitle}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#141D2E',
                      lineHeight: '1.6',
                      textWrap: 'pretty',
                      flex: '0 1 auto',
                      minHeight: '0',
                      overflowY: 'auto',
                    }}
                  >
                    {v.ftueBody}
                  </div>

                  <div
                    style={{
                      display: v.ftueLegendDisplay,
                      flexDirection: 'column',
                      gap: '5px',
                      paddingTop: '2px',
                    }}
                  >
                    {(v.ftueLegend || []).map((l: any, lI: number) => (
                      <Fragment key={lI}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              flexShrink: '0',
                              border: '2px solid rgba(0,0,0,.3)',
                              borderRadius: '6px',
                              backgroundColor: l.tint,
                              backgroundImage: `url(${l.icon})`,
                              backgroundSize: '70%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                            }}
                          ></div>
                          <div
                            style={{
                              width: '36px',
                              flexShrink: '0',
                              fontSize: '10px',
                              color: '#141D2E',
                            }}
                          >
                            {l.label}
                          </div>
                          <div
                            style={{
                              flex: '1',
                              fontSize: '10px',
                              color: '#485E9C',
                            }}
                          >
                            {l.blurb}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingTop: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {(v.ftueDots || []).map((d: any, dI: number) => (
                        <Fragment key={dI}>
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '9999px',
                              background: d.bg,
                            }}
                          ></div>
                        </Fragment>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                      }}
                    >
                      <div
                        onClick={v.endFtue}
                        style={{
                          cursor: 'pointer',
                          fontSize: '10px',
                          color: '#485E9C',
                          letterSpacing: '.06em',
                        }}
                      >
                        SKIP
                      </div>
                      <div
                        onClick={v.advanceFtue}
                        style={{
                          cursor: 'pointer',
                          display: v.ftueNextDisplay,
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '30px',
                          padding: '0 14px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontFamily: 'VolterTitle,Volter,monospace',
                          fontSize: '16.5px',
                          lineHeight: '1.05',
                          textAlign: 'center',
                          textWrap: 'balance',
                        }}
                      >
                        {v.ftueNextLabel}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    lineHeight: '1',
                    color: '#FFF2B0',
                    textShadow: '0 1px 0 #141D2E',
                    opacity: v.ftueArrowDown,
                    animation: 'glBounce 1s ease-in-out infinite',
                  }}
                >
                  ▼
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* Duel setup coaching. It sits OVER the screen its step is about and
            never blocks it: the build is done by doing, so the card explains
            and gets out of the way rather than gating the controls. It docks
            at the TOP: every setup screen keeps its way forward at the bottom. */}
        <div
          style={{
            position: 'absolute',
            left: '10px',
            right: '10px',
            top: '10px',
            zIndex: '40',
            display: v.duelSetupDisplay,
            flexDirection: 'column',
            gap: '7px',
            background: '#FFF2B0',
            border: '3px solid #000000',
            borderRadius: '10px 2px 10px 2px',
            boxShadow: '0 4px 0 0 rgba(0,0,0,.35)',
            padding: '11px',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: 'VolterTitle,Volter,monospace',
              fontSize: '13px',
              color: '#141D2E',
            }}
          >
            {v.duelSetupTitle}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#2B3A56',
              lineHeight: '1.6',
              textWrap: 'pretty',
            }}
          >
            {v.duelSetupBody}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              {(v.duelSetupDots || []).map((d: any, dI: number) => (
                <Fragment key={dI}>
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: d.bg,
                    }}
                  ></div>
                </Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={v.skipDuelSetup}
                style={{
                  cursor: 'pointer',
                  fontSize: '9px',
                  color: '#5A6478',
                  letterSpacing: '.12em',
                }}
              >
                SKIP
              </div>
              <div
                onClick={v.nextDuelSetup}
                style={{
                  cursor: 'pointer',
                  display: v.duelSetupNextDisplay,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '28px',
                  padding: '0 14px',
                  border: '2px solid #000000',
                  borderRadius: '8px 2px 8px 2px',
                  background: '#FCE270',
                  boxShadow: '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                  color: '#000000',
                  fontFamily: 'VolterTitle,Volter,monospace',
                  fontSize: '16.5px',
                  lineHeight: '1.05',
                  textAlign: 'center',
                  textWrap: 'balance',
                }}
              >
                NEXT
              </div>
            </div>
          </div>
        </div>

        {/* The lock-in warning. Entering cannot be undone until the reset,
            so it is the last thing between the button and the pool. */}
        <div
          onClick={v.cancelEnter}
          style={{
            position: 'absolute',
            inset: '0',
            zIndex: '38',
            display: v.enterConfirmDisplay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(6,27,62,.75)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={v.stop}
            style={{
              width: '100%',
              maxWidth: '330px',
              maxHeight: '90%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#1D2956',
              border: '2px solid #FF9EA1',
              borderRadius: '8px 0 8px 0',
              padding: '14px',
              animation: 'glFadeUp 240ms ease-out',
            }}
          >
            <div
              style={{
                fontFamily: PIXEL,
                fontSize: '15px',
                color: '#FFFFFF',
              }}
            >
              LOCK IN FOR THIS WEEK?
            </div>
            <Bullet color="#FF9EA1">
              You stay in the {v.myTier} league until the Monday reset (in{' '}
              {v.resetIn}). There is no leaving early.
            </Bullet>
            <Bullet>
              Your five can be challenged by anyone in {v.myTier}, and a
              challenge post goes up with your name.
            </Bullet>
            <Bullet>You can still change your five at any time.</Bullet>
            <Bullet>Next week you start outside again - nothing renews.</Bullet>
            <div
              style={{
                fontSize: '8px',
                color: '#FCE370',
                letterSpacing: '.14em',
              }}
            >
              WHAT YOU CAN WIN
            </div>
            <TierPrizes v={v} />
            <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
              <div
                onClick={v.cancelEnter}
                style={{
                  ...btn('#B5C0FF', '#7E84E6'),
                  flex: '1',
                  minHeight: '40px',
                  fontSize: '16.5px',
                  lineHeight: '1.05',
                  textAlign: 'center',
                  textWrap: 'balance',
                }}
              >
                NOT YET
              </div>
              <div
                onClick={v.confirmEnter}
                style={{
                  ...btn('#FCE270', '#FF961D'),
                  flex: '1.4',
                  minHeight: '40px',
                  fontSize: '18px',
                  lineHeight: '1.05',
                  textAlign: 'center',
                  textWrap: 'balance',
                }}
              >
                LOCK IN &amp; ENTER
              </div>
            </div>
          </div>
        </div>

        {/* Last week's league prize. It was paid at the reset; this is the
            moment the player finds out, so it sits over whatever screen the
            app opened on. */}
        <div
          onClick={v.dismissPrize}
          style={{
            position: 'absolute',
            inset: '0',
            zIndex: '40',
            display: v.prizeDisplay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(6,27,62,.75)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={v.stop}
            style={{
              width: '100%',
              maxWidth: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: '#1D2956',
              border: '2px solid #FCE370',
              borderRadius: '8px 0 8px 0',
              padding: '16px',
              animation: 'glFadeUp 240ms ease-out',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: '#9DB4D4',
                letterSpacing: '.14em',
              }}
            >
              WEEKLY LEAGUE PRIZE
            </div>
            <div
              style={{
                fontFamily: PIXEL,
                fontSize: '18px',
                color: '#FCE370',
                textAlign: 'center',
              }}
            >
              {v.prizeLeague}
            </div>
            <div
              style={{
                fontSize: '9px',
                color: '#CBD9EC',
                textAlign: 'center',
                lineHeight: '1.6',
              }}
            >
              You finished last week here. Your prize is already in your bag.
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {(v.prizeRewards || []).map((r: any, rI: number) => (
                <Fragment key={rI}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      width: '80px',
                      padding: '8px 4px',
                      borderRadius: '8px 0 8px 0',
                      background: 'rgba(0,0,0,.3)',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        backgroundImage: `url(${r.icon})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated',
                      }}
                    ></div>
                    <div
                      style={{
                        fontSize: '8px',
                        color: '#FFFFFF',
                        textAlign: 'center',
                      }}
                    >
                      {r.label}
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div
              onClick={v.dismissPrize}
              style={{
                ...btn('#FCE270', '#FF961D'),
                alignSelf: 'stretch',
                minHeight: '40px',
                fontSize: '19.5px',
                lineHeight: '1.05',
                textAlign: 'center',
                textWrap: 'balance',
              }}
            >
              COLLECT
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
