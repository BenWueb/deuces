"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { BuyMeACoffeeButton } from "@/components/support/buy-me-a-coffee";
import { cn } from "@/lib/utils";
import { DeucesLogo } from "./deuces-logo";

const links = [
  { href: "/", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/learn", label: "Learn" },
];

export function AppHeader({
  signedIn,
  userImage,
  userName,
}: {
  signedIn: boolean;
  userImage?: string | null;
  userName?: string | null;
}) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const profileActive = pathname.startsWith("/profile");

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-gradient-to-b from-white/95 to-white/75 shadow-[0_8px_24px_rgba(21,32,51,0.05)] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,transparent_0%,var(--optic-yellow)_12%,var(--optic-yellow)_88%,transparent_100%)]"
      />

      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-4 px-4 md:grid md:h-16 md:max-w-5xl md:grid-cols-[1fr_auto_1fr] md:px-6 lg:max-w-7xl lg:px-8">
        <DeucesLogo size="sm" />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-court/10 text-court"
                    : "text-muted hover:bg-court/5 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5 md:gap-2">
          <BuyMeACoffeeButton variant="icon" />
          <FeedbackButton signedIn={signedIn} variant="icon" />

          {signedIn ? (
            <Link
              href="/courts/new"
              className="btn-optic hidden min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold md:inline-flex"
            >
              <AddIcon className="h-4 w-4" />
              Add a court
            </Link>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`}
              className="btn-court inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold md:px-5"
            >
              Sign in
            </Link>
          )}

          {signedIn && (
            <Link
              href="/profile"
              aria-label="Profile"
              title="Profile"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border transition-[box-shadow,transform] active:scale-95 md:h-10 md:w-10",
                profileActive
                  ? "border-court ring-2 ring-court/25"
                  : "border-border hover:border-court/40",
              )}
            >
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName ?? "Profile"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-court/10 text-sm font-bold text-court">
                  {(userName ?? "U")[0]?.toUpperCase()}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function AddIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
