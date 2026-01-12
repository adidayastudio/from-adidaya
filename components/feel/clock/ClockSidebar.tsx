"use client";

import { Clock, CalendarDays, Hourglass, CheckSquare, LayoutDashboard, UserX, Briefcase } from "lucide-react";
import clsx from "clsx";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";
import useUserProfile from "@/hooks/useUserProfile";

export type ClockSection = "overview" | "timesheets" | "leaves" | "overtime" | "business-trip" | "approvals";

interface FabAction {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  highlight?: boolean;
}

interface ClockSidebarProps {
  activeSection: ClockSection;
  onSectionChange: (section: ClockSection) => void;
  role?: UserRole;
  fabAction?: FabAction;
}

const NAV_ITEMS = [
  { id: "overview" as ClockSection, label: "Overview", icon: LayoutDashboard },
  { id: "timesheets" as ClockSection, label: "Timesheets", icon: CalendarDays },
  { id: "leaves" as ClockSection, label: "Leave", icon: UserX },
  { id: "overtime" as ClockSection, label: "Overtime", icon: Hourglass },
  { id: "business-trip" as ClockSection, label: "Business Trip", icon: Briefcase },
  { id: "approvals" as ClockSection, label: "Approvals", icon: CheckSquare, adminOnly: true },
];

export default function ClockSidebar({ activeSection, onSectionChange, role, fabAction }: ClockSidebarProps) {
  const { profile } = useUserProfile();
  const isManager = canViewTeamData(role || profile?.role);
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isManager);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          <div className="space-y-1">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  activeSection === item.id
                    ? "text-action-primary bg-bg-soft"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className={clsx("transition-colors", activeSection === item.id ? "text-action-primary" : "text-neutral-400")}>
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION - iOS Style */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-3 py-2 flex justify-between items-center">
          {visibleItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "relative flex items-center justify-center transition-all duration-200 rounded-full",
                  isActive
                    ? "bg-blue-100 p-2.5"
                    : "p-2.5"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-blue-600" : "text-neutral-400"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </button>
            );
          })}
        </div>

        {/* FAB - Integrated in Bottom Bar Layout (Separate Circle) */}
        {fabAction && (
          <button
            onClick={fabAction.onClick}
            className={clsx(
              "w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 flex-shrink-0",
              fabAction.highlight ? "bg-red-500 text-white" : "bg-action-primary text-white"
            )}
          >
            {fabAction.icon}
          </button>
        )}
      </div>
    </>
  );
}
