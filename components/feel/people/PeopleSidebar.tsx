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
  // Recovery Fallback: ensure visibility even if permissions object is missing
  const isManagementRole = profile?.role && ["superadmin", "admin", "administrator", "supervisor", "manager", "hr", "pm", "management", "ceo", "owner"].includes(profile.role);
  const canViewTeam = profile?.permissions?.can_view_directory === true || isManagementRole;
  const canManagePeople = profile?.permissions?.can_manage_people === true || (isManagementRole && !["ceo", "owner"].includes(profile?.role || ""));

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full hidden lg:flex flex-col">
        <div className="space-y-0 pt-0">
          {/* MY SPACE (Visible to All) */}
          <div className="space-y-0.5 mb-4">
            <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">My Space</div>
            <NavItem label="My Profile" active={activeSection === "personal-profile"} onClick={() => onSectionChange("personal-profile")} icon={<User className="w-4 h-4" />} />
            <NavItem label="My Performance" active={activeSection === "personal-performance"} onClick={() => onSectionChange("personal-performance")} icon={<Briefcase className="w-4 h-4" />} />
            <NavItem label="My Growth" active={activeSection === "personal-growth"} onClick={() => onSectionChange("personal-growth")} icon={<BookOpen className="w-4 h-4" />} />
            <NavItem label="My Values" active={activeSection === "personal-values"} onClick={() => onSectionChange("personal-values")} icon={<Heart className="w-4 h-4" />} />
          </div>

          {/* TEAM SPACE (Manager/HR Only) */}
          {canViewTeam && (
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">Team Space</div>
              <NavItem label="Directory" active={activeSection === "directory"} onClick={() => onSectionChange("directory")} icon={<Users className="w-4 h-4" />} />
              <NavItem label="Performance Index" active={activeSection === "performance"} onClick={() => onSectionChange("performance")} icon={<Target className="w-4 h-4" />} />
              <NavItem label="Culture" active={activeSection === "team-culture"} onClick={() => onSectionChange("team-culture")} icon={<Sparkles className="w-4 h-4" />} />
              {canManagePeople && (
                <NavItem label="Setup" active={activeSection === "setup"} onClick={() => onSectionChange("setup")} icon={<Settings className="w-4 h-4" />} />
              )}
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
        "w-full text-left rounded-lg text-[12px] transition-all flex items-center justify-between px-3 py-1.5",
        active
          ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon && <span className={clsx("transition-colors", active ? "text-neutral-900 dark:text-white" : "text-neutral-400")}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {count !== undefined && (
        <span className={clsx("text-[10px] px-1.5 rounded", active ? "text-neutral-900/80 dark:text-white/80" : "text-neutral-400")}>
          {count}
        </span>
      )}
    </button>
  );
}
