import { useState } from "react";
import clsx from "clsx";
import { Sparkles, Users, Briefcase, User, BarChart, LayoutDashboard, Target, Settings } from "lucide-react";
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
  | "personal-performance";

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
  const isStaff = profile?.role === "staff";

  // STAFF VIEW (PERSONAL)
  if (isStaff) {
    const staffItems = [
      { id: "personal-profile" as PeopleSection, label: "Profile", icon: User },
      { id: "personal-performance" as PeopleSection, label: "Performance", icon: Briefcase },
    ];

    return (
      <>
        {/* Desktop Sidebar */}
        <aside className="w-full h-full hidden md:block">
          <div className="space-y-6 pt-2">
            <button className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">My Career</div>
                <div className="text-[10px] opacity-80">AI career coach</div>
              </div>
            </button>
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Personal</div>
              {staffItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={clsx(
                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                    activeSection === item.id ? "text-blue-600 bg-blue-50" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <span className={clsx("transition-colors", activeSection === item.id ? "text-blue-600" : "text-neutral-400")}>
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

  // GLOBAL VIEW (ADMIN/SUPERVISOR)
  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden md:block">
        <div className="space-y-6 pt-2">
          {/* Header Card */}
          <button className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Org Helper</div>
              <div className="text-[10px] opacity-80">AI-powered team graph</div>
            </div>
          </button>

          {/* ME Section */}
          <div className="space-y-1 mb-6">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Me</div>
            <NavItem label="My Profile" active={activeSection === "personal-profile"} onClick={() => onSectionChange("personal-profile")} icon={<User className="w-4 h-4" />} />
            <NavItem label="My Performance" active={activeSection === "personal-performance"} onClick={() => onSectionChange("personal-performance")} icon={<Briefcase className="w-4 h-4" />} />
          </div>

          {/* ORGANIZATION Section */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Organization</div>
            <NavItem label="Overview" active={activeSection === "overview"} onClick={() => onSectionChange("overview")} icon={<LayoutDashboard className="w-4 h-4" />} />
            <NavItem label="Directory" active={activeSection === "directory"} onClick={() => onSectionChange("directory")} icon={<Users className="w-4 h-4" />} />
            <NavItem label="Performance Index" active={activeSection === "performance"} onClick={() => onSectionChange("performance")} icon={<Target className="w-4 h-4" />} />
            <NavItem label="Team Analytics" active={activeSection === "analytics"} onClick={() => onSectionChange("analytics")} icon={<BarChart className="w-4 h-4" />} />
            <NavItem label="Setup" active={activeSection === "setup"} onClick={() => onSectionChange("setup")} icon={<Settings className="w-4 h-4" />} />
          </div>

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
