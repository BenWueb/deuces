import Link from "next/link";

export default function CourtNotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl font-bold text-court">404</h1>
      <p className="mt-2 text-muted">This court could not be found.</p>
      <Link
        href="/"
        className="btn-optic mt-6 flex min-h-11 items-center rounded-2xl px-8 font-semibold"
      >
        Back to explore
      </Link>
    </div>
  );
}
