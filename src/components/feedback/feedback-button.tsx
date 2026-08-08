"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { BugIcon } from "@/components/feedback/feedback-icons";
import { cn } from "@/lib/utils";

export function FeedbackButton({
  signedIn,
  variant = "icon",
  className,
}: {
  signedIn: boolean;
  variant?: "icon" | "row";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Submit a bug or suggestion"
          title="Submit a bug or suggestion"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2f6fed_0%,#4b84f2_55%,#6aa0ff_100%)] text-white shadow-[0_2px_4px_rgba(47,111,237,0.25),0_6px_16px_rgba(47,111,237,0.4)] transition-[opacity,box-shadow,transform] hover:opacity-95 hover:shadow-[0_3px_6px_rgba(47,111,237,0.3),0_10px_22px_rgba(47,111,237,0.45)] active:scale-95",
            className,
          )}
        >
          <BugIcon className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex min-h-11 w-full items-center justify-center rounded-2xl border border-border text-sm font-semibold text-foreground md:min-h-12",
            className,
          )}
        >
          Submit a bug or suggestion
        </button>
      )}

      {open && (
        <FeedbackDialog
          signedIn={signedIn}
          pathname={pathname || "/"}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FeedbackDialog({
  signedIn,
  pathname,
  onClose,
}: {
  signedIn: boolean;
  pathname: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [sent, setSent] = useState(false);

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
        className="relative z-10 max-h-[min(90dvh,720px)] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-3xl border border-border bg-white shadow-[0_20px_50px_rgba(21,32,51,0.18)]"
      >
        <div className="relative overflow-hidden px-5 pb-4 pt-6 md:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-court/15"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-16 h-28 w-28 rounded-full bg-red-100/60"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-court">
                Feedback
              </p>
              <h2
                id={titleId}
                className="font-display mt-1 text-2xl font-bold text-foreground"
              >
                {sent ? "Thanks — got it" : "Bug or suggestion"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {sent
                  ? "Your submission was sent to the Deuces admin inbox."
                  : "Tell us what’s broken or what would make Deuces better."}
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="btn-court flex min-h-11 flex-1 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
              >
                Submit another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-border px-5 text-sm font-semibold text-court"
              >
                Close
              </button>
            </div>
          ) : !signedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Sign in to send a bug report or suggestion.
              </p>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
                className="btn-court flex min-h-12 items-center justify-center rounded-2xl text-sm font-bold"
                onClick={onClose}
              >
                Sign in to continue
              </Link>
            </div>
          ) : (
            <FeedbackForm
              compact
              idPrefix="feedback-modal"
              defaultPageUrl={pathname}
              onSuccess={() => setSent(true)}
            />
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
