"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Read a browser-only value (origin, timezone, feature support) without a
 * hydration mismatch: the server snapshot is used for SSR and hydration,
 * then the client value takes over. `getValue` must return a stable value.
 */
export function useClientValue<T>(getValue: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getValue, () => serverValue);
}

let zones: string[] | null = null;
export function supportedTimeZones(): string[] {
  if (!zones) {
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      zones = [];
    }
  }
  return zones;
}

export const getOrigin = () => window.location.origin;
export const getCanShare = () => typeof navigator.share === "function";
