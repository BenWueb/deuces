"use client";

import { cn } from "@/lib/utils";

type TennisBallRatingProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
};

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function TennisBallRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: TennisBallRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              sizes[size],
              interactive && "cursor-pointer transition-transform hover:scale-110",
              !interactive && "cursor-default",
            )}
            aria-label={`${i + 1} of ${max}`}
          >
            <TennisBall filled={filled} />
          </button>
        );
      })}
    </div>
  );
}

function TennisBall({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={filled ? "#d4f542" : "none"}
        stroke={filled ? "#a8c828" : "currentColor"}
        strokeWidth="1.5"
        className={filled ? "" : "text-muted/40"}
      />
      {filled && (
        <>
          <path
            d="M6 8c3 2 9 2 12 0"
            fill="none"
            stroke="#a8c828"
            strokeWidth="1.2"
          />
          <path
            d="M6 16c3-2 9-2 12 0"
            fill="none"
            stroke="#a8c828"
            strokeWidth="1.2"
          />
        </>
      )}
    </svg>
  );
}
