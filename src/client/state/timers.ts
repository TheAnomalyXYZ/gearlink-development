/**
 * Named timers. Each key holds at most one pending handle: scheduling a key
 * cancels whatever it held, which is what every animation beat wants - a new
 * beat supersedes the old one instead of racing it.
 */
type Handle = {
  kind: 'timeout' | 'interval';
  id: ReturnType<typeof setTimeout>;
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
    this.handles.set(key, { kind: 'timeout', id });
  }

  /** Run `fn` every `ms`, replacing anything pending under `key`. */
  every(key: K, ms: number, fn: () => void): void {
    this.clear(key);
    this.handles.set(key, { kind: 'interval', id: setInterval(fn, ms) });
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
