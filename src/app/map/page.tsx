import { MapView } from "@/components/map/map-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Map",
};

export default function MapPage() {
  return (
    <div className="px-4 pt-4 md:px-0 md:pt-8">
      <PageHeader
        title="Map"
        subtitle="See courts near you"
        className="mb-6 md:mb-8"
      />
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden md:rounded-none">
        <MapView />
      </div>
    </div>
  );
}
