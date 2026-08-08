"use client";

import { CourtMap } from "@/components/map/court-map";

export function LocationPicker({
  lat,
  lng,
  onChange,
  userLocation,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  userLocation?: [number, number] | null;
}) {
  return (
    <div className="h-64 overflow-hidden rounded-2xl border border-border">
      <CourtMap
        courts={[]}
        center={[lat, lng]}
        zoom={15}
        userLocation={userLocation}
        draggableMarker={{
          position: [lat, lng],
          onDrag: onChange,
        }}
      />
    </div>
  );
}
