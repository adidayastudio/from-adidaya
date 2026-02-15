import { useState } from "react";
import clsx from "clsx";
import { Sparkles, Users, Briefcase, User, BarChart, LayoutDashboard, Target, Settings, BookOpen, Heart } from "lucide-react";
import useUserProfile from "@/hooks/useUserProfile";

/* ======================
   TYPES
====================== */

export type PeopleSection =
  | "overview"
  | "directory"
  | "performance"
  | "analytics"
  | "setup"
  | "personal-profile"
  | "personal-performance"
  | "personal-growth"
  | "personal-values"
  | "team-culture";

export type PeopleQuickView =
  | "all"
  | "active"
  | "inactive"
  | "full-time"
  | "freelance";

/* ======================
   ROOT
====================== */

interface PeopleSidebarProps {
  activeSection?: PeopleSection;
  onSectionChange?: (section: PeopleSection) => void;
  // Directory filter props (kept for prop compatibility but unused in UI)
  activeFilter?: PeopleQuickView;
  onFilterChange?: (filter: PeopleQuickView) => void;
}

export default function PeopleSidebar({
  activeSection = "directory",
  onSectionChange = () => { },
  activeFilter = "all", // kept for compatibility
  onFilterChange = () => { } // kept for compatibility
}: PeopleSidebarProps) {

  const { profile } = useUserProfile();
  // In the new requirement, "TEAM SPACE (only for isManager/HR)"
  // So Staff only sees MY SPACE.
  const isGlobalView = profile?.role === "admin" || profile?.role === "supervisor" || profile?.role === "hr" || profile?.role === "superadmin";

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden md:block">
        <div className="space-y-6 pt-2">

          {/* MY SPACE (Visible to All) */}
          <div className="space-y-1 mb-6">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">My Space</div>
            <NavItem label="My Profile" active={activeSection === "personal-profile"} onClick={() => onSectionChange("personal-profile")} icon={<User className="w-4 h-4" />} />
            <NavItem label="My Performance" active={activeSection === "personal-performance"} onClick={() => onSectionChange("personal-performance")} icon={<Briefcase className="w-4 h-4" />} />
            <NavItem label="My Growth" active={activeSection === "personal-growth"} onClick={() => onSectionChange("personal-growth")} icon={<BookOpen className="w-4 h-4" />} />
            <NavItem label="My Values" active={activeSection === "personal-values"} onClick={() => onSectionChange("personal-values")} icon={<Heart className="w-4 h-4" />} />
          </div>

          {/* TEAM SPACE (Manager/HR Only) */}
          {isGlobalView && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Team Space</div>
              <NavItem label="Directory" active={activeSection === "directory"} onClick={() => onSectionChange("directory")} icon={<Users className="w-4 h-4" />} />
              <NavItem label="Performance Index" active={activeSection === "performance"} onClick={() => onSectionChange("performance")} icon={<Target className="w-4 h-4" />} />
              <NavItem label="Culture" active={activeSection === "team-culture"} onClick={() => onSectionChange("team-culture")} icon={<Sparkles className="w-4 h-4" />} />
              <NavItem label="Setup" active={activeSection === "setup"} onClick={() => onSectionChange("setup")} icon={<Settings className="w-4 h-4" />} />
            </div>
          )}

        </div>
      </aside>

    </>
  );
}

/* ======================
   UI PARTS
====================== */

function NavItem({ label, active, onClick, icon, count }: { label: string; active?: boolean; onClick?: () => void; icon?: React.ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center justify-between",
        active
          ? "text-action-primary bg-bg-soft"
          : "text-neutral-600 hover:bg-neutral-50"
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className={clsx("transition-colors", active ? "text-action-primary" : "text-neutral-400")}>{icon}</span>}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={clsx("text-xs px-1.5 rounded", active ? "text-action-primary/80" : "text-neutral-400")}>
          {count}
        </span>
      )}
    </button>
  );
}
