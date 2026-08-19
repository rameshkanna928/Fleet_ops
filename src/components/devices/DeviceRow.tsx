import { memo } from "react";
import { useDevice } from "@/lib/devices/hooks";
import type { DeviceStore } from "@/lib/devices/store";
import { StatusBadge } from "./StatusBadge";

export interface DeviceRowProps {
  id: number;
  store: DeviceStore;
  selected: boolean;
  onSelect: (id: number) => void;
}

/**
 * Subscribes to one device only. A patch for device 7 re-renders row 7 and
 * nothing else — the table body never re-renders on data changes.
 */
export const DeviceRow = memo(function DeviceRow({
  id,
  store,
  selected,
  onSelect,
}: DeviceRowProps) {
  const device = useDevice(store, id);
  if (!device) return null;

  return (
    <tr
      onClick={() => onSelect(device.id)}
      className={`cursor-pointer border-b border-border transition-colors hover:bg-accent ${
        selected ? "bg-accent" : ""
      }`}
    >
      <td className="px-4 py-2.5 font-medium text-foreground">{device.name}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{device.operator}</td>
      <td className="px-4 py-2.5">
        <StatusBadge status={device.status} />
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">
        {device.speed}
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
        {device.battery.toFixed(1)}%
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
        {new Date(device.lastSeen).toLocaleTimeString()}
      </td>
    </tr>
  );
});
