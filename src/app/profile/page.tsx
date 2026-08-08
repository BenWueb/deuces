import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { AdminFeedbackList } from "@/components/feedback/admin-feedback-list";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { DeucesLogo } from "@/components/layout/deuces-logo";
import { PageHeader } from "@/components/layout/page-header";
import { BuyMeACoffeeButton } from "@/components/support/buy-me-a-coffee";
import { getAllFeedback } from "@/lib/queries/feedback";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-md flex-col items-center justify-center px-6 text-center md:min-h-[calc(100dvh-6rem)] md:py-16">
        <DeucesLogo
          size="lg"
          showTagline
          asLink={false}
          className="mb-6 flex-col items-center"
        />
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          Your profile
        </h1>
        <p className="mt-2 text-muted md:text-lg">
          Sign in to manage your courts and ratings.
        </p>
        <Link
          href="/login"
          className="btn-court mt-6 flex min-h-11 items-center rounded-2xl px-8 text-sm font-semibold md:min-h-12 md:px-10"
        >
          Sign in
        </Link>
        <div className="mt-4 w-full max-w-sm">
          <BuyMeACoffeeButton variant="card" />
        </div>
      </div>
    );
  }

  const isAdmin = session.user.role === "admin";
  let submissions: Awaited<ReturnType<typeof getAllFeedback>> = [];
  if (isAdmin) {
    try {
      submissions = await getAllFeedback();
    } catch {
      submissions = [];
    }
  }

  return (
    <div
      className={
        isAdmin
          ? "mx-auto max-w-3xl px-4 py-4 md:px-0 md:py-8"
          : "mx-auto max-w-xl px-4 py-4 md:px-0 md:py-8"
      }
    >
      <PageHeader
        title="Profile"
        subtitle="Your account and court contributions"
      />

      <div className="court-card flex items-center gap-4 p-4 md:gap-5 md:p-6">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "Profile"}
            width={64}
            height={64}
            className="rounded-full md:h-16 md:w-16"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-court/10 font-display text-xl font-bold text-court md:h-16 md:w-16 md:text-2xl">
            {(session.user.name ?? session.user.email ?? "U")[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold md:text-lg">
              {session.user.name ?? "Player"}
            </p>
            {isAdmin && (
              <span className="rounded-full bg-optic px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night">
                Admin
              </span>
            )}
          </div>
          <p className="text-sm text-muted">{session.user.email}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3 md:mt-8">
        <Link
          href="/courts/new"
          className="btn-optic flex min-h-11 items-center justify-center rounded-2xl font-semibold md:min-h-12"
        >
          Add a court
        </Link>
        {isAdmin && (
          <Link
            href="/courts/import"
            className="flex min-h-11 items-center justify-center rounded-2xl border border-court/25 bg-court/5 text-sm font-semibold text-court md:min-h-12"
          >
            Import from Google Maps
          </Link>
        )}
        <BuyMeACoffeeButton variant="card" />

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:border-red-300 hover:bg-red-100 md:min-h-12"
          >
            Sign out
          </button>
        </form>
      </div>

      {isAdmin && <AdminFeedbackList items={submissions} />}

      <div className="mt-6 md:mt-8">
        <FeedbackButton signedIn variant="row" />
      </div>
    </div>
  );
}
