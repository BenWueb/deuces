"use client";

import { useCallback, useEffect, useState } from "react";

export const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];

export type LocationStatus = "loading" | "granted" | "denied" | "unsupported";

export function useUserLocation() {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<LocationStatus>("loading");

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { location, status, request };
}
