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
      <aside className="w-full hidden lg:flex flex-col">
        <div className="space-y-0 pt-0">
          <div className="space-y-0.5">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                  activeSection === item.id
                    ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                )}
              >
                <item.icon className={clsx("w-4 h-4 shrink-0 transition-colors", activeSection === item.id ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

    </>
  );
}
