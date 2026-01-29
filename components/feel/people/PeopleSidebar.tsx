import { useState } from "react";
import clsx from "clsx";
import { Sparkles, ChevronRight, Users, UserCheck, UserX, Briefcase, User, BarChart, LayoutDashboard, Target, Settings, TrendingUp } from "lucide-react";
import useUserProfile from "@/hooks/useUserProfile";
import type { LucideIcon } from "lucide-react";

/* ======================
   TYPES
====================== */

export type PeopleSection =
  | "overview"
  | "directory"
  | "performance"
  | "analytics"
  | "management"
  | "personal-profile"
  | "personal-performance";

type PeopleQuickView =
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
  // Directory filter props
  activeFilter?: PeopleQuickView;
  onFilterChange?: (filter: PeopleQuickView) => void;
}

export default function PeopleSidebar({
  activeSection = "directory",
  onSectionChange = () => { },
  activeFilter = "all",
  onFilterChange = () => { }
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
  const orgItems = [
    { id: "overview" as PeopleSection, label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
    { id: "directory" as PeopleSection, label: "Directory", shortLabel: "People", icon: Users },
    { id: "performance" as PeopleSection, label: "Performance", shortLabel: "Perform", icon: Target },
    { id: "analytics" as PeopleSection, label: "Analytics", shortLabel: "Analytics", icon: BarChart },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden md:block">
        <div className="space-y-6 pt-2">
          <button className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Org Helper</div>
              <div className="text-[10px] opacity-80">AI-powered team graph</div>
            </div>
          </button>

          <div className="space-y-1 mb-6">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Me</div>
            <NavItem label="My Profile" active={activeSection === "personal-profile"} onClick={() => onSectionChange("personal-profile")} icon={<User className="w-4 h-4" />} />
            <NavItem label="My Performance" active={activeSection === "personal-performance"} onClick={() => onSectionChange("personal-performance")} icon={<Briefcase className="w-4 h-4" />} />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Organization</div>
            <NavItem label="Overview" active={activeSection === "overview"} onClick={() => onSectionChange("overview")} icon={<LayoutDashboard className="w-4 h-4" />} />
            <NavItem label="Directory" active={activeSection === "directory"} onClick={() => onSectionChange("directory")} icon={<Users className="w-4 h-4" />} />
            <NavItem label="Performance Index" active={activeSection === "performance"} onClick={() => onSectionChange("performance")} icon={<Target className="w-4 h-4" />} />
            <NavItem label="Team Analytics" active={activeSection === "analytics"} onClick={() => onSectionChange("analytics")} icon={<BarChart className="w-4 h-4" />} />
            <NavItem label="Management" active={activeSection === "management"} onClick={() => onSectionChange("management")} icon={<Settings className="w-4 h-4" />} />
          </div>

          <div className="border-t border-neutral-100" />

          {activeSection === "directory" && (
            <>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Filters</div>
                <NavItem label="All Staff" active={activeFilter === "all"} onClick={() => onFilterChange("all")} icon={<Users className="w-4 h-4" />} />
                <NavItem label="Active" active={activeFilter === "active"} onClick={() => onFilterChange("active")} icon={<UserCheck className="w-4 h-4" />} />
                <NavItem label="Inactive" active={activeFilter === "inactive"} onClick={() => onFilterChange("inactive")} icon={<UserX className="w-4 h-4" />} />
                <NavItem label="Full Time" active={activeFilter === "full-time"} onClick={() => onFilterChange("full-time")} icon={<Briefcase className="w-4 h-4" />} />
                <NavItem label="Freelance" active={activeFilter === "freelance"} onClick={() => onFilterChange("freelance")} icon={<User className="w-4 h-4" />} />
              </div>
              <div className="space-y-1 pt-4">
                <Accordion title="Role">
                  <FilterItem label="Architect" />
                  <FilterItem label="Interior Designer" />
                  <FilterItem label="Structural Engineer" />
                  <FilterItem label="MEP Engineer" />
                  <FilterItem label="Project Manager" />
                  <FilterItem label="Admin / Finance" />
                </Accordion>
                <Accordion title="Project Assignment">
                  <FilterItem label="Precision Gym" />
                  <FilterItem label="Padel JPF" />
                  <FilterItem label="+ More" />
                </Accordion>
              </div>
            </>
          )}

          {activeSection === "performance" && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Focus</div>
              <NavItem label="High Performers" icon={<TrendingUpIcon />} />
              <NavItem label="Needs Support" icon={<AlertIcon />} />
              <NavItem label="Project Leaders" icon={<Target className="w-4 h-4" />} />
            </div>
          )}
        </div>
      </aside>

    </>
  );
}

function TrendingUpIcon() {
  return <TrendingUp className="w-4 h-4" />
}

function AlertIcon() {
  return <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500" />
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

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all",
          open ? "text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
        )}
      >
        <span>{title}</span>
        <ChevronRight
          size={14}
          className={clsx(
            "transition-transform text-neutral-400",
            open && "rotate-90"
          )}
        />
      </button>

      {open && <div className="mt-1 space-y-0.5 pl-3 border-l border-neutral-100 ml-3">{children}</div>}
    </div>
  );
}

function FilterItem({ label }: { label: string }) {
  return (
    <div className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">
      {label}
    </div>
  );
}
