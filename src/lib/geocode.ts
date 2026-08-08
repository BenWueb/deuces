export type GeocodeResult = {
  displayName: string;
  lat: number;
  lng: number;
  city: string;
  region: string | null;
  country: string;
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    limit: "5",
  });

  const res = await fetch(`https://photon.komoot.io/api/?${params}`);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        name?: string;
        housenumber?: string;
        street?: string;
        city?: string;
        locality?: string;
        district?: string;
        state?: string;
        country?: string;
      };
    }>;
  };

  return (data.features ?? [])
    .map((feature) => {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      const props = feature.properties;
      if (lat === undefined || lng === undefined || !props) return null;

      const street = [props.housenumber, props.street ?? props.name]
        .filter(Boolean)
        .join(" ");
      const city = props.city ?? props.locality ?? props.district ?? "Unknown";

      return {
        displayName: [street || props.name, city, props.state]
          .filter(Boolean)
          .join(", "),
        lat,
        lng,
        city,
        region: props.state ?? null,
        country: props.country ?? "US",
      } satisfies GeocodeResult;
    })
    .filter((item): item is GeocodeResult => item !== null);
}
