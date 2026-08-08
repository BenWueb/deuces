"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { CourtListItem } from "@/lib/queries/courts";
import { DEFAULT_CENTER } from "@/lib/hooks/use-user-location";
import "leaflet/dist/leaflet.css";

const OPTIC_YELLOW = "#d4f542";
const COURT_BLUE = "#2f6fed";
const DROP_SHADOW = "filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))";

const round = (value: number) => Number(value.toFixed(2));

/**
 * A tennis ball: an optic-yellow sphere crossed by the two white seams. The
 * seams start on the rim at 140 and 220 degrees and bow toward the centre,
 * which is what reads as a tennis ball rather than a lemon.
 */
function tennisBallMarkup(cx: number, cy: number, r: number) {
  const seamOffsetX = round(r * 0.766);
  const seamOffsetY = round(r * 0.643);
  const seamPull = round(r * 0.25);
  const seamWidth = round(Math.max(1.4, r * 0.16));

  const seam = (direction: 1 | -1) => {
    const x = round(cx + direction * seamOffsetX);
    const controlX = round(cx + direction * seamPull);
    return `<path d="M${x} ${round(cy - seamOffsetY)} Q${controlX} ${cy} ${x} ${round(cy + seamOffsetY)}" fill="none" stroke="#fff" stroke-width="${seamWidth}" stroke-linecap="round" />`;
  };

  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${OPTIC_YELLOW}" stroke="${COURT_BLUE}" stroke-width="2" />`,
    seam(-1),
    seam(1),
  ].join("");
}

const courtIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="30" viewBox="0 0 32 32" style="${DROP_SHADOW}">${tennisBallMarkup(16, 16, 14)}</svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// The picker pin needs a precise tip, so the ball sits on a tapered stem whose
// point is the anchor.
const courtPinIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="44" viewBox="0 0 32 44" style="${DROP_SHADOW}"><path d="M16 43 L9.5 25 Q16 29 22.5 25 Z" fill="${COURT_BLUE}" />${tennisBallMarkup(16, 15, 13)}</svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 43],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#2f6fed;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(47,111,237,0.25);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function RecenterView({ center }: { center: [number, number] }) {
  const map = useMap();
  const lastCenter = useRef<string | null>(null);

  useEffect(() => {
    const key = `${center[0]},${center[1]}`;
    if (lastCenter.current === key) return;
    // Initial center/zoom come from MapContainer — only pan on later moves
    // so dragging the add-court pin never resets zoom.
    if (lastCenter.current === null) {
      lastCenter.current = key;
      return;
    }
    lastCenter.current = key;
    map.panTo(center);
  }, [center, map]);

  return null;
}

/** Pan to a pin when selected; shift so it sits above the bottom card. */
function FocusOnTarget({
  target,
}: {
  target: [number, number] | null;
}) {
  const map = useMap();
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!target) {
      lastTarget.current = null;
      return;
    }
    const key = `${target[0]},${target[1]}`;
    if (lastTarget.current === key) return;
    lastTarget.current = key;

    const zoom = Math.max(map.getZoom(), 14);
    // Project with a downward pixel offset so the pin lands above the card.
    const point = map.project(target, zoom);
    point.y += 110;
    const center = map.unproject(point, zoom);
    map.flyTo(center, zoom, { duration: 0.45 });
  }, [target, map]);

  return null;
}

function BoundsWatcher({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const map = useMapEvents({
    moveend: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        onBoundsChange({
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        });
      }, 400);
    },
  });

  return null;
}

export function CourtMap({
  courts,
  onBoundsChange,
  onSelectCourt,
  center,
  focusTarget = null,
  zoom = 13,
  draggableMarker,
  userLocation,
}: {
  courts: CourtListItem[];
  onBoundsChange?: (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => void;
  onSelectCourt?: (court: CourtListItem) => void;
  center?: [number, number];
  focusTarget?: [number, number] | null;
  zoom?: number;
  draggableMarker?: {
    position: [number, number];
    onDrag: (lat: number, lng: number) => void;
  };
  userLocation?: [number, number] | null;
}) {
  const resolvedCenter: [number, number] = center ?? DEFAULT_CENTER;

  return (
    <MapContainer
      center={resolvedCenter}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterView center={resolvedCenter} />
      <FocusOnTarget target={focusTarget} />
      {onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      {courts.map((court) => (
        <Marker
          key={court.id}
          position={[court.lat, court.lng]}
          icon={courtIcon}
          eventHandlers={{
            click: () => onSelectCourt?.(court),
          }}
        >
          <Popup>
            <strong>{court.name}</strong>
            <br />
            {court.city}
          </Popup>
        </Marker>
      ))}
      {draggableMarker && (
        <DraggablePin
          position={draggableMarker.position}
          onDrag={draggableMarker.onDrag}
        />
      )}
    </MapContainer>
  );
}

function DraggablePin({
  position,
  onDrag,
}: {
  position: [number, number];
  onDrag: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <Marker
      draggable
      position={position}
      icon={courtPinIcon}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (marker) {
            const { lat, lng } = marker.getLatLng();
            onDrag(lat, lng);
          }
        },
      }}
    />
  );
}
