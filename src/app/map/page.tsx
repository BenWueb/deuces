import { MapView } from "@/components/map/map-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Map",
};

export default function MapPage() {
  return (
    <div className="-mb-20 md:mb-0 md:pt-8">
      <PageHeader
        title="Map"
        subtitle="See courts near you"
        className="mb-6 hidden md:mb-8 md:block"
      />
      <div
        className={
          "fixed inset-x-0 top-14 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-0 overflow-hidden " +
          "md:static md:inset-auto md:left-1/2 md:top-auto md:bottom-auto md:z-auto " +
          "md:h-auto md:w-screen md:-translate-x-1/2"
        }
      >
        <MapView />
      </div>
    </div>
  );
}
