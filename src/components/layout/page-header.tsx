import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
  align = "center",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <header
      className={cn(
        "mb-8 mt-12 md:mb-12 md:mt-16 lg:mt-20",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "mb-2 text-sm font-medium uppercase tracking-widest text-clay",
            align === "center" && "mx-auto",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-5xl font-bold tracking-tight text-court sm:text-6xl md:text-7xl">
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "mt-3 max-w-xl text-base font-medium text-muted sm:text-lg md:mt-4 md:text-xl",
            align === "center" && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      )}
      {actions && (
        <div
          className={cn(
            "mt-5 flex flex-wrap items-center gap-3 md:mt-6",
            align === "center" && "justify-center",
          )}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
