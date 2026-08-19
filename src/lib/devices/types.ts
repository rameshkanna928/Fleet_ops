export type DeviceStatus = "online" | "idle" | "offline";

export interface Device {
  id: number;
  name: string;
  /** owner/company from the seed API */
  operator: string;
  city: string;
  email: string;
  status: DeviceStatus;
  /** primary live metric, km/h */
  speed: number;
  battery: number;
  lastSeen: number;
}

/** Messages the transport layer emits. Shaped like a wire protocol on purpose. */
export type FeedMessage =
  | { type: "snapshot"; devices: Device[] }
  | {
      type: "patch";
      id: number;
      changes: Partial<Pick<Device, "status" | "speed" | "battery">>;
      ts: number;
    };

export type FeedStatus = "connecting" | "open" | "closed";

/**
 * Transport seam. Anything that can push FeedMessages works here — the
 * simulated interval feed today, a real WebSocket tomorrow. Nothing above
 * this interface knows which one it is.
 */
export interface DeviceFeed {
  connect(): void;
  disconnect(): void;
  subscribe(listener: (msg: FeedMessage) => void): () => void;
  onStatusChange(listener: (status: FeedStatus) => void): () => void;
}
