import type { Device, DeviceFeed, DeviceStatus, FeedMessage, FeedStatus } from "./types";

const STATUSES: DeviceStatus[] = ["online", "idle", "offline"];

export interface SimulatedFeedOptions {
  devices: Device[];
  /** emit interval in ms */
  intervalMs?: number;
  /** how many device patches per tick */
  patchesPerTick?: number;
}

/**
 * Drop-in stand-in for a WebSocket feed. Swap this class for a
 * WebSocketDeviceFeed implementing the same `DeviceFeed` interface and the
 * store/UI layers stay untouched.
 */
export class SimulatedDeviceFeed implements DeviceFeed {
  private listeners = new Set<(msg: FeedMessage) => void>();
  private statusListeners = new Set<(s: FeedStatus) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: FeedStatus = "closed";
  private ids: number[];
  private state = new Map<number, { status: DeviceStatus; speed: number; battery: number }>();

  constructor(private opts: SimulatedFeedOptions) {
    this.ids = opts.devices.map((d) => d.id);
    for (const d of opts.devices) {
      this.state.set(d.id, { status: d.status, speed: d.speed, battery: d.battery });
    }
  }

  connect() {
    if (this.timer) return;
    this.setStatus("connecting");
    const interval = this.opts.intervalMs ?? 600;
    const perTick = this.opts.patchesPerTick ?? 3;
    setTimeout(() => this.setStatus("open"), 150);
    this.timer = setInterval(() => {
      for (let i = 0; i < perTick; i++) this.emitRandomPatch();
    }, interval);
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.setStatus("closed");
  }

  subscribe(listener: (msg: FeedMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatusChange(listener: (s: FeedStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  setRate(intervalMs: number, patchesPerTick: number) {
    this.opts = { ...this.opts, intervalMs, patchesPerTick };
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.connect();
    }
  }

  private setStatus(s: FeedStatus) {
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  private emitRandomPatch() {
    if (this.ids.length === 0) return;
    const id = this.ids[Math.floor(Math.random() * this.ids.length)]!;
    const prev = this.state.get(id)!;
    const status: DeviceStatus =
      Math.random() < 0.15 ? STATUSES[Math.floor(Math.random() * 3)]! : prev.status;
    const speed =
      status === "online"
        ? Math.max(0, Math.min(120, Math.round(prev.speed + (Math.random() * 20 - 10))))
        : 0;
    const battery = Math.max(0, Math.round((prev.battery - Math.random() * 0.4) * 10) / 10);
    const next = { status, speed, battery };
    this.state.set(id, next);
    const msg: FeedMessage = { type: "patch", id, changes: next, ts: Date.now() };
    for (const l of this.listeners) l(msg);
  }
}
