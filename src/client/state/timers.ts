/**
 * Named timers. Each key holds at most one pending handle: scheduling a key
 * cancels whatever it held, which is what every animation beat wants - a new
 * beat supersedes the old one instead of racing it.
 */
type Handle = {
  kind: 'timeout' | 'interval';
  id: ReturnType<typeof setTimeout>;
  /** Timeouts only: when it fires and what it runs, so freeze() can push it. */
  due?: number;
  fn?: () => void;
};

export class Timers<K extends string> {
  private handles = new Map<K, Handle>();

  /** Run `fn` once after `ms`, replacing anything pending under `key`. */
  after(key: K, ms: number, fn: () => void): void {
    this.clear(key);
    const id = setTimeout(() => {
      // Dropped before `fn` runs, so a beat that re-schedules its own key from
      // inside the callback is not immediately cleared by the bookkeeping.
      if (this.handles.get(key)?.id === id) this.handles.delete(key);
      fn();
    }, ms);
    this.handles.set(key, {
      kind: 'timeout',
      id,
      due: performance.now() + ms,
      fn,
    });
  }

  /** Run `fn` every `ms`, replacing anything pending under `key`. */
  every(key: K, ms: number, fn: () => void): void {
    this.clear(key);
    this.handles.set(key, { kind: 'interval', id: setInterval(fn, ms) });
  }

  /** Hit-stop: every pending timeout is pushed back by `ms`. */
  freeze(ms: number): void {
    const t = performance.now();
    for (const [key, h] of [...this.handles]) {
      if (h.kind !== 'timeout' || !h.fn || h.due === undefined) continue;
      this.after(key, Math.max(0, h.due - t) + ms, h.fn);
    }
  }

  clear(...keys: K[]): void {
    for (const key of keys) {
      const h = this.handles.get(key);
      if (!h) continue;
      if (h.kind === 'interval') clearInterval(h.id);
      else clearTimeout(h.id);
      this.handles.delete(key);
    }
  }

  clearAll(): void {
    this.clear(...this.handles.keys());
  }

  has(key: K): boolean {
    return this.handles.has(key);
  }
}
