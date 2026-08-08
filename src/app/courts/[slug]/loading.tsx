import { CourtCardSkeleton } from "@/components/courts/court-card";

export default function CourtLoading() {
  return (
    <div>
      <div className="aspect-[4/3] skeleton" />
      <div className="space-y-4 px-4 pt-5">
        <div className="h-6 w-3/4 skeleton rounded" />
        <div className="h-4 w-1/2 skeleton rounded" />
        <div className="h-12 skeleton rounded-2xl" />
        <CourtCardSkeleton />
      </div>
    </div>
  );
}
