import MyProjectsCard from "./MyProjectsCard";
import MyKpiCard from "./MyKpiCard";

export default function DashboardRowOne() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MyProjectsCard />
      <MyKpiCard />
    </div>
  );
}
