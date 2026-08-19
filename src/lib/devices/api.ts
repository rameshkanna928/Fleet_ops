import type { Device, DeviceStatus } from "./types";

const SEED_URL = "https://jsonplaceholder.typicode.com/users";

interface SeedUser {
  id: number;
  name: string;
  email: string;
  address: { city: string };
  company: { name: string };
}

const STATUSES: DeviceStatus[] = ["online", "idle", "offline"];

function seedToDevice(u: SeedUser, i: number): Device {
  const status = STATUSES[i % STATUSES.length]!;
  return {
    id: u.id,
    name: u.name,
    operator: u.company?.name ?? "Unknown",
    city: u.address?.city ?? "Unknown",
    email: u.email,
    status,
    speed: status === "online" ? Math.round(Math.random() * 90) : 0,
    battery: 40 + Math.round(Math.random() * 60),
    lastSeen: Date.now(),
  };
}

export interface FetchDevicesOptions {
  /** force the error state for demoing */
  simulateError?: boolean;
  /** force the empty state for demoing */
  simulateEmpty?: boolean;
  signal?: AbortSignal;
}

export async function fetchDevices(opts: FetchDevicesOptions = {}): Promise<Device[]> {
  const url = opts.simulateError ? "https://jsonplaceholder.typicode.com/__nope__" : SEED_URL;
  const res = await fetch(url, opts.signal ? { signal: opts.signal } : {});
  if (!res.ok) throw new Error(`Failed to load devices (HTTP ${res.status})`);
  const users = (await res.json()) as SeedUser[];
  if (opts.simulateEmpty) return [];
  return users.map(seedToDevice);
}

/** Simulated per-device detail fetch with variable latency (race-safety demo). */
export async function fetchDeviceDetail(
  id: number,
  signal?: AbortSignal,
): Promise<{ id: number; firmware: string; uptimeHours: number; notes: string }> {
  const delay = 200 + Math.random() * 900;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, delay);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
  return {
    id,
    firmware: `v${2 + (id % 3)}.${id % 10}.${(id * 7) % 10}`,
    uptimeHours: 12 + ((id * 37) % 900),
    notes: id % 4 === 0 ? "Scheduled maintenance pending" : "No open incidents",
  };
}
