import type { Device, DeviceFeed, FeedMessage } from "./types";

type Listener = () => void;

/**
 * Tiny external store built for high-frequency updates.
 *
 * Two subscription levels:
 *  - per-device: only the row bound to that id re-renders on a patch
 *  - list-version: bumped on a throttled cadence so the sorted/filtered list
 *    is recomputed at most ~4x/sec instead of on every message
 *
 * Incoming patches are coalesced per device id in a buffer flushed on
 * requestAnimationFrame, so a burst of 500 msgs/sec still costs one render
 * per changed row per frame.
 */
export class DeviceStore {
  private devices = new Map<number, Device>();
  private deviceListeners = new Map<number, Set<Listener>>();
  private listListeners = new Set<Listener>();
  private idsSnapshot: number[] = [];
  private listVersion = 0;
  private pending = new Map<number, Partial<Device>>();
  private frame: number | null = null;
  private lastListBump = 0;
  private unsubFeed: (() => void) | null = null;

  setSeed(devices: Device[]) {
    this.devices = new Map(devices.map((d) => [d.id, d]));
    this.idsSnapshot = devices.map((d) => d.id);
    this.listVersion++;
    this.emitList();
  }

  attachFeed(feed: DeviceFeed) {
    this.detachFeed();
    this.unsubFeed = feed.subscribe((msg) => this.handleMessage(msg));
  }

  detachFeed() {
    this.unsubFeed?.();
    this.unsubFeed = null;
  }

  private handleMessage(msg: FeedMessage) {
    if (msg.type === "snapshot") {
      this.setSeed(msg.devices);
      return;
    }
    if (!this.devices.has(msg.id)) return;
    const prev = this.pending.get(msg.id) ?? {};
    this.pending.set(msg.id, { ...prev, ...msg.changes, lastSeen: msg.ts });
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.frame !== null) return;
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
    this.frame = raf(() => {
      this.frame = null;
      this.flush();
    }) as unknown as number;
  }

  private flush() {
    if (this.pending.size === 0) return;
    for (const [id, changes] of this.pending) {
      const current = this.devices.get(id);
      if (!current) continue;
      this.devices.set(id, { ...current, ...changes });
      const ls = this.deviceListeners.get(id);
      if (ls) for (const l of ls) l();
    }
    this.pending.clear();

    // Throttle list-level invalidation: sorting/filtering is the expensive part.
    const now = Date.now();
    if (now - this.lastListBump > 250) {
      this.lastListBump = now;
      this.listVersion++;
      this.emitList();
    }
  }

  private emitList() {
    for (const l of this.listListeners) l();
  }

  // --- read APIs (stable snapshots for useSyncExternalStore) ---

  subscribeDevice = (id: number) => (listener: Listener) => {
    let set = this.deviceListeners.get(id);
    if (!set) {
      set = new Set();
      this.deviceListeners.set(id, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.deviceListeners.delete(id);
    };
  };

  getDevice = (id: number) => this.devices.get(id);

  subscribeList = (listener: Listener) => {
    this.listListeners.add(listener);
    return () => this.listListeners.delete(listener);
  };

  getListVersion = () => this.listVersion;

  getIds = () => this.idsSnapshot;

  getAll = () => Array.from(this.devices.values());
}
