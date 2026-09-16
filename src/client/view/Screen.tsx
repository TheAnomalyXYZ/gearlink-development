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
import type { View } from './buildView.js';

export const Screen = ({ v }: { v: View }) => (
  <div
    style={{
      minHeight: '100vh',
      backgroundColor: '#0B1020',
      backgroundImage:
        'url(https://files.anomalygames.ai/PocketKnights/sky_v3.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center bottom',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: v.pagePad,
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
            backgroundColor: '#101528',
            backgroundImage:
              'url(https://files.anomalygames.ai/PocketKnights/sky_v3.png)',
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
            <div
              style={{
                width: '96px',
                height: '100px',
                backgroundImage: `url(${v.gearlinkIcon})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            ></div>
            <div
              style={{
                fontFamily: "'Yoster Island',Volter,monospace",
                fontSize: 'clamp(28px,6vw,48px)',
                color: '#FFF2B0',
                textAlign: 'center',
                letterSpacing: '.02em',
                textShadow: '0 4px 0 #141D2E',
              }}
            >
              GEARLINK BATTLE
            </div>
            <div
              style={{
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
                  onClick={a.run}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '48px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: a.bg,
                    boxShadow: a.shadow,
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '16px',
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

    <div
      style={{
        display: v.frameDisplay,
        width: v.shellW,
        height: v.shellH,
        maxWidth: '425px',
        maxHeight: '884px',
        padding: '16px',
        border: '1px solid rgba(0,0,0,.5)',
        borderRadius: '32px',
        background: 'linear-gradient(135deg,rgba(84,95,249,.6),rgba(0,0,0,.6))',
        boxShadow: '0 4px 12px 0 rgba(0,0,0,.3)',
      }}
    >
      <div
        ref={v.setFtueRoot}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          border: '1px solid #FFF2B0',
          borderRadius: '16px',
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
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#141D2E',
                backgroundImage:
                  'url(https://files.anomalygames.ai/PocketKnights/Map/Base.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: '20px',
                gap: '14px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  background:
                    'linear-gradient(180deg,rgba(20,29,46,.55),rgba(20,29,46,.94))',
                }}
              ></div>

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <div style={{ width: '52px' }}></div>
                <div
                  style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '54px',
                      backgroundImage: `url(${v.gearlinkIcon})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  ></div>
                  <div
                    style={{
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '21px',
                      color: '#FFF2B0',
                      textAlign: 'center',
                      textShadow: '0 3px 0 #141D2E',
                    }}
                  >
                    GEARLINK BATTLE
                  </div>
                </div>
                <div
                  style={{
                    width: '52px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '5px',
                    flexShrink: '0',
                  }}
                >
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
                      background: 'rgba(20,29,46,.8)',
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      border: '1px solid #3A4C74',
                      borderRadius: '4px',
                      background: 'rgba(20,29,46,.8)',
                    }}
                  >
                    <div
                      style={{
                        width: '11px',
                        height: '1px',
                        background: '#9DB4D4',
                      }}
                    ></div>
                    <div
                      style={{
                        width: '11px',
                        height: '1px',
                        background: '#9DB4D4',
                      }}
                    ></div>
                    <div
                      style={{
                        width: '11px',
                        height: '1px',
                        background: '#9DB4D4',
                      }}
                    ></div>
                  </div>
                  <div
                    style={{ position: 'relative', width: '0', height: '0' }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: '0',
                        top: '2px',
                        zIndex: '20',
                        width: '132px',
                        display: v.homeMenuDisplay,
                        flexDirection: 'column',
                        background: '#1D2956',
                        border: '1px solid #3A4C74',
                        borderRadius: '6px 0 6px 0',
                        overflow: 'hidden',
                        boxShadow: '0 4px 0 0 rgba(0,0,0,.35)',
                      }}
                    >
                      {(v.homeMenuItems || []).map((m: any, mI: number) => (
                        <Fragment key={mI}>
                          <div
                            onClick={m.run}
                            style={{
                              cursor: 'pointer',
                              padding: '8px 10px',
                              borderBottom: '1px solid #2A3A63',
                              fontSize: '10px',
                              color: '#CBD9EC',
                              textAlign: 'left',
                            }}
                          >
                            {m.label}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: 'relative',
                  flex: '0 1 auto',
                  minHeight: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  gap: '12px',
                  marginTop: '4px',
                  paddingBottom: '84px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    flexShrink: '0',
                    background: '#CDD6F6',
                    borderRadius: '8px',
                    padding: '5px',
                  }}
                >
                  <div
                    style={{
                      background: '#F0F0F0',
                      border: '2px solid #F7F7F5',
                      borderRadius: '4px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '9px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '12px',
                        color: '#3C63FF',
                      }}
                    >
                      YOUR BEST RUN
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      {(v.bestStats || []).map((b: any, bI: number) => (
                        <Fragment key={bI}>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '8px',
                                color: '#8B7355',
                                letterSpacing: '.12em',
                              }}
                            >
                              {b.label}
                            </div>
                            <div
                              style={{
                                fontFamily: "'Yoster Island',Volter,monospace",
                                fontSize: '18px',
                                color: b.color,
                              }}
                            >
                              {b.value}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    flexShrink: '0',
                    background: 'rgba(33,56,84,.85)',
                    border: '1px solid #213854',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#9DB4D4',
                      letterSpacing: '.14em',
                    }}
                  >
                    THE LADDER
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      gap: '2px',
                    }}
                  >
                    {(v.ladder || []).map((l: any, lI: number) => (
                      <Fragment key={lI}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                            opacity: l.opacity,
                          }}
                        >
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              backgroundImage: `url(${l.url})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center bottom',
                              imageRendering: 'pixelated',
                            }}
                          ></div>
                          <div style={{ fontSize: '8px', color: l.color }}>
                            {l.tag}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div
                ref={v.setFtueFight}
                style={{
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  zIndex: '12',
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
                    maxWidth: '369px',
                    height: '60px',
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
                        onClick={n.run}
                        style={{
                          flex: '1',
                          minWidth: '0',
                          height: '72px',
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
                            height: '100%',
                            width: '100%',
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
                                'url(https://files.anomalygames.ai/PocketKnights/Pattern/MenuButtonPatten.svg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: n.patternDisplay,
                            }}
                          ></div>
                          <div
                            style={{
                              position: 'absolute',
                              top: '-12px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              display: n.tipDisplay,
                              whiteSpace: 'nowrap',
                              fontFamily: "'Yoster Island',Volter,monospace",
                              fontSize: '13px',
                              color: '#FFFFFF',
                              WebkitTextStroke: '4px #000000',
                              paintOrder: 'stroke fill',
                            }}
                          >
                            {n.label}
                          </div>
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
                                width: n.icon,
                                height: n.icon,
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
                                fontFamily: "'Yoster Island',Volter,monospace",
                                fontSize: '8px',
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
                  fontFamily: "'Yoster Island',Volter,monospace",
                  fontSize: '18px',
                  color: '#FFF2B0',
                  letterSpacing: '.02em',
                }}
              >
                PICK YOUR HERO
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
                            fontFamily: "'Yoster Island',Volter,monospace",
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
                  </Fragment>
                ))}
              </div>

              <div
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
                        height: a.h,
                        border: '3px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: a.bg,
                        boxShadow: a.shadow,
                        color: '#000000',
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: a.size,
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
                        height: '26px',
                        padding: '0 10px',
                        border: '1px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: '#B5C0FF',
                        boxShadow:
                          '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                        color: '#000000',
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '10px',
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
                        fontFamily: "'Yoster Island',Volter,monospace",
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
                          fontFamily: "'Yoster Island',Volter,monospace",
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
                          fontFamily: "'Yoster Island',Volter,monospace",
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
                                  fontFamily:
                                    "'Yoster Island',Volter,monospace",
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
                                fontFamily: "'Yoster Island',Volter,monospace",
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
                              fontFamily: "'Yoster Island',Volter,monospace",
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
                                fontFamily: "'Yoster Island',Volter,monospace",
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
                    height: '46px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: v.startBg,
                    boxShadow: v.startShadow,
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '15px',
                    opacity: v.startOpacity,
                  }}
                >
                  ENTER THE ARENA
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isBattle ? (
          <>
            <div
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
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '13px',
                          color: '#FFF2B0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        WAVE {v.waveNo}
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
                      {v.scoreLabel} {v.score} / TURN {v.turns}
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
                    style={{
                      position: 'relative',
                      width: 'clamp(96px,22vh,190px)',
                      height: 'clamp(96px,22vh,190px)',
                      opacity: v.monsterOpacity,
                      backgroundImage: `url(${v.monsterUrl})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center bottom',
                      imageRendering: 'pixelated',
                      animation: v.monsterAnim,
                    }}
                  >
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
                      <div
                        style={{
                          height: '100%',
                          background: '#D14141',
                          width: `${v.enemyPct}%`,
                          transition: 'width .35s ease-out',
                        }}
                      ></div>
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
                                fontFamily: "'Yoster Island',Volter,monospace",
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
                                        "'Yoster Island',Volter,monospace",
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
                              fontFamily: "'Yoster Island',Volter,monospace",
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
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '9px',
                        color: '#FFF2B0',
                      }}
                    >
                      {v.heroTipName}
                    </div>
                    <div
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
                            fontFamily: "'Yoster Island',Volter,monospace",
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
                      fontSize: '11px',
                      color: v.previewColor,
                      transition: 'color .2s',
                    }}
                  >
                    {v.previewText}
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
                            borderRadius: '8px',
                            border: `2px solid ${c.bd}`,
                            background: c.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: c.scale,
                            zIndex: c.z,
                            opacity: c.cellOpacity,
                            animation: c.anim,
                          }}
                        >
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
                              width: '75%',
                              height: '75%',
                              backgroundImage: `url(${c.icon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                              pointerEvents: 'none',
                            }}
                          ></div>
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            fontFamily: "'Yoster Island',Volter,monospace",
                            fontSize: '22px',
                            color: p.color,
                            textShadow: '0 2px 0 #141D2E',
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
                      height: '26px',
                      padding: '0 10px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '10px',
                    }}
                  >
                    HOME
                  </div>
                  <div
                    style={{
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                      style={{
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '12px',
                        color: '#FCE370',
                      }}
                    >
                      {v.coins}
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
                      style={{
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '12px',
                        color: '#8FE3FF',
                      }}
                    >
                      {v.gems}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  height: '30px',
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
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '10px',
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#1D2956',
                        border: `2px solid ${b.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '9px',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          flexShrink: '0',
                          backgroundImage: `url(${v.coinIcon})`,
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
                            fontFamily: "'Yoster Island',Volter,monospace",
                            fontSize: '13px',
                            color: '#FCE370',
                          }}
                        >
                          {b.amount}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            color: b.bonusColor,
                            display: b.bonusDisplay,
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
                          height: '34px',
                          padding: '0 11px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: b.btnBg,
                          boxShadow: b.btnShadow,
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '11px',
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
                  Gems buy premium packs and coin bundles. Prices are
                  placeholders and no payment is taken.
                </div>
                {(v.gemBundles || []).map((b: any, bI: number) => (
                  <Fragment key={bI}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#1D2956',
                        border: `2px solid ${b.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '9px',
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
                            fontFamily: "'Yoster Island',Volter,monospace",
                            fontSize: '13px',
                            color: '#8FE3FF',
                          }}
                        >
                          {b.amount}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            color: b.bonusColor,
                            display: b.bonusDisplay,
                          }}
                        >
                          {b.bonusLabel}
                        </div>
                      </div>
                      <div
                        onClick={b.buy}
                        style={{
                          cursor: 'pointer',
                          flexShrink: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '34px',
                          padding: '0 13px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#AEE45D',
                          boxShadow:
                            '0 -4px 0 0 #6F9E2E inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '11px',
                        }}
                      >
                        {b.priceLabel}
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
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: '#1D2956',
                        border: `2px solid ${p.tint}`,
                        borderRadius: '8px 0 8px 0',
                        padding: '10px',
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
                          style={{
                            width: '52px',
                            height: '62px',
                            flexShrink: '0',
                            backgroundImage: `url(${p.img})`,
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
                              fontFamily: "'Yoster Island',Volter,monospace",
                              fontSize: '12px',
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
                          height: '36px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: p.btnBg,
                          boxShadow: p.btnShadow,
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '12px',
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
                      height: '26px',
                      padding: '0 10px',
                      border: '1px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '10px',
                    }}
                  >
                    HOME
                  </div>
                  <div
                    style={{
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                    style={{
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '12px',
                      color: '#FCE370',
                    }}
                  >
                    {v.coins}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  height: '30px',
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
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '10px',
                        color: t.fg,
                      }}
                    >
                      <span>{t.label}</span>
                      <span style={{ fontSize: '9px', opacity: '.75' }}>
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
                            fontFamily: "'Yoster Island',Volter,monospace",
                            fontSize: '11px',
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
                          height: '32px',
                          padding: '0 12px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '11px',
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
                      height: '32px',
                      padding: '0 14px',
                      border: '2px solid #000000',
                      borderRadius: '8px 2px 8px 2px',
                      background: '#B5C0FF',
                      boxShadow:
                        '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
                      color: '#000000',
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '11px',
                    }}
                  >
                    GO TO SHOP
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: '1',
                  minHeight: '0',
                  overflowY: 'auto',
                  display: v.gearPaneDisplay,
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: '#9DB4D4',
                    lineHeight: '1.6',
                  }}
                >
                  {v.collectionLine}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4,1fr)',
                    gap: '6px',
                    justifyItems: 'center',
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
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            border: `2px solid ${c.bd}`,
                            borderRadius: '3px',
                            backgroundColor: '#141D2E',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: '0',
                              right: '0',
                              top: '0',
                              bottom: '11px',
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
                              right: '-2px',
                              top: '-2px',
                              display: c.countDisplay,
                              alignItems: 'center',
                              height: '14px',
                              padding: '0 3px',
                              borderRadius: '0 0 4px 0',
                              background: '#141212',
                              fontFamily: "'Yoster Island',Volter,monospace",
                              fontSize: '8px',
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
                              padding: '0 3px',
                              background: c.bd,
                              fontFamily: "'Yoster Island',Volter,monospace",
                              fontSize: '7px',
                              lineHeight: '1.6',
                              color: '#141212',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
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
                onClick={v.closeCardInfo}
                style={{
                  position: 'absolute',
                  inset: '0',
                  zIndex: '26',
                  display: v.cardInfoDisplay,
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
                    background: '#CDD6F6',
                    borderRadius: '8px',
                    padding: '6px',
                    animation: 'glPop 240ms ease-out',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '11px',
                      overflowY: 'auto',
                      background: '#F0F0F0',
                      border: '2px solid #F7F7F5',
                      borderRadius: '4px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '70px',
                          height: '70px',
                          flexShrink: '0',
                          border: `2px solid ${v.cardInfoRarityColor}`,
                          borderRadius: '4px',
                          backgroundColor: '#1D2956',
                          padding: '7px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${v.cardInfoIcon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                            filter: v.cardInfoFilter,
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Yoster Island',Volter,monospace",
                            fontSize: '14px',
                            color: '#3C63FF',
                            textWrap: 'pretty',
                          }}
                        >
                          {v.cardInfoName}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '9px',
                              color: '#1D2956',
                              background: v.cardInfoRarityColor,
                              borderRadius: '3px',
                              padding: '1px 5px',
                              letterSpacing: '.08em',
                            }}
                          >
                            {v.cardInfoRarity}
                          </span>
                          <span style={{ fontSize: '9px', color: '#8B7355' }}>
                            {v.cardInfoClass}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                backgroundImage: `url(${v.cardInfoTypeIcon})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'pixelated',
                              }}
                            ></div>
                            <span
                              style={{
                                fontSize: '9px',
                                color: v.cardInfoTypeColor,
                              }}
                            >
                              {v.cardInfoType}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: v.cardInfoOwnColor,
                          }}
                        >
                          {v.cardInfoOwn}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#8B7355',
                        lineHeight: '1.7',
                        borderTop: '1px solid #D8DCE6',
                        paddingTop: '10px',
                      }}
                    >
                      {v.cardInfoWhat}
                    </div>
                    <div
                      style={{
                        display: v.cardInfoRiderDisplay,
                        alignItems: 'flex-start',
                        gap: '8px',
                        background: '#E6E9F5',
                        borderRadius: '4px',
                        padding: '8px 9px',
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
                    <div
                      onClick={v.closeCardInfo}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '40px',
                        border: '3px solid #000000',
                        borderRadius: '8px 2px 8px 2px',
                        background: '#B5C0FF',
                        boxShadow:
                          '0 -4px 0 0 #7E84E6 inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                        color: '#000000',
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '12px',
                      }}
                    >
                      CLOSE
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
              <div
                style={{
                  fontFamily: "'Yoster Island',Volter,monospace",
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
                          fontFamily: "'Yoster Island',Volter,monospace",
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
                          fontFamily: "'Yoster Island',Volter,monospace",
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
                          fontFamily: "'Yoster Island',Volter,monospace",
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
                    height: '32px',
                    padding: '0 14px',
                    border: '2px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '11px',
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
                    height: '38px',
                    padding: '0 20px',
                    border: '2px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#FCE270',
                    boxShadow: '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '13px',
                  }}
                >
                  COLLECT
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.isDuelLobby ? (
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
                  onClick={v.goHome}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '26px',
                    padding: '0 10px',
                    border: '1px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow: '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '10px',
                  }}
                >
                  HOME
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#FCE370',
                    letterSpacing: '.14em',
                  }}
                >
                  {v.trophies} TROPHIES
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  flexShrink: '0',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '17px',
                    color: '#FFF2B0',
                  }}
                >
                  DUEL
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#CBD9EC',
                    lineHeight: '1.6',
                    textWrap: 'pretty',
                  }}
                >
                  No monsters and no pre-built team. Your board and theirs, one
                  above the other, and everything you link either hits them or
                  buries them.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  background: '#1D2956',
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
                  fontSize: '9px',
                  color: '#9DB4D4',
                  letterSpacing: '.14em',
                  flexShrink: '0',
                }}
              >
                PICK AN OPPONENT
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
                        border: '2px solid #3A4C74',
                        borderRadius: '8px 0 8px 0',
                        padding: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: '0',
                          backgroundImage: `url(${f.img})`,
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
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '6px',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "'Yoster Island',Volter,monospace",
                              fontSize: '12px',
                              color: '#FFFFFF',
                            }}
                          >
                            {f.name}
                          </div>
                          <div
                            style={{
                              fontSize: '8px',
                              color: '#9DB4D4',
                              letterSpacing: '.1em',
                            }}
                          >
                            {f.cls}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            color: '#CBD9EC',
                            lineHeight: '1.5',
                          }}
                        >
                          {f.blurb}
                        </div>
                        <div style={{ fontSize: '8px', color: '#8A9BBF' }}>
                          {f.perk}
                        </div>
                      </div>
                      <div
                        style={{
                          flexShrink: '0',
                          fontFamily: "'Yoster Island',Volter,monospace",
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
            </div>
          </>
        ) : null}

        {v.isDuel ? (
          <>
            <div
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
                    fontFamily: "'Yoster Island',Volter,monospace",
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
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                          borderRadius: '3px',
                          border: '1px solid rgba(0,0,0,.35)',
                          background: c.bg,
                          opacity: c.opacity,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          animation: c.anim,
                        }}
                      >
                        <div
                          style={{
                            width: '72%',
                            height: '72%',
                            backgroundImage: `url(${c.icon})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            imageRendering: 'pixelated',
                          }}
                        ></div>
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
                            fontFamily: "'Yoster Island',Volter,monospace",
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
                            borderRadius: '6px',
                            border: `2px solid ${c.bd}`,
                            background: c.bg,
                            opacity: c.opacity,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: c.anim,
                          }}
                        >
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
                              width: '72%',
                              height: '72%',
                              backgroundImage: `url(${c.icon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                            }}
                          ></div>
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
                            fontFamily: "'Yoster Island',Volter,monospace",
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
                                  fontFamily:
                                    "'Yoster Island',Volter,monospace",
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
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                                  fontFamily:
                                    "'Yoster Island',Volter,monospace",
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
                            borderRadius: '8px',
                            border: `2px solid ${c.bd}`,
                            background: c.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: c.scale,
                            opacity: c.opacity,
                            animation: c.anim,
                          }}
                        >
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
                              width: '75%',
                              height: '75%',
                              backgroundImage: `url(${c.icon})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                              pointerEvents: 'none',
                            }}
                          ></div>
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
                            fontFamily: "'Yoster Island',Volter,monospace",
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
                    animation: 'glPop 260ms ease-out',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                          height: '30px',
                          padding: '0 14px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '11px',
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
                    animation: 'glPop 300ms ease-out',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '12px',
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
                        fontFamily: "'Yoster Island',Volter,monospace",
                        fontSize: '12px',
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
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '20px',
                      color: '#3C63FF',
                      textAlign: 'center',
                    }}
                  >
                    {v.endTitle}
                  </div>
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
                              fontFamily: "'Yoster Island',Volter,monospace",
                              fontSize: '22px',
                              color: e.color,
                            }}
                          >
                            {e.value}
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
                  onClick={v.goLoadout}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '44px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#FCE270',
                    boxShadow:
                      '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '14px',
                  }}
                >
                  HOME
                </div>
                <div
                  onClick={v.openBoard}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '40px',
                    border: '3px solid #000000',
                    borderRadius: '8px 2px 8px 2px',
                    background: '#B5C0FF',
                    boxShadow:
                      '0 -4px 0 0 #7E84E6 inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
                    color: '#000000',
                    fontFamily: "'Yoster Island',Volter,monospace",
                    fontSize: '12px',
                  }}
                >
                  BLACKSMITHS
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.modalOpen ? (
          <>
            <div
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
                      fontFamily: "'Yoster Island',Volter,monospace",
                      fontSize: '15px',
                      color: '#3C63FF',
                      textAlign: 'center',
                    }}
                  >
                    {v.modalTitle}
                  </div>
                  {(v.modalRows || []).map((r: any, rI: number) => (
                    <Fragment key={rI}>
                      <div
                        style={{
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
                    </Fragment>
                  ))}
                  {(v.modalActions || []).map((a: any, aI: number) => (
                    <Fragment key={aI}>
                      <div
                        onClick={a.run}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '40px',
                          border: '3px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: a.bg,
                          boxShadow: a.shadow,
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '12px',
                        }}
                      >
                        {a.label}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {v.ftueOn ? (
          <>
            <div
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
                      fontFamily: "'Yoster Island',Volter,monospace",
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
                          height: '30px',
                          padding: '0 14px',
                          border: '2px solid #000000',
                          borderRadius: '8px 2px 8px 2px',
                          background: '#FCE270',
                          boxShadow:
                            '0 -3px 0 0 #FF961D inset, 0 3px 0 0 #FFF inset',
                          color: '#000000',
                          fontFamily: "'Yoster Island',Volter,monospace",
                          fontSize: '11px',
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
      </div>
    </div>
  </div>
);
