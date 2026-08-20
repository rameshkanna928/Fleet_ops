import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/devices/DashboardShell";
import { DeviceDetailPanel } from "@/components/devices/DeviceDetailPanel";
import { DeviceRow } from "@/components/devices/DeviceRow";
import { fetchDevices } from "@/lib/devices/api";
import { useListVersion } from "@/lib/devices/hooks";
import { SimulatedDeviceFeed } from "@/lib/devices/simulatedFeed";
import { DeviceStore } from "@/lib/devices/store";
import type { Device, DeviceStatus, FeedStatus } from "@/lib/devices/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fleet Telemetry — Real-time Device Dashboard" },
      {
        name: "description",
        content:
          "Live fleet dashboard streaming device status, speed and battery telemetry in real time with filtering, sorting and a live detail panel.",
      },
      { property: "og:title", content: "Fleet Telemetry — Real-time Device Dashboard" },
      {
        property: "og:description",
        content:
          "Live fleet dashboard streaming device status, speed and battery telemetry in real time.",
      },
    ],
  }),
  component: FleetDashboard,
});

type SortKey = "name" | "operator" | "status" | "speed" | "battery";
type SortDir = "asc" | "desc";
type LoadState = "loading" | "error" | "ready";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Device" },
  { key: "operator", label: "Operator" },
  { key: "status", label: "Status" },
  { key: "speed", label: "Speed (km/h)", align: "right" },
  { key: "battery", label: "Battery", align: "right" },
];

function FleetDashboard() {
  const storeRef = useRef<DeviceStore | null>(null);
  if (storeRef.current === null) storeRef.current = new DeviceStore();
  const store = storeRef.current;
  const feedRef = useRef<SimulatedDeviceFeed | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("closed");
  const [mode, setMode] = useState<"normal" | "error" | "empty">("normal");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Initial load + feed wiring.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoadState("loading");
    feedRef.current?.disconnect();

    fetchDevices({
      simulateError: mode === "error",
      simulateEmpty: mode === "empty",
      signal: controller.signal,
    })
      .then((devices: Device[]) => {
        if (cancelled) return;
        store.setSeed(devices);
        setLoadState("ready");
        const feed = new SimulatedDeviceFeed({
          devices,
          intervalMs: busy ? 50 : 600,
          patchesPerTick: busy ? 25 : 3,
        });
        feedRef.current = feed;
        store.attachFeed(feed);
        feed.onStatusChange(setFeedStatus);
        feed.connect();
      })
      .catch((e: unknown) => {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setErrorMsg(e instanceof Error ? e.message : "Unknown error");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
      feedRef.current?.disconnect();
      store.detachFeed();
    };
  }, [store, mode, busy]);

  // Debounce the search input so filtering doesn't fire on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const version = useListVersion(store);

  // Filter + sort recompute at most ~4x/sec (throttled list version), never on
  // every incoming message, and never resets user input or scroll.
  const visibleIds = useMemo(() => {
    void version;
    const q = debouncedQuery.trim().toLowerCase();
    const rows = store
      .getAll()
      .filter(
        (d) =>
          (statusFilter === "all" || d.status === statusFilter) &&
          (q === "" ||
            d.name.toLowerCase().includes(q) ||
            d.operator.toLowerCase().includes(q) ||
            d.city.toLowerCase().includes(q)),
      );
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows.map((d) => d.id);
  }, [store, version, debouncedQuery, statusFilter, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setSortKey((prev) => {
      if (prev === key) {
        return prev;
      }
      return key;
    });
  }, []);

  const handleSelect = useCallback((id: number) => setSelectedId(id), []);
  const handleClose = useCallback(() => setSelectedId(null), []);

  return (
    <DashboardShell>
      <div className="">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Fleet Telemetry
            </h1>
            <p className="text-sm text-muted-foreground">
              Live device status streamed over a swappable feed transport.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  feedStatus === "open"
                    ? "bg-status-online animate-pulse"
                    : feedStatus === "connecting"
                      ? "bg-status-idle"
                      : "bg-status-offline"
                }`}
              />
              feed {feedStatus}
            </span>
            <button
              onClick={() => setBusy((b) => !b)}
              className="rounded-md border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent"
            >
              {busy ? "Normal rate" : "Stress test (500/s)"}
            </button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, operator or city…"
              className="h-9 w-full rounded-md border border-input bg-card pl-3 pr-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            {query !== "" && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | "all")}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="normal">Success</option>
            <option value="error">Error</option>
            <option value="empty">No data</option>
          </select>

        </div>

        <div className="grid gap-4 grid-cols-1 xl:grid-cols-[75%_25%]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {loadState === "loading" ? (
              <TableSkeleton />
            ) : loadState === "error" ? (
              <EmptyState
                title="Couldn't load the fleet"
                body={errorMsg}
                action={
                  <button
                    onClick={() => setMode("normal")}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  >
                    Retry with a good endpoint
                  </button>
                }
              />
            ) : visibleIds.length === 0 ? (
              <EmptyState
                title="No devices match"
                body="Nothing in the fleet matches the current filters."
              />
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {COLUMNS.map((c) => (
                        <th
                          key={c.key}
                          onClick={() => toggleSort(c.key)}
                          className={`cursor-pointer select-none px-4 py-2.5 font-medium hover:text-foreground ${
                            c.align === "right" ? "text-right" : ""
                          }`}
                        >
                          {c.label}
                          {sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-right font-medium">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleIds.map((id) => (
                      <DeviceRow
                        key={id}
                        id={id}
                        store={store}
                        selected={selectedId === id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div >
            {selectedId !== null && loadState === "ready" ? (
              <DeviceDetailPanel id={selectedId} store={store} onClose={handleClose} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground w-full">
                Select a device to inspect its live telemetry.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
