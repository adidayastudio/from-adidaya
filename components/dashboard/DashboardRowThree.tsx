import RecentUpdatesCard from "./RecentUpdatesCard";
import UpcomingEventsCard from "./UpcomingEventsCard";

export default function DashboardRowThree() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RecentUpdatesCard />
      <UpcomingEventsCard />
    </div>
  );
}
