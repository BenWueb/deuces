import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CourtForm } from "@/components/courts/court-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Add Court",
};

export default async function NewCourtPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/courts/new");
  }

  const isAdmin = session.user.role === "admin";

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-0 md:py-8">
      <PageHeader
        title="Add a court"
        subtitle={
          isAdmin
            ? "Share a place to play — or import one from Google Maps."
            : "Share a place to play with other Deuces players."
        }
      />
      {isAdmin && (
        <Link
          href="/courts/import"
          className="mb-6 flex min-h-11 items-center justify-center rounded-2xl border border-court/25 bg-court/5 px-4 text-sm font-semibold text-court md:mb-8 md:inline-flex md:min-h-12 md:px-6"
        >
          Import from Google Maps
        </Link>
      )}
      <CourtForm />
    </div>
  );
}
