import type { Surface } from "@/lib/validation/schemas";

export type ImportCandidate = {
  sourceId: string;
  sourceUrl: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  region: string | null;
  country: string;
  surface: Surface | null;
  courtCount: number | null;
  hasLights: boolean | null;
  isIndoor: boolean | null;
  isFree: boolean | null;
  feeNotes: string | null;
  hasHittingWall: boolean | null;
  hasRestrooms: boolean | null;
  /** Display thumbnail URL (may be a short-lived Google CDN URI). */
  photoUrl: string | null;
  /** Places photo resource name for durable download on import. */
  photoName?: string | null;
  distanceMeters?: number;
  alreadyImported?: boolean;
};
