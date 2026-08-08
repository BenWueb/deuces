import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AmenitiesGrid } from "@/components/courts/amenities-grid";
import { ContributeCourtInfoButton } from "@/components/courts/contribute-court-info";
import { DeleteCourtButton } from "@/components/courts/delete-court-button";
import { PhotoCarousel } from "@/components/courts/photo-carousel";
import {
  CommentsSection,
  RatingControl,
} from "@/components/courts/rating-comments";
import { PageHeader } from "@/components/layout/page-header";
import {
  missingContributableFields,
  needsInfo,
} from "@/lib/court-completeness";
import { getCourtBySlug, getUserRating } from "@/lib/queries/courts";
import { canEditCourt, getCurrentUser, isAdmin } from "@/lib/permissions";
import { googleMapsDirectionsUrl, surfaceLabel } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const court = await getCourtBySlug(slug);
    if (!court) return { title: "Court Not Found" };
    return {
      title: court.name,
      description: court.description ?? `Tennis courts in ${court.city}`,
    };
  } catch {
    return { title: "Court" };
  }
}

export default async function CourtDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  let court;
  try {
    court = await getCourtBySlug(slug);
  } catch {
    return (
      <div className="px-4 py-12 text-center md:py-20">
        <h1 className="font-display text-xl font-bold">
          Database not configured
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add DATABASE_URL to .env.local and run migrations.
        </p>
        <Link href="/" className="mt-4 inline-block text-court underline">
          Back to explore
        </Link>
      </div>
    );
  }

  if (!court) notFound();

  const userRating = session?.user?.id
    ? await getUserRating(court.id, session.user.id)
    : null;

  const currentUser = await getCurrentUser();
  const canEdit = await canEditCourt(court.id, currentUser);
  const admin = isAdmin(currentUser);
  const completeness = {
    description: court.description,
    surface: court.surface,
    courtCount: court.courtCount,
    hasLights: court.hasLights,
    isIndoor: court.isIndoor,
    isFree: court.isFree,
    hasHittingWall: court.hasHittingWall,
    hasRestrooms: court.hasRestrooms,
    photoCount: court.photos.length,
    importStatus: court.importStatus,
  };
  const incomplete = needsInfo(completeness);
  const canContributeFields =
    missingContributableFields(completeness).length > 0;

  const editHref = canEdit ? `/courts/${court.slug}/edit` : undefined;

  const courtSnapshot = { id: court.id, ...completeness };
  const contributeCta = canContributeFields ? (
    <ContributeCourtInfoButton
      signedIn={!!currentUser}
      court={courtSnapshot}
      variant="cta"
    />
  ) : null;

  const locationLine = `${court.address}, ${court.city}${
    court.region ? `, ${court.region}` : ""
  }`;

  return (
    <div className="px-4 pb-8 pt-4 md:px-0 md:pb-12 md:pt-8">
      <PageHeader
        eyebrow={surfaceLabel(court.surface)}
        title={court.name}
        subtitle={locationLine}
        className="mb-6 md:mb-10"
      />

      {(canEdit || admin) && (
        <div className="mb-6 flex flex-wrap items-start justify-center gap-2 md:mb-8">
          {canEdit && (
            <Link
              href={`/courts/${court.slug}/edit`}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-court"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit court
            </Link>
          )}
          {admin && (
            <DeleteCourtButton
              courtId={court.id}
              courtName={court.name}
              variant="inline"
            />
          )}
        </div>
      )}

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-8 lg:gap-12">
        <div className="-mx-4 md:mx-0 md:sticky md:top-24 md:self-start">
          <PhotoCarousel
            photos={court.photos}
            addPhotoHref={editHref}
            className="md:overflow-hidden md:rounded-2xl md:shadow-[0_12px_40px_rgba(21,32,51,0.1)]"
          />
        </div>

        <div className="space-y-6 pt-5 md:pt-0">
          {court.description?.trim() ? (
            <p className="text-sm leading-relaxed text-muted md:text-base">
              {court.description}
            </p>
          ) : canEdit || !currentUser ? (
            <Link
              href={
                canEdit
                  ? `/courts/${court.slug}/edit`
                  : `/login?callbackUrl=${encodeURIComponent(`/courts/${court.slug}/edit`)}`
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-transparent px-4 text-sm font-semibold text-muted transition-colors hover:border-court/40 hover:bg-court/5 hover:text-court md:max-w-sm"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Add a description
            </Link>
          ) : null}

          <a
            href={googleMapsDirectionsUrl(court.lat, court.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-court flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold md:max-w-sm"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            Directions in Google Maps
          </a>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold md:text-xl">
              Amenities
            </h2>
            <AmenitiesGrid court={court} />
          </section>

          {incomplete && canContributeFields && contributeCta}

          <RatingControl
            courtId={court.id}
            initialRating={userRating?.stars ?? null}
            ratingAvg={court.ratingAvg}
            ratingCount={court.ratingCount}
            isSignedIn={!!session?.user}
          />

          <CommentsSection
            courtId={court.id}
            comments={court.comments}
            isSignedIn={!!session?.user}
            currentUserId={currentUser?.id}
            isAdmin={currentUser?.role === "admin"}
          />
        </div>
      </div>
    </div>
  );
}
