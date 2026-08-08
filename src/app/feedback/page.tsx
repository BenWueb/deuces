import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Bug or Suggestion",
};

type PageProps = {
  searchParams: Promise<{ from?: string; type?: string }>;
};

export default async function FeedbackPage({ searchParams }: PageProps) {
  const session = await auth();
  const { from, type } = await searchParams;

  if (!session?.user) {
    const callback = type
      ? `/feedback?type=${encodeURIComponent(type)}`
      : "/feedback";
    redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }

  const initialType = type === "suggestion" ? "suggestion" : "bug";

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-0 md:py-8">
      <PageHeader
        title="Feedback"
        subtitle="Tell us what’s broken or what would make Deuces better."
      />
      <FeedbackForm
        defaultPageUrl={from ?? ""}
        defaultType={initialType}
      />
    </div>
  );
}
