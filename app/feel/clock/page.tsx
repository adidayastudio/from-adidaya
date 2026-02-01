"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ClockPageWrapper from "@/components/feel/clock/ClockPageWrapper";
import ClockSidebar, { ClockSection } from "@/components/feel/clock/ClockSidebar";
import { ClockOverview } from "@/components/feel/clock/ClockOverview";
import { ClockTimesheets } from "@/components/feel/clock/ClockTimesheets";
import { ClockLeaveRequests } from "@/components/feel/clock/ClockLeaveRequests";
import { ClockOvertime } from "@/components/feel/clock/ClockOvertime";
import { ClockApprovals } from "@/components/feel/clock/ClockApprovals";
import { ClockBusinessTrips } from "@/components/feel/clock/ClockBusinessTrips";
import { ClockViewToggle } from "@/components/feel/clock/ClockViewToggle";
import { ClockProvider, useClockContext } from "@/components/feel/clock/ClockContext";

import useUserProfile from "@/hooks/useUserProfile";
import { ClockLeaveRequestDrawer } from "@/components/feel/clock/ClockLeaveRequestDrawer";
import { ClockOvertimeLogDrawer } from "@/components/feel/clock/ClockOvertimeLogDrawer";
import { ClockBusinessTripDrawer } from "@/components/feel/clock/ClockBusinessTripDrawer";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import { Play, Square, Plus, Clock as ClockIcon } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { useClock } from "@/hooks/useClock";
import { useClockData } from "@/hooks/useClockData";
import { LeaveRequest, OvertimeLog, BusinessTrip } from "@/lib/api/clock";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

const VALID_SECTIONS: ClockSection[] = ["overview", "timesheets", "leaves", "overtime", "business-trip", "approvals"];

function ClockPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial section from URL or default to "overview"
  const sectionFromUrl = searchParams.get("section") as ClockSection | null;
  const currentSection: ClockSection = sectionFromUrl && VALID_SECTIONS.includes(sectionFromUrl) ? sectionFromUrl : "overview";

  const { profile, loading } = useUserProfile();

  const { isCheckedIn, elapsed, toggleClock, startTime } = useClock();

  // Fetch attendance data for calculating overtime start time
  const { attendance } = useClockData(profile?.id, false);

  // -- GLOBAL DRAWER STATE --
  const [isLeaveDrawerOpen, setIsLeaveDrawerOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | undefined>(undefined);

  const [isOvertimeDrawerOpen, setIsOvertimeDrawerOpen] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState<OvertimeLog | undefined>(undefined);

  const [isBusinessTripDrawerOpen, setIsBusinessTripDrawerOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<BusinessTrip | undefined>(undefined);

  const [isReadOnly, setIsReadOnly] = useState(false);

  // View state from context
  const { viewMode, setViewMode } = useClockContext();

  const [showOvertimeAlert, setShowOvertimeAlert] = useState(false);
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);

  // -- FAB ACTION LISTENER --
  useEffect(() => {
    const handleFabAction = (e: any) => {
      const { id } = e.detail;
      switch (id) {
        case 'CLOCK':
          setIsClockModalOpen(true);
          break;
        case 'CLOCK_NEW_LEAVE':
          handleNewLeave();
          break;
        case 'CLOCK_LOG_OVERTIME':
          handleNewOvertime();
          break;
        case 'CLOCK_NEW_TRIP':
          handleNewTrip();
          break;
      }
    };

    window.addEventListener('fab-action' as any, handleFabAction);
    return () => window.removeEventListener('fab-action' as any, handleFabAction);
  }, [isCheckedIn, currentSection]); // Re-bind if dependencies change if necessary, though handlers are stable-ish

  // -- HANDLERS --
  const handleNewLeave = () => {
    setSelectedLeave(undefined);
    setIsReadOnly(false);
    setIsLeaveDrawerOpen(true);
  };

  const handleEditLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setIsReadOnly(false);
    setIsLeaveDrawerOpen(true);
  };

  const handleViewLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setIsReadOnly(true);
    setIsLeaveDrawerOpen(true);
  };

  const handleCloseLeaveDrawer = () => {
    setIsLeaveDrawerOpen(false);
    setTimeout(() => {
      setSelectedLeave(undefined);
      setIsReadOnly(false);
    }, 300);
  };

  // Same for Overtime and Trip...
  const handleNewOvertime = () => {
    setSelectedOvertime(undefined);
    setIsReadOnly(false);
    setIsOvertimeDrawerOpen(true);
  };

  const handleEditOvertime = (ot: OvertimeLog) => {
    setSelectedOvertime(ot);
    setIsReadOnly(false);
    setIsOvertimeDrawerOpen(true);
  };

  const handleViewOvertime = (ot: OvertimeLog) => {
    setSelectedOvertime(ot);
    setIsReadOnly(true);
    setIsOvertimeDrawerOpen(true);
  };

  const handleCloseOvertimeDrawer = () => {
    setIsOvertimeDrawerOpen(false);
    setTimeout(() => {
      setSelectedOvertime(undefined);
      setIsReadOnly(false);
    }, 300);
  };

  const handleNewTrip = () => {
    setSelectedTrip(undefined);
    setIsReadOnly(false);
    setIsBusinessTripDrawerOpen(true);
  };

  const handleEditTrip = (trip: BusinessTrip) => {
    setSelectedTrip(trip);
    setIsReadOnly(false);
    setIsBusinessTripDrawerOpen(true);
  };

  const handleViewTrip = (trip: BusinessTrip) => {
    setSelectedTrip(trip);
    setIsReadOnly(true);
    setIsBusinessTripDrawerOpen(true);
  };

  const handleCloseTripDrawer = () => {
    setIsBusinessTripDrawerOpen(false);
    setTimeout(() => {
      setSelectedTrip(undefined);
      setIsReadOnly(false);
    }, 300);
  };

  // -- FAB LOGIC --
  const getFabConfig = () => {
    switch (currentSection) {
      case "overview":
      case "timesheets":
        return {
          icon: isCheckedIn ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />,
          label: isCheckedIn ? "Clock Out" : "Clock In",
          onClick: () => setIsClockModalOpen(true),
          variant: isCheckedIn ? "danger" as const : "primary" as const
        };
      case "leaves":
        return {
          icon: <Plus className="w-6 h-6" />,
          label: "New Request",
          onClick: handleNewLeave,
          variant: "primary" as const
        };
      case "overtime":
        return {
          icon: <Plus className="w-6 h-6" />,
          label: "Log Overtime",
          onClick: handleNewOvertime,
          variant: "primary" as const
        };
      case "business-trip":
        return {
          icon: <Plus className="w-6 h-6" />,
          label: "New Trip",
          onClick: handleNewTrip,
          variant: "primary" as const
        };
      case "approvals":
      default:
        return null; // No FAB
    }
  };

  const fab = getFabConfig();

  const getBreadcrumbLabel = () => {
    switch (currentSection) {
      case "overview": return "Overview";
      case "timesheets": return "Timesheets";
      case "leaves": return "Leave Requests";
      case "overtime": return "Overtime";
      case "business-trip": return "Business Trip";
      case "approvals": return "Approvals";
      default: return "Overview";
    }
  };

  const header = (
    <PageHeader
      title={
        currentSection === "timesheets" ? "Timesheets" :
          currentSection === "leaves" ? "Leave Requests" :
            currentSection === "overtime" ? "Overtime" :
              currentSection === "business-trip" ? "Business Trips" :
                currentSection === "approvals" ? "Approvals" :
                  currentSection === "overview" && isCheckedIn ? "Currently Clocked In" :
                    "Attendance & Time"
      }
      description={
        currentSection === "timesheets" ? "Daily entry logs and attendance records." :
          currentSection === "leaves" ? "Manage vacation, sick leave, and permissions." :
            currentSection === "overtime" ? "Validation and tracking of extra hours." :
              currentSection === "business-trip" ? "Manage business travel requests." :
                currentSection === "approvals" ? "Review and manage team requests." :
                  "Track work hours, leaves, and business trips."
      }
      actions={
        currentSection !== "approvals" && (
          <ClockViewToggle />
        )
      }
    />
  );

  if (loading) return null;

  return (
    <>


      {/* GLOBAL DRAWERS & ALERTS */}
      <ClockLeaveRequestDrawer
        open={isLeaveDrawerOpen}
        onClose={handleCloseLeaveDrawer}
        editData={selectedLeave}
        readOnly={isReadOnly}
      />
      <ClockOvertimeLogDrawer
        open={isOvertimeDrawerOpen}
        onClose={handleCloseOvertimeDrawer}
        editData={selectedOvertime}
        readOnly={isReadOnly}
        attendanceClockIn={selectedOvertime ? attendance.find(a => a.userId === selectedOvertime.userId && a.date === selectedOvertime.date)?.clockIn ?? undefined : undefined}
      />
      <ClockBusinessTripDrawer
        open={isBusinessTripDrawerOpen}
        onClose={handleCloseTripDrawer}
        editData={selectedTrip}
        readOnly={isReadOnly}
      />

      {/* GLOBAL OVERTIME ALERT POPUP */}
      {showOvertimeAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 mx-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center animate-bounce"><ClockIcon className="w-8 h-8" /></div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Still working?</h3>
              <p className="text-neutral-500 mt-2">You&apos;ve already clocked overtime today. Please remember to take a rest!</p>
            </div>
            <div className="pt-2">
              <Button onClick={() => setShowOvertimeAlert(false)} className="w-full justify-center !bg-neutral-900 !text-white hover:!bg-neutral-800">I'm still working</Button>
              <button onClick={() => { setShowOvertimeAlert(false); toggleClock(); }} className="w-full mt-3 text-sm text-red-600 font-medium hover:underline">Clock Out Now</button>
            </div>
          </div>
        </div>
      )}

      <ClockPageWrapper
        breadcrumbItems={[
          { label: "Feel" },
          { label: "Clock" },
          { label: getBreadcrumbLabel() },
        ]}
        header={header}
        activeSection={currentSection}
        onSectionChange={(section) => {
          // Update URL
          const params = new URLSearchParams(searchParams.toString());
          params.set("section", section);
          router.push(`?${params.toString()}`, { scroll: false });
        }}
        role={profile?.role}
        fabAction={fab ? {
          icon: fab.icon,
          onClick: fab.onClick,
          title: fab.label,
          highlight: fab.variant === "danger"
        } : undefined}
      >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 lg:pb-0 space-y-8">
          {/* Added Check: pb-24 for mobile FAB space */}

          {currentSection === "overview" && (
            <ClockOverview
              userName={profile?.name || "User"}
              role={profile?.role}
              joinDate={profile?.joinDate}
              // Pass Clock State
              isCheckedIn={isCheckedIn}
              startTime={startTime}
              elapsed={elapsed}
              onClockAction={() => setIsClockModalOpen(true)}
              viewMode={viewMode}
            />
          )}
          {currentSection === "timesheets" && (
            <ClockTimesheets
              role={profile?.role}
              userName={profile?.name}
              viewMode={viewMode}
            />
          )}
          {currentSection === "leaves" && (
            <ClockLeaveRequests
              role={profile?.role}
              userName={profile?.name}
              viewMode={viewMode}
              onNewRequest={handleNewLeave}
              onEditRequest={handleEditLeave}
              onViewRequest={handleViewLeave}
            />
          )}
          {currentSection === "overtime" && (
            <ClockOvertime
              role={profile?.role}
              userName={profile?.name}
              viewMode={viewMode}
              onLogOvertime={handleNewOvertime}
              onEditLog={handleEditOvertime}
              onViewLog={handleViewOvertime}
            />
          )}
          {currentSection === "business-trip" && (
            <ClockBusinessTrips
              role={profile?.role}
              userName={profile?.name}
              viewMode={viewMode}
              onNewTrip={handleNewTrip}
              onEditTrip={handleEditTrip}
              onViewTrip={handleViewTrip}
            />
          )}

          {currentSection === "approvals" && (
            <ClockApprovals role={profile?.role} />
          )}
        </div>
      </ClockPageWrapper>

      <ClockActionModal
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        type={isCheckedIn ? "OUT" : "IN"}
        userRole={profile?.role || "staff"}
        onConfirm={toggleClock}
      />
    </>
  );
}

export default function ClockPage() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <ClockPageContent />
    </Suspense>
  );
}
