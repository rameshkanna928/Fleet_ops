import type { DeviceStatus } from "@/lib/devices/types";

const styles: Record<DeviceStatus, string> = {
  online: "bg-status-online/15 text-status-online border-status-online/30",
  idle: "bg-status-idle/15 text-status-idle border-status-idle/30",
  offline: "bg-status-offline/15 text-status-offline border-status-offline/30",
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
