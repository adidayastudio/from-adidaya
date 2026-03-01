"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import CrewPageWrapper from "@/components/feel/crew/CrewPageWrapper";
import CrewSidebar, { CrewSection } from "@/components/feel/crew/CrewSidebar";
import { CrewDirectory } from "@/components/feel/crew/CrewDirectory";
import { CrewAssignments } from "@/components/feel/crew/CrewAssignments";
import { CrewDailyInput } from "@/components/feel/crew/CrewDailyInput";
import { CrewPayroll } from "@/components/feel/crew/CrewPayroll";
import { CrewPerformance } from "@/components/feel/crew/CrewPerformance";
import { CrewRequests } from "@/components/feel/crew/CrewRequests";
import { CrewDetail } from "@/components/feel/crew/CrewDetail";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Plus } from "lucide-react";

export default function CrewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const activeSection: CrewSection = (tabParam as CrewSection) || "directory";

  // Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedRole, setSelectedRole] = useState(searchParams.get("role") || "all");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "all");
  const [view, setView] = useState(searchParams.get("view") || "list");

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) params.set("search", searchQuery); else params.delete("search");
    if (selectedRole !== "all") params.set("role", selectedRole); else params.delete("role");
    if (selectedStatus !== "all") params.set("status", selectedStatus); else params.delete("status");
    if (view !== "list") params.set("view", view); else params.delete("view");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, selectedRole, selectedStatus, view]);

  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const userRole = "admin";

  // Global drawer triggers from FAB
  const [triggerAddCrew, setTriggerAddCrew] = useState(0);
  const [triggerNewAssignment, setTriggerNewAssignment] = useState(0);
  const [triggerAddRequest, setTriggerAddRequest] = useState(0);

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

  const header = (
    <div className="hidden lg:block">
      <PageHeader
        title={
          activeSection === "assignments" ? "Project Assignment" :
            activeSection === "daily-input" ? "Daily Log" :
              activeSection === "payroll" ? "Payroll" :
                activeSection === "performance" ? "Performance & KPI" :
                  activeSection === "requests" ? "Requests" :
                    activeSection === "directory" && selectedCrewId ? "Crew Detail" :
                      "Crew Directory"
        }
        description={
          activeSection === "assignments" ? "History of crew assignments to projects." :
            activeSection === "daily-input" ? "Input daily attendance and overtime." :
              activeSection === "payroll" ? "Calculated from daily logs." :
                activeSection === "performance" ? "Weighted Score: 50% Attendance • 25% Overtime • 25% Rating" :
                  activeSection === "requests" ? "Leave, Cash Advance, and Reimbursement." :
                    activeSection === "directory" && selectedCrewId ? "View and edit crew details." :
                      "Manage field workers."
        }
        actions={
          fab && (
            <Button
              variant="primary"
              icon={fab.icon}
              onClick={fab.onClick}
            >
              {fab.title}
            </Button>
          )
        }
      />
    </div>
  );

  // Listen for FAB actions from MobileBottomBar
  useEffect(() => {
    const handleFabAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = customEvent.detail?.id;

      if (id === 'CREW_ADD') setTriggerAddCrew(t => t + 1);
      if (id === 'CREW_ASSIGNMENT_NEW') setTriggerNewAssignment(t => t + 1);
      if (id === 'CREW_REQUEST_NEW') setTriggerAddRequest(t => t + 1);
    };

    window.addEventListener('fab-action', handleFabAction);
    return () => window.removeEventListener('fab-action', handleFabAction);
  }, []);

  return (
    <>
      <CrewPageWrapper
        breadcrumbItems={[
          { label: "Feel" },
          { label: "Crew" },
          { label: getBreadcrumbLabel() },
        ]}
        header={header}
        activeSection={activeSection}
        onSectionChange={(section) => {
          // Update URL
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", section);
          router.push(`?${params.toString()}`, { scroll: false });
          // Reset other states
          setSelectedCrewId(null);
          setTriggerAddCrew(0);
          setTriggerNewAssignment(0);
          setTriggerAddRequest(0);
        }}
        role={userRole}
        fabAction={fab ? {
          icon: fab.icon,
          onClick: fab.onClick,
          title: fab.title,
        } : undefined}
        view={view as any}
        onChangeView={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      >
        <div className="flex flex-col h-full animate-in fade-in duration-500 pb-24 lg:pb-0">
          {activeSection === "directory" && (
            selectedCrewId ? (
              <CrewDetail crewId={selectedCrewId} onBack={() => setSelectedCrewId(null)} />
            ) : (
              <CrewDirectory role={userRole} triggerOpen={triggerAddCrew} onViewDetail={setSelectedCrewId} />
            )
          )}
          {activeSection === "assignments" && (
            <CrewAssignments role={userRole} triggerOpen={triggerNewAssignment} />
          )}
          {activeSection === "daily-input" && (
            <CrewDailyInput role={userRole} />
          )}
          {activeSection === "payroll" && (
            <CrewPayroll role={userRole} />
          )}
          {activeSection === "performance" && (
            <CrewPerformance role={userRole} />
          )}
          {activeSection === "requests" && (
            <CrewRequests role={userRole} triggerOpen={triggerAddRequest} />
          )}
        </div>
      </CrewPageWrapper>
    </>
  );
}
