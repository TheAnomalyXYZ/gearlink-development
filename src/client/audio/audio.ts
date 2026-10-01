/**
 * Music and sound effects, routed through one WebAudio graph.
 *
 * iOS Safari ignores `HTMLMediaElement.volume`, so the music element is piped
 * through a GainNode and effects are decoded buffers played into a second one -
 * both volume sliders are gains, which is the only thing every browser honours.
 *
 * Browsers also refuse to start audio before a user gesture, so nothing is
 * created until the first tap. A track asked for before then is remembered and
 * starts on that tap.
 */
import { SFX } from './tracks.js';
import type { SfxKey } from './tracks.js';

export type Volumes = { music: number; sfx: number };

export const DEFAULT_VOLUMES: Volumes = { music: 50, sfx: 50 };

/** Music sits under the effects at the same slider value. */
const MUSIC_SCALE = 0.4;
const FADE_S = 0.5;
const STORE_KEY = 'gearlink.volumes';

const clampVol = (n: unknown, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n)
    ? Math.min(100, Math.max(0, Math.round(n)))
    : fallback;

/** The saved slider values. Browser storage can be absent or throw (private
 *  windows, blocked site data), which just means the defaults. */
export const loadVolumes = (): Volumes => {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_VOLUMES;
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object') return DEFAULT_VOLUMES;
    return {
      music: clampVol(Reflect.get(v, 'music'), DEFAULT_VOLUMES.music),
      sfx: clampVol(Reflect.get(v, 'sfx'), DEFAULT_VOLUMES.sfx),
    };
  } catch {
    return DEFAULT_VOLUMES;
  }
};

export const saveVolumes = (v: Volumes): void => {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(v));
  } catch {
    /* not saved: the sliders still apply for this session */
  }
};

type PlayOpts = { rate?: number; gain?: number };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private el: HTMLAudioElement | null = null;
  private buffers = new Map<SfxKey, AudioBuffer>();
  private loading = new Set<SfxKey>();
  private vol: Volumes = DEFAULT_VOLUMES;
  /** The track the game wants playing, whether or not it has started yet. */
  private want: string | null = null;
  private playing: string | null = null;
  private switchTimer: ReturnType<typeof setTimeout> | null = null;
  private attached = false;
  /** False when the element could not be routed through the gain node. */
  private wired = false;

  /** Listen for the first gesture and for the tab hiding. Safe to call twice. */
  attach(): void {
    if (this.attached || typeof document === 'undefined') return;
    this.attached = true;
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click'])
      document.addEventListener(ev, this.unlock, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click'])
      document.removeEventListener(ev, this.unlock);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.switchTimer) clearTimeout(this.switchTimer);
    this.el?.pause();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = this.musicGain = this.sfxGain = this.el = null;
    this.wired = false;
    this.buffers.clear();
    this.loading.clear();
    this.playing = null;
  }

  setVolumes(v: Volumes): void {
    this.vol = v;
    const ctx = this.ctx;
    if (!ctx) return;
    this.musicGain?.gain.setTargetAtTime(this.musicLevel(), ctx.currentTime, 0.05);
    this.sfxGain?.gain.setTargetAtTime(v.sfx / 100, ctx.currentTime, 0.05);
    if (this.el && !this.wired) this.el.volume = this.musicLevel();
    if (v.music === 0) this.el?.pause();
    else if (this.playing && this.el?.paused && !document.hidden)
      void this.el.play().catch(() => undefined);
  }

  /** Crossfade to `src`, or start it on the first tap if audio is still locked. */
  music(src: string): void {
    if (this.want === src) return;
    this.want = src;
    if (this.ctx) this.switchTo(src);
  }

  play(key: SfxKey, opts: PlayOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.vol.sfx === 0) return;
    const buf = this.buffers.get(key);
    // Not decoded yet: skip this one rather than play it late.
    if (!buf) {
      this.load(key);
      return;
    }
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.playbackRate.value = opts.rate ?? 1;
    let out: AudioNode = this.sfxGain;
    if (opts.gain !== undefined && opts.gain !== 1) {
      const g = ctx.createGain();
      g.gain.value = opts.gain;
      g.connect(this.sfxGain);
      out = g;
    }
    node.connect(out);
    node.start();
  }

  private musicLevel(): number {
    return MUSIC_SCALE * (this.vol.music / 100);
  }

  private unlock = (): void => {
    if (!this.ctx) {
      if (typeof window.AudioContext !== 'function') return;
      try {
        this.ctx = new window.AudioContext();
      } catch {
        return;
      }
      const ctx = this.ctx;
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.vol.sfx / 100;
      this.sfxGain.connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(ctx.destination);
      const el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      this.el = el;
      // Wired before the element's first play(), which iOS requires for the
      // gain to apply at all.
      try {
        ctx.createMediaElementSource(el).connect(this.musicGain);
        this.wired = true;
      } catch {
        /* falls back to the element's own (non-iOS) volume */
      }
      for (const k of Object.keys(SFX)) if (isSfxKey(k)) this.load(k);
      if (this.want) this.switchTo(this.want);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    if (this.playing && this.el?.paused && this.vol.music > 0 && !document.hidden)
      void this.el.play().catch(() => undefined);
  };

  private onVisibility = (): void => {
    if (!this.el) return;
    if (document.hidden) {
      this.el.pause();
      return;
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    if (this.playing && this.vol.music > 0) void this.el.play().catch(() => undefined);
  };

  private switchTo(src: string): void {
    const ctx = this.ctx;
    const el = this.el;
    const gain = this.musicGain;
    if (!ctx || !el || !gain || this.playing === src) return;
    if (this.switchTimer) clearTimeout(this.switchTimer);
    const start = () => {
      this.switchTimer = null;
      if (this.want !== src) return;
      this.playing = src;
      el.src = src;
      if (!this.wired) el.volume = this.musicLevel();
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.musicLevel(), now + FADE_S);
      if (this.vol.music > 0 && !document.hidden)
        void el.play().catch(() => undefined);
    };
    if (!this.playing || el.paused) {
      start();
      return;
    }
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + FADE_S);
    this.switchTimer = setTimeout(start, FADE_S * 1000);
  }

  private load(key: SfxKey): void {
    const ctx = this.ctx;
    if (!ctx || this.buffers.has(key) || this.loading.has(key)) return;
    this.loading.add(key);
    void fetch(SFX[key])
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error())))
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buf) => {
        if (this.ctx === ctx) this.buffers.set(key, buf);
      })
      .catch(() => undefined)
      .finally(() => this.loading.delete(key));
  }
}

const isSfxKey = (k: string): k is SfxKey => k in SFX;

/** The one engine; the game, the sliders and the click handler all share it. */
export const audio = new AudioEngine();
