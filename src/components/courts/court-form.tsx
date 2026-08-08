"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createCourt, updateCourt } from "@/lib/actions/courts";
import { TennisBallRating } from "@/components/ui/tennis-ball-rating";
import { searchAddress, type GeocodeResult } from "@/lib/geocode";
import { DEFAULT_CENTER, useUserLocation } from "@/lib/hooks/use-user-location";
import { cn, formatCoords, parseCoords } from "@/lib/utils";
import {
  missingCourtFields,
  fieldLabel,
} from "@/lib/court-completeness";
import {
  createCourtInputSchema,
  updateCourtInputSchema,
  toValidationFailure,
  type FieldErrors,
  type Surface,
} from "@/lib/validation/schemas";

const LocationPicker = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-64 skeleton rounded-2xl" /> },
);

type AmenityKey =
  | "hasLights"
  | "isIndoor"
  | "isFree"
  | "hasHittingWall"
  | "hasRestrooms";

export type CourtFormInitial = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  region: string | null;
  country: string;
  lat: number;
  lng: number;
  surface: Surface | null;
  courtCount: number | null;
  hasLights: boolean | null;
  isIndoor: boolean | null;
  isFree: boolean | null;
  feeNotes: string | null;
  hasHittingWall: boolean | null;
  hasRestrooms: boolean | null;
  importStatus?: "draft" | "complete";
  photoUrls: string[];
};

