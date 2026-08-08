import { redirect } from "next/navigation";
import { ImportCourts } from "@/components/courts/import-courts";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser, isAdmin } from "@/lib/permissions";

export const metadata = {
  title: "Import Courts",
};

export default async function ImportCourtPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/courts/import");
  }
  if (!isAdmin(user)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-0 md:py-8">
      <PageHeader
        title="Import courts"
        subtitle="Find tennis courts on Google Maps nearby or by name, then import drafts in bulk."
      />
      <ImportCourts />
    </div>
  );
}
