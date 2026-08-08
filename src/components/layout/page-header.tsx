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
        "mb-6 mt-6 md:mb-12 md:mt-16 lg:mt-20",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "mb-1.5 text-xs font-medium uppercase tracking-widest text-clay md:mb-2 md:text-sm",
            align === "center" && "mx-auto",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-3xl font-bold tracking-tight text-court sm:text-5xl md:text-6xl lg:text-7xl">
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "mt-2 max-w-xl text-sm font-medium text-muted sm:text-base md:mt-4 md:text-lg lg:text-xl",
            align === "center" && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      )}
      {actions && (
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center gap-3 md:mt-6",
            align === "center" && "justify-center",
          )}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