export function CourtForm({
  court,
  imported = false,
}: {
  court?: CourtFormInitial;
  imported?: boolean;
}) {
  const isEditing = !!court;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(court?.photoUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [stars, setStars] = useState(0);
  const { location, status: locationStatus, request: requestLocation } =
    useUserLocation();

  // An existing court already has a real pin, so a late GPS fix must not move it.
  const [pinTouched, setPinTouched] = useState(isEditing);
  const [pendingLocation, setPendingLocation] = useState(false);
  const [addressTouched, setAddressTouched] = useState(isEditing);
  const defaultedAddress = useRef(false);

  const [form, setForm] = useState({
    name: court?.name ?? "",
    description: court?.description ?? "",
    address: court?.address ?? "",
    city: court?.city ?? "",
    region: court?.region ?? "",
    country: court?.country ?? "US",
    lat: court?.lat ?? DEFAULT_CENTER[0],
    lng: court?.lng ?? DEFAULT_CENTER[1],
    surface: (court?.surface ?? (isEditing ? null : "hard")) as Surface | null,
    courtCount: court?.courtCount ?? (isEditing ? null : 2),
    hasLights: court?.hasLights ?? (isEditing ? null : false),
    isIndoor: court?.isIndoor ?? (isEditing ? null : false),
    isFree: court?.isFree ?? (isEditing ? null : true),
    feeNotes: court?.feeNotes ?? "",
    hasHittingWall: court?.hasHittingWall ?? (isEditing ? null : false),
    hasRestrooms: court?.hasRestrooms ?? (isEditing ? null : false),
  });

  const missing = missingCourtFields({
    description: form.description,
    surface: form.surface,
    courtCount: form.courtCount,
    hasLights: form.hasLights,
    isIndoor: form.isIndoor,
    isFree: form.isFree,
    hasHittingWall: form.hasHittingWall,
    hasRestrooms: form.hasRestrooms,
    photoCount: photoUrls.length,
    importStatus: court?.importStatus,
  });

  useEffect(() => {
    if (pendingLocation && locationStatus === "denied") {
      setPendingLocation(false);
      setError("Location permission denied.");
      return;
    }
    if (!location) return;
    if (pendingLocation) {
      setPendingLocation(false);
      applyGps(location[0], location[1]);
      return;
    }
    if (pinTouched && addressTouched) return;
    if (!isEditing && !defaultedAddress.current && !addressTouched) {
      applyGps(location[0], location[1]);
      return;
    }
    if (!pinTouched) {
      setForm((f) => ({ ...f, lat: location[0], lng: location[1] }));
    }
  }, [
    location,
    pinTouched,
    pendingLocation,
    locationStatus,
    isEditing,
    addressTouched,
  ]);

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function handleAddressSearch(query: string) {
    setAddressTouched(true);
    setAddressQuery(query);
    setField("address", query);

    const coords = parseCoords(query);
    if (coords) {
      setPinTouched(true);
      setForm((f) => ({
        ...f,
        address: formatCoords(coords[0], coords[1]),
        lat: coords[0],
        lng: coords[1],
      }));
      setSuggestions([]);
      return;
    }

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const results = await searchAddress(query);
    setSuggestions(results);
    setSearching(false);
  }

  function selectAddress(result: GeocodeResult) {
    setPinTouched(true);
    setAddressTouched(true);
    setForm((f) => ({
      ...f,
      address: result.displayName,
      city: result.city,
      region: result.region ?? "",
      country: result.country,
      lat: result.lat,
      lng: result.lng,
    }));
    setAddressQuery(result.displayName);
    setSuggestions([]);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.address;
      delete next.city;
      return next;
    });
  }

  function applyGps(lat: number, lng: number) {
    const coords = formatCoords(lat, lng);
    defaultedAddress.current = true;
    setPinTouched(true);
    setForm((f) => ({
      ...f,
      address: coords,
      lat,
      lng,
    }));
    setAddressQuery(coords);
  }

  function handleUseMyLocation() {
    setError(null);
    setAddressTouched(false);
    defaultedAddress.current = false;
    if (location) {
      applyGps(location[0], location[1]);
      return;
    }
    setPendingLocation(true);
    requestLocation();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    setError(null);

    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) {
          throw new Error(`“${file.name}” is over 4MB. Choose a smaller photo.`);
        }

        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const raw = await res.text();
        let data: { url?: string; error?: string } = {};
        try {
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch {
          throw new Error(
            res.status === 413 || /entity too large/i.test(raw)
              ? "That photo is too large. Use an image under 4MB."
              : "Upload failed. Try a smaller JPEG or PNG.",
          );
        }
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        if (!data.url) throw new Error("Upload failed — no photo URL returned.");
        urls.push(data.url);
      }
      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      ...form,
      description: form.description || undefined,
      region: form.region || undefined,
      feeNotes: form.feeNotes || undefined,
      photoUrls,
    };

    // Catches shape and length problems without a round trip. The server
    // re-runs this plus the profanity rules, which only it can enforce.
    if (court) {
      const parsed = updateCourtInputSchema.safeParse(payload);
      if (!parsed.success) {
        const failure = toValidationFailure(parsed.error);
        setError(failure.error);
        setFieldErrors(failure.fieldErrors);
        return;
      }
      startTransition(async () => {
        const result = await updateCourt(court.id, parsed.data);
        if ("error" in result) {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
        }
      });
      return;
    }

    const parsed = createCourtInputSchema.safeParse({ ...payload, stars });
    if (!parsed.success) {
      const failure = toValidationFailure(parsed.error);
      setError(failure.error);
      setFieldErrors(failure.fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await createCourt(parsed.data);
      if ("error" in result) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      {(imported || (isEditing && missing.length > 0)) && (
        <div className="rounded-2xl border border-court/25 bg-court/5 p-4 text-sm">
          <p className="font-semibold text-foreground">
            {imported
              ? "Imported — help complete this court"
              : "Some details are still unknown"}
          </p>
          <p className="mt-1 text-muted">
            Fill in what you know. Unknown fields can stay as “Not sure”.
          </p>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Still needed: {missing.map(fieldLabel).join(", ")}
            </p>
          )}
        </div>
      )}

      <Field label="Court name" required error={fieldErrors.name}>
        <input
          required
          maxLength={120}
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          className={cn(inputClass, fieldErrors.name && invalidInputClass)}
          placeholder="Central Park Tennis Center"
        />
      </Field>

      <Field
        label="Description"
        error={fieldErrors.description}
        hint={`${form.description.length}/2000`}
      >
        <textarea
          maxLength={2000}
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          className={cn(
            inputClass,
            "min-h-24",
            fieldErrors.description && invalidInputClass,
          )}
          placeholder="Public hard courts, first-come first-served..."
        />
      </Field>

      <Field
        label="Address"
        required
        error={fieldErrors.address}
      >
        <input
          required
          maxLength={300}
          value={addressQuery || form.address}
          onChange={(e) => handleAddressSearch(e.target.value)}
          className={cn(inputClass, fieldErrors.address && invalidInputClass)}
          placeholder="Street address or lat, lng"
        />
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={
            pendingLocation ||
            locationStatus === "loading" ||
            locationStatus === "unsupported"
          }
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-court/20 bg-court/5 px-4 text-sm font-semibold text-court disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
          {pendingLocation || locationStatus === "loading"
            ? "Getting location..."
            : locationStatus === "unsupported"
              ? "Location unavailable"
              : "Use my location"}
        </button>
        {searching && <p className="mt-1 text-xs text-muted">Searching...</p>}
        {suggestions.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
            {suggestions.map((s) => (
              <li key={`${s.lat}-${s.lng}`}>
                <button
                  type="button"
                  onClick={() => selectAddress(s)}
                  className="min-h-11 w-full px-4 py-2 text-left text-sm hover:bg-court/5"
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Pin location">
        <p className="mb-2 text-xs text-muted">
          Drag the pin to the exact court location
        </p>
        <LocationPicker
          lat={form.lat}
          lng={form.lng}
          userLocation={location}
          onChange={(lat, lng) => {
            setPinTouched(true);
            setForm({ ...form, lat, lng });
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Surface" error={fieldErrors.surface}>
          <select
            value={form.surface ?? ""}
            onChange={(e) =>
              setField(
                "surface",
                e.target.value === ""
                  ? null
                  : (e.target.value as Surface),
              )
            }
            className={cn(inputClass, fieldErrors.surface && invalidInputClass)}
          >
            {isEditing && <option value="">Not sure</option>}
            <option value="hard">Hard</option>
            <option value="clay">Clay</option>
            <option value="grass">Grass</option>
            <option value="carpet">Carpet</option>
          </select>
        </Field>
        <Field label="Court count" error={fieldErrors.courtCount}>
          <input
            type="number"
            min={1}
            max={50}
            value={form.courtCount ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                setField("courtCount", isEditing ? null : 1);
                return;
              }
              setField("courtCount", parseInt(raw, 10) || 1);
            }}
            placeholder={isEditing ? "Not sure" : undefined}
            className={cn(
              inputClass,
              fieldErrors.courtCount && invalidInputClass,
            )}
          />
        </Field>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ["hasLights", "Lights"],
              ["isIndoor", "Indoor"],
              ["isFree", "Free to play"],
              ["hasHittingWall", "Hitting wall"],
              ["hasRestrooms", "Restrooms"],
            ] as const satisfies ReadonlyArray<readonly [AmenityKey, string]>
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <select
                value={
                  form[key] === null ? "" : form[key] ? "yes" : "no"
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setField(
                    key,
                    v === "" ? null : v === "yes",
                  );
                }}
                className={inputClass}
              >
                <option value="">Not sure</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["hasLights", "Lights"],
              ["isIndoor", "Indoor"],
              ["isFree", "Free to play"],
              ["hasHittingWall", "Hitting wall"],
              ["hasRestrooms", "Restrooms"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm"
            >
              <input
                type="checkbox"
                checked={!!form[key]}
                onChange={(e) => setField(key, e.target.checked)}
                className="h-4 w-4 accent-court"
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {form.isFree === false && (
        <Field label="Fee notes" error={fieldErrors.feeNotes}>
          <input
            maxLength={500}
            value={form.feeNotes}
            onChange={(e) => setField("feeNotes", e.target.value)}
            className={cn(inputClass, fieldErrors.feeNotes && invalidInputClass)}
            placeholder="$15/hour, membership required..."
          />
        </Field>
      )}

      <Field
        label="Photos"
        error={fieldErrors.photoUrls}
        hint={
          photoUrls.length === 0 && isEditing
            ? "Add a photo if you can"
            : undefined
        }
      >
        {photoUrls.length === 0 && isEditing && (
          <p className="mb-2 text-xs text-muted">No photos yet.</p>
        )}
        {photoUrls.length > 0 && (
          <ul className="mb-3 space-y-2">
            {photoUrls.map((url, index) => (
              <li
                key={url}
                className="flex items-center gap-3 rounded-xl border border-border p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="h-12 w-16 rounded-lg object-cover"
                />
                <span className="flex-1 truncate text-xs text-muted">
                  Photo {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPhotoUrls((prev) => prev.filter((u) => u !== url))
                  }
                  className="min-h-11 rounded-lg px-3 text-xs font-semibold text-clay"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="mt-1 text-xs text-muted">Uploading...</p>}
      </Field>

      {!isEditing && (
        <Field
          label="Your rating"
          required
          error={fieldErrors.stars}
          hint="Required when adding a court"
        >
          <TennisBallRating
            value={stars}
            size="lg"
            interactive={!pending}
            onChange={(value) => {
              setStars(value);
              setFieldErrors((prev) => {
                const { stars: _stars, ...rest } = prev;
                return rest;
              });
            }}
          />
        </Field>
      )}

      {error && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-optic flex min-h-12 w-full items-center justify-center rounded-2xl font-display text-lg font-bold disabled:opacity-50"
        >
          {pending
            ? isEditing
              ? "Saving..."
              : "Adding court..."
            : isEditing
              ? "Save changes"
              : "Add court"}
        </button>

        {isEditing && (
          <Link
            href={`/courts/${court.slug}`}
            className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-border text-sm font-medium text-muted hover:text-foreground"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="block text-sm font-semibold">
          {label}
          {required && <span className="text-clay"> *</span>}
        </label>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-clay">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-court/30 focus:ring-2";

const invalidInputClass = "border-clay ring-clay/30";
