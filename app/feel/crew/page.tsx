"use client";

import { useState } from "react";
import CrewSidebar, { CrewSection } from "@/components/feel/crew/CrewSidebar";
import { CrewDirectory } from "@/components/feel/crew/CrewDirectory";
import { CrewAssignments } from "@/components/feel/crew/CrewAssignments";
import { CrewDailyInput } from "@/components/feel/crew/CrewDailyInput";
import { CrewPayroll } from "@/components/feel/crew/CrewPayroll";
import { CrewPerformance } from "@/components/feel/crew/CrewPerformance";
import { CrewRequests } from "@/components/feel/crew/CrewRequests";
import { CrewDetail } from "@/components/feel/crew/CrewDetail";
import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Plus } from "lucide-react";

export default function CrewPage() {
  const [activeSection, setActiveSection] = useState<CrewSection>("directory");
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const userRole = "admin";

  // Global drawer triggers from FAB
  const [triggerAddCrew, setTriggerAddCrew] = useState(0);
  const [triggerNewAssignment, setTriggerNewAssignment] = useState(0);
  const [triggerAddRequest, setTriggerAddRequest] = useState(0);

  const renderSection = () => {
    switch (activeSection) {
      case "directory":
        if (selectedCrewId) {
          // Pass crewId, component will fetch data from database
          return <CrewDetail crewId={selectedCrewId} onBack={() => setSelectedCrewId(null)} />;
        }
        return <CrewDirectory role={userRole} triggerOpen={triggerAddCrew} onViewDetail={setSelectedCrewId} />;
      case "assignments": return <CrewAssignments role={userRole} triggerOpen={triggerNewAssignment} />;
      case "daily-input": return <CrewDailyInput role={userRole} />;
      case "payroll": return <CrewPayroll role={userRole} />;
      case "performance": return <CrewPerformance role={userRole} />;
      case "requests": return <CrewRequests role={userRole} triggerOpen={triggerAddRequest} />;
      default: return <CrewDirectory role={userRole} />;
    }
  };

  const getBreadcrumbLabel = () => {
    switch (activeSection) {
      case "directory": return selectedCrewId ? "Crew Detail" : "Directory";
      case "assignments": return "Assignments";
      case "daily-input": return "Daily Log";
      case "payroll": return "Payroll";
      case "performance": return "Performance";
      case "requests": return "Requests";
      default: return "Directory";
    }
  };

  // FAB config per section
  const getFabConfig = () => {
    if (selectedCrewId) return null; // No FAB in detail view

    switch (activeSection) {
      case "directory":
        return { icon: <Plus className="w-6 h-6" />, onClick: () => setTriggerAddCrew(t => t + 1), title: "Add Crew" };
      case "assignments":
        return { icon: <Plus className="w-6 h-6" />, onClick: () => setTriggerNewAssignment(t => t + 1), title: "New Assignment" };
      case "requests":
        return { icon: <Plus className="w-6 h-6" />, onClick: () => setTriggerAddRequest(t => t + 1), title: "Add Request" };
      default:
        return null; // No FAB for daily-input, payroll, performance
    }
  };

  const fab = getFabConfig();

  return (
    <div className="min-h-screen bg-neutral-50 p-6 relative">
      <Breadcrumb items={[{ label: "Feel" }, { label: "Crew" }, { label: getBreadcrumbLabel() }]} />

      <PageWrapper sidebar={
        <CrewSidebar
          activeSection={activeSection}
          onSectionChange={(s) => {
            setActiveSection(s);
            setSelectedCrewId(null);
            setTriggerAddCrew(0);
            setTriggerNewAssignment(0);
            setTriggerAddRequest(0);
          }}
          role={userRole}
          fabAction={fab ? { icon: fab.icon, onClick: fab.onClick, title: fab.title } : undefined}
        />
      }>
        <div className="flex flex-col h-full pb-28 lg:pb-0">{renderSection()}</div>
      </PageWrapper>
    </div>
  );
}
