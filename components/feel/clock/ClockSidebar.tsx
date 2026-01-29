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

    </>
  );
}
