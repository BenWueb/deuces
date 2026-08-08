import { z } from "zod";

/**
 * Field-level schemas shared by the browser and the server. Everything here is
 * safe to import from a Client Component; the profanity rules live in
 * `./server` so the word list never ships to the browser.
 */

export const SURFACES = ["hard", "clay", "grass", "carpet"] as const;
export type Surface = (typeof SURFACES)[number];

export const idSchema = z.uuid("That record could not be found.");

function requiredText(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
}

function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional();
}

export const latitudeSchema = z
  .number()
  .min(-90, "Latitude must be between -90 and 90.")
  .max(90, "Latitude must be between -90 and 90.");

export const longitudeSchema = z
  .number()
  .min(-180, "Longitude must be between -180 and 180.")
  .max(180, "Longitude must be between -180 and 180.");

// Uploads return an absolute Blob URL in production and a local path in dev.
export const photoUrlSchema = z
  .string()
  .refine(
    (value) => /^https?:\/\//.test(value) || value.startsWith("/uploads/"),
    "Photo must be an uploaded file or an absolute URL.",
  );

export const courtNameSchema = requiredText("Court name", 2, 120);
export const courtDescriptionSchema = optionalText("Description", 2000);
// Street text or a "lat, lng" pair — both are valid ways to place a court.
export const addressSchema = z
  .string()
  .trim()
  .min(3, "Enter a street address or GPS coordinates.")
  .max(300, "Address must be 300 characters or fewer.");
export const citySchema = z
  .string()
  .trim()
  .max(100, "City must be 100 characters or fewer.")
  .transform((value) => (value.length >= 2 ? value : "Unknown"));
export const regionSchema = optionalText("Region", 100);
export const feeNotesSchema = optionalText("Fee notes", 500);
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write something before posting.")
  .max(2000, "Comments must be 2000 characters or fewer.");
export const starsSchema = z
  .number()
  .int("Rating must be a whole number.")
  .min(1, "Rating must be between 1 and 5.")
  .max(5, "Rating must be between 1 and 5.");

const courtCountSchema = z
  .number()
  .int("Court count must be a whole number.")
  .min(1, "There must be at least 1 court.")
  .max(50, "That is more than 50 courts — please split them up.");

export const courtInputSchema = z.object({
  name: courtNameSchema,
  description: courtDescriptionSchema,
  address: addressSchema,
  city: citySchema,
  region: regionSchema,
  country: requiredText("Country", 2, 100).default("US"),
  lat: latitudeSchema,
  lng: longitudeSchema,
  surface: z.enum(SURFACES, "Choose a court surface."),
  courtCount: courtCountSchema,
  hasLights: z.boolean(),
  isIndoor: z.boolean(),
  isFree: z.boolean(),
  feeNotes: feeNotesSchema,
  hasHittingWall: z.boolean(),
  hasRestrooms: z.boolean(),
  photoUrls: z
    .array(photoUrlSchema)
    .max(10, "You can add up to 10 photos.")
    .default([]),
});

/** Edits may leave imported unknowns as null ("Not sure"). */
export const updateCourtInputSchema = courtInputSchema.extend({
  surface: z.enum(SURFACES, "Choose a court surface.").nullable(),
  courtCount: courtCountSchema.nullable(),
  hasLights: z.boolean().nullable(),
  isIndoor: z.boolean().nullable(),
  isFree: z.boolean().nullable(),
  hasHittingWall: z.boolean().nullable(),
  hasRestrooms: z.boolean().nullable(),
});

