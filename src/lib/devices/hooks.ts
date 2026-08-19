import { useCallback, useSyncExternalStore } from "react";
import type { DeviceStore } from "./store";

export function useDevice(store: DeviceStore, id: number) {
  const subscribe = useCallback((l: () => void) => store.subscribeDevice(id)(l), [store, id]);
  const getSnapshot = useCallback(() => store.getDevice(id), [store, id]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Bumped on a throttled cadence; use it as the memo key for filter/sort. */
export function useListVersion(store: DeviceStore) {
  return useSyncExternalStore(store.subscribeList, store.getListVersion, store.getListVersion);
}
