import Link from "next/link";
import { cn } from "@/lib/utils";

type DeucesLogoProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  asLink?: boolean;
};

const sizes = {
  sm: { mark: "h-9 w-9", word: "text-xl", tag: "text-[10px]" },
  md: { mark: "h-10 w-10", word: "text-2xl", tag: "text-xs" },
  lg: { mark: "h-14 w-14", word: "text-3xl", tag: "text-sm" },
};

export function DeucesLogo({
  size = "md",
  showTagline = false,
  className,
  asLink = true,
}: DeucesLogoProps) {
  const s = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("relative shrink-0", s.mark)} aria-hidden>
        <TennisBallMark className="h-full w-full" />
      </span>
      <div className="leading-none">
        <span
          className={cn(
            "font-display font-bold tracking-tight text-court",
            s.word,
          )}
        >
          Deuces
        </span>
        {showTagline && (
          <p
            className={cn(
              "mt-1 font-medium uppercase tracking-[0.18em] text-clay",
              s.tag,
            )}
          >
            Tennis courts
          </p>
        )}
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        className="inline-flex rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-court/40"
      >
        {content}
      </Link>
    );
  }

  return content;
}

function TennisBallMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="15" fill="#d4f542" />
      <circle
        cx="16"
        cy="16"
        r="14.25"
        stroke="#2f6fed"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M4.6 8.2 Q9.8 16 4.6 23.8"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M27.4 8.2 Q22.2 16 27.4 23.8"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
