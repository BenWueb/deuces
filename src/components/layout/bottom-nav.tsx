"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const baseTabs: {
  href: string;
  label: string;
  icon: ({ className }: { className?: string }) => React.JSX.Element;
}[] = [
  { href: "/", label: "Explore", icon: ExploreIcon },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/learn", label: "Learn", icon: LearnIcon },
];

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const tabs = signedIn
    ? [...baseTabs, { href: "/profile", label: "Profile", icon: ProfileIcon }]
    : [
        ...baseTabs,
        {
          href: `/login?callbackUrl=${encodeURIComponent(pathname || "/")}`,
          label: "Sign in",
          icon: ProfileIcon,
        },
      ];

  return (
    <>
      <Link
        href={signedIn ? "/courts/new" : `/login?callbackUrl=${encodeURIComponent("/courts/new")}`}
        aria-label="Add court"
        className={cn(
          "btn-optic fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full md:hidden",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
          pathname.startsWith("/courts/new") && "pointer-events-none opacity-50",
        )}
      >
        <AddIcon className="h-7 w-7" />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-gradient-to-t from-white via-white/95 to-white/80 shadow-[0_-10px_30px_rgba(21,32,51,0.06)] backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {tabs.map((tab) => {
            const active =
              tab.href === "/"
                ? pathname === "/"
                : tab.href.startsWith("/login")
                  ? pathname.startsWith("/login")
                  : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition-colors",
                  active ? "text-court" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function ExploreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18 4 20V6l5-2 6 2 5-2v14l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function LearnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function AddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
