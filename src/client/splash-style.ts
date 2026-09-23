/** The feed view's shared surfaces. Their own module so the card and the plain
 *  splash can both draw them without either file exporting a non-component. */
import type { CSSProperties } from 'react';

export const SHELL: CSSProperties = {
  backgroundColor: '#101528',
  backgroundImage: 'url(/art/PocketKnights/sky_v3.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center bottom',
  fontFamily: 'Volter,ui-monospace,monospace',
};

/** A challenge is thrown from somewhere, so it gets a place to be thrown from:
 *  the sky sits behind an arena, dimmed enough that the duellist stays the
 *  brightest thing on the card. */
export const ARENA: CSSProperties = {
  ...SHELL,
  backgroundImage:
    'url(/art/PocketKnights/Background/Castle.png),url(/art/PocketKnights/sky_v3.png)',
  backgroundSize: 'cover,cover',
  backgroundPosition: 'center 65%,center bottom',
};

export const SCRIM: CSSProperties = {
  background:
    'linear-gradient(180deg,rgba(11,16,32,.72),rgba(11,16,32,.3) 40%,rgba(16,21,40,.96))',
};

/** Warmer and tighter than the plain scrim: it has to sit over the arena art
 *  without washing it out, and it pools light in the middle where the duellist
 *  stands. */
export const ARENA_SCRIM: CSSProperties = {
  background:
    'radial-gradient(120% 78% at 50% 62%,rgba(255,180,60,.18),rgba(11,16,32,.55) 46%,rgba(9,13,26,.94) 100%)',
};

export const TITLE: CSSProperties = {
  fontFamily: "'Yoster Island',Volter,monospace",
  color: '#FFF2B0',
  textShadow: '0 4px 0 #141D2E',
};

export const PIXEL = "'Yoster Island',Volter,monospace";

/**
 * The feed view's motion, as a stylesheet the components inline themselves.
 *
 * It lives here rather than in `index.css` because the card is also rendered
 * on its own - in a test, and anywhere else that has no bundler - and a
 * challenge that does not move is the dull version of this card. Everything
 * is decoration, so it all stops under `prefers-reduced-motion`.
 */
export const MOTION = `
@keyframes glk-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes glk-breathe{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.06)}}
@keyframes glk-pop{0%{transform:scale(.7) rotate(-8deg);opacity:0}60%{transform:scale(1.14) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(-3deg);opacity:1}}
@keyframes glk-sheen{0%{transform:translateX(-140%)}55%,100%{transform:translateX(240%)}}
@keyframes glk-rise{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes glk-blink{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes glk-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(180deg)}}
.glk-bob{animation:glk-bob 3.2s ease-in-out infinite}
.glk-breathe{animation:glk-breathe 3.2s ease-in-out infinite}
.glk-pop{animation:glk-pop .5s cubic-bezier(.2,1.5,.4,1) both}
.glk-sheen{animation:glk-sheen 2.8s ease-in-out infinite}
.glk-blink{animation:glk-blink 1.6s ease-in-out infinite}
.glk-rise{animation:glk-rise .45s ease-out both}
.glk-star{position:absolute;pointer-events:none;color:#FFD84D;z-index:20;
filter:drop-shadow(0 0 3px #FFF2A8) drop-shadow(0 0 6px #FFB84D)}
.glk-s1{top:-4px;left:6px;animation:glk-twinkle 1.6s ease-in-out infinite}
.glk-s2{top:-5px;right:10px;animation:glk-twinkle 1.8s ease-in-out .4s infinite}
.glk-s3{bottom:-4px;left:28%;animation:glk-twinkle 1.4s ease-in-out .8s infinite}
.glk-s4{bottom:-5px;right:18%;animation:glk-twinkle 2s ease-in-out 1.1s infinite}
.glk-d1{animation-delay:.06s}.glk-d2{animation-delay:.12s}.glk-d3{animation-delay:.18s}
.glk-d4{animation-delay:.24s}.glk-d5{animation-delay:.3s}
@media (prefers-reduced-motion:reduce){
.glk-bob,.glk-breathe,.glk-pop,.glk-sheen,.glk-blink,.glk-rise,.glk-star{animation:none}
}`;
