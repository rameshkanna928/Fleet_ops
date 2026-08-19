import { useEffect, useRef, useState } from "react";
import { fetchDeviceDetail } from "@/lib/devices/api";
import { useDevice } from "@/lib/devices/hooks";
import type { DeviceStore } from "@/lib/devices/store";
import { StatusBadge } from "./StatusBadge";

interface DeviceDetail {
  id: number;
  firmware: string;
  uptimeHours: number;
  notes: string;
}

export interface DeviceDetailPanelProps {
  id: number;
  store: DeviceStore;
  onClose: () => void;
}

export function DeviceDetailPanel({ id, store, onClose }: DeviceDetailPanelProps) {
  // Live values keep flowing while the panel is open.
  const device = useDevice(store, id);
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    // Race safety: every request gets a sequence number, and only the newest
    // one is allowed to write state. The in-flight one is also aborted.
    const seq = ++requestRef.current;
    const controller = new AbortController();
    setDetail(null);
    setError(null);

    fetchDeviceDetail(id, controller.signal)
      .then((d) => {
        if (seq !== requestRef.current) return;
        setDetail(d);
      })
      .catch((e: unknown) => {
        if (seq !== requestRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Could not load device details.");
      });

    return () => controller.abort();
  }, [id]);

  if (!device) return null;

  return (
    <aside className="flex h-full w-full flex-col rounded-lg border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{device.name}</h2>
          <p className="text-xs text-muted-foreground">
            #{device.id} · {device.operator}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          Close
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 border-b border-border p-4">
        <Field label="Status">
          <StatusBadge status={device.status} />
        </Field>
        <Field label="Speed">
          <span className="font-mono tabular-nums">{device.speed} km/h</span>
        </Field>
        <Field label="Battery">
          <span className="font-mono tabular-nums">{device.battery.toFixed(1)}%</span>
        </Field>
        <Field label="Last seen">
          <span className="font-mono text-xs">
            {new Date(device.lastSeen).toLocaleTimeString()}
          </span>
        </Field>
        <Field label="City">{device.city}</Field>
        <Field label="Contact">
          <span className="break-all text-xs">{device.email}</span>
        </Field>
      </div>

      <div className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Device record
        </p>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !detail ? (
          <div className="space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <Row label="Firmware" value={detail.firmware} />
            <Row label="Uptime" value={`${detail.uptimeHours} h`} />
            <Row label="Notes" value={detail.notes} />
          </dl>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