/** Community contributions — only unknown amenity/surface fields. */
export const contributeCourtInfoSchema = z
  .object({
    surface: z.enum(SURFACES).optional(),
    courtCount: courtCountSchema.optional(),
    hasLights: z.boolean().optional(),
    isIndoor: z.boolean().optional(),
    isFree: z.boolean().optional(),
    feeNotes: feeNotesSchema,
    hasHittingWall: z.boolean().optional(),
    hasRestrooms: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.surface !== undefined ||
      data.courtCount !== undefined ||
      data.hasLights !== undefined ||
      data.isIndoor !== undefined ||
      data.isFree !== undefined ||
      data.hasHittingWall !== undefined ||
      data.hasRestrooms !== undefined,
    { message: "Add at least one detail you know." },
  );

export type CourtInput = z.input<typeof courtInputSchema>;
export type UpdateCourtFormInput = z.input<typeof updateCourtInputSchema>;
export type ContributeCourtInfoInput = z.input<typeof contributeCourtInfoSchema>;

export const commentInputSchema = z.object({
  courtId: idSchema,
  body: commentBodySchema,
  parentId: idSchema.optional(),
});

export const ratingInputSchema = z.object({
  courtId: idSchema,
  stars: starsSchema,
});

export const FEEDBACK_TYPES = ["bug", "suggestion"] as const;
export type FeedbackTypeInput = (typeof FEEDBACK_TYPES)[number];

export const feedbackInputSchema = z.object({
  type: z.enum(FEEDBACK_TYPES, "Choose bug or suggestion."),
  title: requiredText("Title", 3, 120),
  body: requiredText("Details", 10, 4000),
  pageUrl: z
    .string()
    .trim()
    .max(500, "Page URL must be 500 characters or fewer.")
    .optional(),
});

export type FeedbackInput = z.input<typeof feedbackInputSchema>;

const youtubeHostPattern =
  /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/i;

export const youtubeUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid YouTube URL.")
  .max(500, "URL must be 500 characters or fewer.")
  .refine((value) => {
    try {
      return youtubeHostPattern.test(new URL(value).hostname);
    } catch {
      return false;
    }
  }, "Link must be a YouTube URL.");

export const learnResourceInputSchema = z.object({
  title: requiredText("Title", 2, 120),
  url: youtubeUrlSchema,
  description: optionalText("Description", 500),
});

export type LearnResourceInput = z.input<typeof learnResourceInputSchema>;

export const addressQuerySchema = z
  .string()
  .trim()
  .min(3, "Type at least 3 characters to search.")
  .max(200, "Search is limited to 200 characters.");

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number("Latitude must be a number.").pipe(latitudeSchema),
  lng: z.coerce.number("Longitude must be a number.").pipe(longitudeSchema),
  radius: z.coerce
    .number("Radius must be a number.")
    .int("Radius must be a whole number of metres.")
    .min(1, "Radius must be positive.")
    .max(200_000, "Radius must be 200km or less.")
    .default(25_000),
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const BOUNDS_MESSAGE =
  "Bounds must be four comma-separated numbers: west,south,east,north.";

const boundsCoordinateSchema = z.number(BOUNDS_MESSAGE);

export const boundsQuerySchema = z
  .string()
  .transform((value) => value.split(",").map((part) => Number(part.trim())))
  .pipe(
    z.tuple(
      [
        boundsCoordinateSchema,
        boundsCoordinateSchema,
        boundsCoordinateSchema,
        boundsCoordinateSchema,
      ],
      BOUNDS_MESSAGE,
    ),
  )
  // A zoomed-out map reports longitudes past the antimeridian, so clamp to the
  // valid envelope rather than rejecting a legitimate viewport.
  .transform(([west, south, east, north]) => ({
    west: clamp(west, -180, 180),
    south: clamp(south, -90, 90),
    east: clamp(east, -180, 180),
    north: clamp(north, -90, 90),
  }));

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export const uploadFileSchema = z
  .file("Choose an image to upload.")
  .min(1, "That file is empty.")
  .max(MAX_UPLOAD_BYTES, "Each photo must be under 5MB.")
  .mime(
    Object.keys(IMAGE_EXTENSIONS),
    "Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.",
  );

export type FieldErrors = Record<string, string>;

export type ValidationFailure = {
  error: string;
  fieldErrors: FieldErrors;
};

/** What every Server Action in this app resolves to. */
export type ActionResult =
  | { success: true }
  | { error: string; fieldErrors?: FieldErrors };

/**
 * Collapses a ZodError into one message per field plus a headline message, so
 * a form can highlight individual inputs and an inline banner can summarise.
 */
export function toValidationFailure(error: z.ZodError): ValidationFailure {
  const flattened = z.flattenError(error);
  const fieldErrors: FieldErrors = {};

  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    const message = (messages as string[] | undefined)?.[0];
    if (message) fieldErrors[field] = message;
  }

  return {
    error:
      flattened.formErrors[0] ??
      Object.values(fieldErrors)[0] ??
      "Please check the highlighted fields.",
    fieldErrors,
  };
}
