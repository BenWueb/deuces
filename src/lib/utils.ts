import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

const COORD_PAIR =
  /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Parses "lat, lng" text into a coordinate pair, or null if invalid. */
export function parseCoords(value: string): [number, number] | null {
  const match = value.trim().match(COORD_PAIR);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

export function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE;

  // Rounding a walkable distance to "0.1 mi" hides just how close it is.
  if (miles < 0.1) {
    const feet = Math.round((meters * FEET_PER_METER) / 10) * 10;
    return `${feet} ft`;
  }

  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function surfaceLabel(surface: string | null | undefined): string {
  if (!surface) return "Unknown";
  const labels: Record<string, string> = {
    hard: "Hard",
    clay: "Clay",
    grass: "Grass",
    carpet: "Carpet",
  };
  return labels[surface] ?? surface;
}
