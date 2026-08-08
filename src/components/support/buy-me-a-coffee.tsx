"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const TIP_OPTIONS = [
  { id: "coffee", label: "Coffee", amount: "$3", cups: 1 },
  { id: "double", label: "Double", amount: "$5", cups: 2 },
  { id: "match", label: "Match set", amount: "$10", cups: 3 },
] as const;

type TipId = (typeof TIP_OPTIONS)[number]["id"];

/** Flip to true when ready to show tip buttons again. */
const SHOW_BUY_ME_A_COFFEE = false;

export function BuyMeACoffeeButton({
  variant = "button",
  className,
}: {
  variant?: "button" | "icon" | "card";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!SHOW_BUY_ME_A_COFFEE) return null;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buy me a coffee"
          title="Buy me a coffee"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#b45309_0%,#d97706_50%,#f59e0b_100%)] text-white shadow-[0_2px_4px_rgba(180,83,9,0.25),0_6px_16px_rgba(217,119,6,0.4)] transition-[opacity,box-shadow,transform] hover:opacity-95 hover:shadow-[0_3px_6px_rgba(180,83,9,0.3),0_10px_22px_rgba(217,119,6,0.45)] active:scale-95",
            className,
          )}
        >
          <CoffeeIcon className="h-4 w-4" />
        </button>
      ) : variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group flex w-full items-start gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 text-left transition-colors hover:border-amber-300 hover:from-amber-50 hover:to-orange-50",
            className,
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 transition-transform group-hover:scale-105">
            <CoffeeIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-base font-bold text-foreground">
              Buy me a coffee
            </span>
            <span className="mt-0.5 block text-sm text-muted">
              Fuel court updates and keep Deuces free to use.
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 md:min-h-12",
            className,
          )}
        >
          <CoffeeIcon className="h-4 w-4" />
          Buy me a coffee
        </button>
      )}

      {open && <BuyMeACoffeeDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function BuyMeACoffeeDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [tip, setTip] = useState<TipId>("coffee");
  const [mounted, setMounted] = useState(false);

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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-white shadow-[0_20px_50px_rgba(21,32,51,0.18)]"
      >
        <div className="relative overflow-hidden px-5 pb-4 pt-6 md:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-100/80"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-16 h-28 w-28 rounded-full bg-orange-100/50"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-800/80">
                Support Deuces
              </p>
              <h2
                id={titleId}
                className="font-display mt-1 text-2xl font-bold text-foreground"
              >
                Buy me a coffee
              </h2>
              <p className="mt-2 text-sm text-muted">
                Tips help cover hosting and keep court discovery free. 
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

        <div className="space-y-4 px-5 pb-6 md:px-6">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Choose a tip</legend>
            <div className="grid grid-cols-3 gap-2">
              {TIP_OPTIONS.map((option) => {
                const selected = tip === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTip(option.id)}
                    className={cn(
                      "rounded-2xl border px-2 py-3 text-center transition-colors",
                      selected
                        ? "border-amber-400 bg-amber-50 text-amber-950"
                        : "border-border bg-chalk/60 text-muted hover:border-amber-200 hover:text-foreground",
                    )}
                  >
                    <span className="flex justify-center gap-0.5 text-amber-700">
                      {Array.from({ length: option.cups }).map((_, i) => (
                        <CoffeeIcon key={i} className="h-3.5 w-3.5" />
                      ))}
                    </span>
                    <span className="mt-1.5 block text-xs font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block font-display text-base font-bold">
                      {option.amount}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="button"
            disabled
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-800/90 text-sm font-bold text-white opacity-70"
          >
            <CoffeeIcon className="h-4 w-4" />
            Checkout coming soon
          </button>

          <p className="text-center text-xs text-muted">
            No payment is taken yet. Thanks for the support anyway.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CoffeeIcon({ className }: { className?: string }) {
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
      <path d="M17 8h1a3 3 0 1 1 0 6h-1" />
      <path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
      <path d="M6 2v2M10 2v2M14 2v2" />
    </svg>
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
