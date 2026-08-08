import { notFound, redirect } from "next/navigation";
import { CourtForm } from "@/components/courts/court-form";
import { DeleteCourtButton } from "@/components/courts/delete-court-button";
import { PageHeader } from "@/components/layout/page-header";
import { getCourtBySlug } from "@/lib/queries/courts";
import { canEditCourt, getCurrentUser, isAdmin } from "@/lib/permissions";

export const metadata = {
  title: "Edit Court",
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ imported?: string }>;
};

export default async function EditCourtPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { imported } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=/courts/${slug}/edit`);
  }

  const court = await getCourtBySlug(slug);
  if (!court) notFound();

  if (!(await canEditCourt(court.id, user))) {
    redirect(`/courts/${slug}`);
  }

  const isOwner = court.createdBy === user.id;
  const admin = isAdmin(user);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-0 md:py-8">
      <PageHeader
        eyebrow={isOwner ? "Your court" : admin ? "Admin edit" : "Edit court"}
        title={`Edit ${court.name}`}
        subtitle="Update details, amenities, and photos."
      />

      <CourtForm
        imported={imported === "1"}
        court={{
          id: court.id,
          slug: court.slug,
          name: court.name,
          description: court.description,
          address: court.address,
          city: court.city,
          region: court.region,
          country: court.country,
          lat: court.lat,
          lng: court.lng,
          surface: court.surface,
          courtCount: court.courtCount,
          hasLights: court.hasLights,
          isIndoor: court.isIndoor,
          isFree: court.isFree,
          feeNotes: court.feeNotes,
          hasHittingWall: court.hasHittingWall,
          hasRestrooms: court.hasRestrooms,
          importStatus: court.importStatus,
          photoUrls: court.photos.map((p) => p.url),
        }}
      />

      <div className="pb-8">
        <DeleteCourtButton courtId={court.id} courtName={court.name} />
      </div>
    </div>
  );
}
