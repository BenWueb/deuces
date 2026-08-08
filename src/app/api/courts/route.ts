import { NextResponse } from "next/server";
import {
  getCourtsInBounds,
  getCourtsNearby,
  getAllCourts,
} from "@/lib/queries/courts";
import {
  boundsQuerySchema,
  nearbyQuerySchema,
  toValidationFailure,
} from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const bounds = searchParams.get("bounds");

    if (lat !== null || lng !== null) {
      const parsed = nearbyQuerySchema.safeParse({
        lat,
        lng,
        radius: searchParams.get("radius") ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(toValidationFailure(parsed.error), {
          status: 400,
        });
      }

      const courts = await getCourtsNearby(
        parsed.data.lat,
        parsed.data.lng,
        parsed.data.radius,
      );
      return NextResponse.json(courts);
    }

    if (bounds !== null) {
      const parsed = boundsQuerySchema.safeParse(bounds);

      if (!parsed.success) {
        return NextResponse.json(toValidationFailure(parsed.error), {
          status: 400,
        });
      }

      const { west, south, east, north } = parsed.data;
      const courts = await getCourtsInBounds(west, south, east, north);
      return NextResponse.json(courts);
    }

    return NextResponse.json(await getAllCourts());
  } catch (error) {
    // Logged in full because the driver message carries the real cause (e.g. a
    // PostGIS SRID clash) that we do not want to echo back to the browser.
    console.error("GET /api/courts failed", error);

    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error: message.includes("DATABASE_URL")
          ? message
          : "Failed to load courts.",
      },
      { status: 500 },
    );
  }
}
