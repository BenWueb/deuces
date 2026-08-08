import { CourtCardSkeleton } from "@/components/courts/court-card";

export default function Loading() {
  return (
    <div className="px-4 pt-4">
      <div className="mb-6">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="mt-2 h-8 w-48 skeleton rounded" />
      </div>
      <div className="h-12 skeleton rounded-2xl" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CourtCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
