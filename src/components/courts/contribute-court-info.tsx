"use client";

import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { contributeCourtInfo } from "@/lib/actions/courts";
import {
  missingContributableFields,
  type CompletenessInput,
  type ContributableField,
} from "@/lib/court-completeness";
import { cn } from "@/lib/utils";
import {
  contributeCourtInfoSchema,
  SURFACES,
  toValidationFailure,
  type ContributeCourtInfoInput,
  type FieldErrors,
  type Surface,
} from "@/lib/validation/schemas";

type CourtSnapshot = CompletenessInput & {
  id: string;
};

const BOOL_FIELDS: {
  key: Extract<
    ContributableField,
    "hasLights" | "isIndoor" | "isFree" | "hasHittingWall" | "hasRestrooms"
  >;
  label: string;
}[] = [
  { key: "hasLights", label: "Lights" },
  { key: "isIndoor", label: "Indoor" },
  { key: "isFree", label: "Free to play" },
  { key: "hasHittingWall", label: "Hitting wall" },
  { key: "hasRestrooms", label: "Restrooms" },
];

export function ContributeCourtInfoButton({
  court,
  signedIn,
  className,
  label = "Know these details?",
  variant = "button",
}: {
  court: CourtSnapshot;
  signedIn: boolean;
  className?: string;
  label?: string;
  variant?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const missing = missingContributableFields(court);

  if (missing.length === 0) return null;

  const buttonClass =
    variant === "button"
      ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-court/25 bg-court/5 px-4 text-sm font-semibold text-court transition-colors hover:bg-court/10"
      : "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-court underline";

  if (!signedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`}
        className={cn(buttonClass, className)}
      >
        {variant === "button" && <InfoPlusIcon className="h-4 w-4" />}
        Sign in to add this info
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonClass, className)}
      >
        {variant === "button" && <InfoPlusIcon className="h-4 w-4" />}
        {label}
      </button>
      {open && (
        <ContributeCourtInfoDialog
          court={court}
          missing={missing}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function InfoPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ContributeCourtInfoDialog({
  court,
  missing,
  onClose,
}: {
  court: CourtSnapshot;
  missing: ContributableField[];
  onClose: () => void;
}) {
  const titleId = useId();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);

  const [surface, setSurface] = useState<Surface | "">("");
  const [courtCount, setCourtCount] = useState("");
  const [booleans, setBooleans] = useState<
    Partial<Record<(typeof BOOL_FIELDS)[number]["key"], boolean | "">>
  >({});
  const [feeNotes, setFeeNotes] = useState("");

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: ContributeCourtInfoInput = {};
    if (missing.includes("surface") && surface) {
      payload.surface = surface;
    }
    if (missing.includes("courtCount") && courtCount.trim()) {
      payload.courtCount = Number(courtCount);
    }
    for (const { key } of BOOL_FIELDS) {
      if (missing.includes(key) && typeof booleans[key] === "boolean") {
        payload[key] = booleans[key];
      }
    }
    if (payload.isFree === false && feeNotes.trim()) {
      payload.feeNotes = feeNotes.trim();
    }

    const parsed = contributeCourtInfoSchema.safeParse(payload);
    if (!parsed.success) {
      const failure = toValidationFailure(parsed.error);
      setError(failure.error);
      setFieldErrors(failure.fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await contributeCourtInfo(court.id, parsed.data);
      if (result && "error" in result) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSent(true);
      router.refresh();
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-night/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[min(90dvh,720px)] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-white shadow-[0_20px_50px_rgba(21,32,51,0.18)]"
      >
        <div className="relative overflow-hidden px-5 pb-4 pt-6 md:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-court/15"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-court">
                Community tip
              </p>
              <h2
                id={titleId}
                className="font-display mt-1 text-2xl font-bold text-foreground"
              >
                {sent ? "Thanks — saved" : "Add missing info"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {sent
                  ? "Those details were added for everyone."
                  : "Only unknown fields are shown. Name, address, and photos stay as they are."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-6 md:px-6">
          {sent ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-court flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-bold"
            >
              Done
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {missing.includes("surface") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="contribute-surface">
                    Surface
                  </label>
                  <select
                    id="contribute-surface"
                    value={surface}
                    onChange={(e) =>
                      setSurface(e.target.value as Surface | "")
                    }
                    className={inputClass}
                  >
                    <option value="">Skip for now</option>
                    {SURFACES.map((value) => (
                      <option key={value} value={value}>
                        {value[0]!.toUpperCase() + value.slice(1)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.surface && (
                    <p className="mt-1.5 text-sm text-clay">{fieldErrors.surface}</p>
                  )}
                </div>
              )}

              {missing.includes("courtCount") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="contribute-count">
                    Number of courts
                  </label>
                  <input
                    id="contribute-count"
                    type="number"
                    min={1}
                    max={50}
                    value={courtCount}
                    onChange={(e) => setCourtCount(e.target.value)}
                    placeholder="Skip for now"
                    className={inputClass}
                  />
                  {fieldErrors.courtCount && (
                    <p className="mt-1.5 text-sm text-clay">
                      {fieldErrors.courtCount}
                    </p>
                  )}
                </div>
              )}

              {BOOL_FIELDS.filter(({ key }) => missing.includes(key)).map(
                ({ key, label }) => (
                  <div key={key}>
                    <p className="mb-2 text-sm font-semibold">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["yes", true],
                          ["no", false],
                          ["skip", ""],
                        ] as const
                      ).map(([optionLabel, value]) => {
                        const selected = booleans[key] === value;
                        return (
                          <button
                            key={optionLabel}
                            type="button"
                            onClick={() =>
                              setBooleans((prev) => ({ ...prev, [key]: value }))
                            }
                            className={cn(
                              "min-h-10 rounded-xl border text-sm font-semibold capitalize transition-colors",
                              selected
                                ? "border-court/40 bg-court/10 text-court"
                                : "border-border text-muted hover:text-foreground",
                            )}
                          >
                            {optionLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}

              {missing.includes("isFree") && booleans.isFree === false && (
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="contribute-fee">
                    Fee notes <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="contribute-fee"
                    value={feeNotes}
                    onChange={(e) => setFeeNotes(e.target.value)}
                    placeholder="e.g. $10 / hour"
                    className={inputClass}
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-clay">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-optic flex min-h-12 flex-1 items-center justify-center rounded-2xl text-sm font-bold disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save details"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-border text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none ring-court/30 focus:ring-2";
