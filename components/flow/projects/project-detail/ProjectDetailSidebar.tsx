"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Activity,
  BarChart,
  FileText,
  Info,
  Layers,
  Grid3X3,
  Calculator,
  DollarSign,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Users,
  Package,
  Banknote,
  ChevronDown,
  FileSpreadsheet,
  UserCheck,
} from "lucide-react";

export default function ProjectDetailSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const basePath = `/flow/projects/${projectId}`;

  // Accordion states for Desktop
  const [planningOpen, setPlanningOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);

  // Popover states for Mobile
  const [mobilePlanningOpen, setMobilePlanningOpen] = useState(false);
  const [mobileWorkOpen, setMobileWorkOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const planningMenuRef = useRef<HTMLDivElement>(null);
  const workMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isPlanningRoute = pathname.includes(`${basePath}/setup`);
  const isWorkRoute = pathname.includes(`${basePath}/tracking`) || pathname.includes(`${basePath}/activity`);

  // Auto-open accordions when entering their respective routes
  useEffect(() => {
    if (isPlanningRoute) setPlanningOpen(true);
    if (isWorkRoute) setWorkOpen(true);
  }, [isPlanningRoute, isWorkRoute]);

  // Close mobile menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (planningMenuRef.current && !planningMenuRef.current.contains(target)) {
        setMobilePlanningOpen(false);
      }
      if (workMenuRef.current && !workMenuRef.current.contains(target)) {
        setMobileWorkOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMobileMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isRouteActive = (href: string, exact = false) => {
    const cleanPath = (pathname || "").split("?")[0].replace(/\/$/, "");
    const cleanHref = (href || "").split("?")[0].replace(/\/$/, "");
    if (exact) return cleanPath === cleanHref;
    return cleanPath.startsWith(cleanHref);
  };

  const handleTogglePlanning = () => {
    setMobilePlanningOpen((prev) => !prev);
    setMobileWorkOpen(false);
    setMobileMoreOpen(false);
  };

  const handleToggleWork = () => {
    setMobileWorkOpen((prev) => !prev);
    setMobilePlanningOpen(false);
    setMobileMoreOpen(false);
  };

  const handleToggleMore = () => {
    setMobileMoreOpen((prev) => !prev);
    setMobilePlanningOpen(false);
    setMobileWorkOpen(false);
  };

  // Submenu configuration
  const PLANNING_ITEMS = [
    { label: "Project Information", href: `${basePath}/setup/info`, icon: Info },
    { label: "Stages & Tasks", href: `${basePath}/setup/stages`, icon: Layers },
    { label: "WBS", href: `${basePath}/setup/wbs`, icon: Grid3X3 },
    { label: "Volume Calc", href: `${basePath}/setup/volume-calc`, icon: Calculator },
    { label: "RAB", href: `${basePath}/setup/rab`, icon: DollarSign },
    { label: "Schedule", href: `${basePath}/setup/schedule`, icon: Calendar },
  ];

  const WORK_ITEMS = [
    { label: "Tracking", href: `${basePath}/tracking`, icon: BarChart },
    { label: "Activity", href: `${basePath}/activity`, icon: Activity },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full hidden lg:flex flex-col">
        <div className="space-y-4 pt-0">
          {/* Main Nav Items */}
          <div className="space-y-0.5">
            {/* Overview */}
            <Link
              href={basePath}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(basePath, true)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
              )}
            >
              <LayoutDashboard className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(basePath, true) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">Overview</span>
            </Link>

            {/* Planning Accordion */}
            <div>
              <button
                onClick={() => setPlanningOpen((v) => !v)}
                className={clsx(
                  "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                  isPlanningRoute
                    ? "text-neutral-900 dark:text-white font-semibold"
                    : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                )}
              >
                <Calendar className={clsx("w-4 h-4 shrink-0 transition-colors", isPlanningRoute ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                <span className="flex-1 truncate">Planning</span>
                <ChevronDown
                  className={clsx("w-3.5 h-3.5 text-neutral-400 transition-transform duration-200", planningOpen && "rotate-180")}
                />
              </button>

              {planningOpen && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l border-neutral-200 dark:border-neutral-800 pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {PLANNING_ITEMS.map((item) => {
                    const active = isRouteActive(item.href, true);
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={clsx(
                          "w-full text-left rounded-lg text-[11px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                          active
                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                        )}
                      >
                        <item.icon className={clsx("w-3.5 h-3.5 shrink-0 transition-colors", active ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Work Accordion */}
            <div>
              <button
                onClick={() => setWorkOpen((v) => !v)}
                className={clsx(
                  "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                  isWorkRoute
                    ? "text-neutral-900 dark:text-white font-semibold"
                    : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                )}
              >
                <Activity className={clsx("w-4 h-4 shrink-0 transition-colors", isWorkRoute ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                <span className="flex-1 truncate">Work</span>
                <ChevronDown
                  className={clsx("w-3.5 h-3.5 text-neutral-400 transition-transform duration-200", workOpen && "rotate-180")}
                />
              </button>

              {workOpen && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l border-neutral-200 dark:border-neutral-800 pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {WORK_ITEMS.map((item) => {
                    const active = isRouteActive(item.href, true);
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={clsx(
                          "w-full text-left rounded-lg text-[11px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                          active
                            ? "text-neutral-900 dark:text-white bg-neutral-900/10 dark:bg-white/15 font-extrabold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium"
                        )}
                      >
                        <item.icon className={clsx("w-3.5 h-3.5 shrink-0 transition-colors", active ? "text-neutral-900 dark:text-white" : "text-neutral-500")} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Documents */}
            <Link
              href={`${basePath}/docs`}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(`${basePath}/docs`)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
              )}
            >
              <FileText className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(`${basePath}/docs`) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate font-medium">Documents</span>
            </Link>

            {/* Finance */}
            <Link
              href={`${basePath}/finance`}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(`${basePath}/finance`)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 hover:text-neutral-800 font-medium"
              )}
            >
              <Banknote className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(`${basePath}/finance`) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">Finance</span>
            </Link>

            {/* Resources */}
            <Link
              href={`${basePath}/resources`}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(`${basePath}/resources`)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 hover:text-neutral-800 font-medium"
              )}
            >
              <Package className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(`${basePath}/resources`) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">Resources</span>
            </Link>

            {/* People */}
            <Link
              href={`${basePath}/people`}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(`${basePath}/people`)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 hover:text-neutral-800 font-medium"
              )}
            >
              <Users className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(`${basePath}/people`) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">People</span>
            </Link>

            {/* Crew */}
            <Link
              href={`${basePath}/crew`}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(`${basePath}/crew`)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 hover:text-neutral-800 font-medium"
              )}
            >
              <UserCheck className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(`${basePath}/crew`) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">Crew</span>
            </Link>

            {/* Reports */}
            <Link
              href={`${basePath}/reports`}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                isRouteActive(`${basePath}/reports`)
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
              )}
            >
              <FileSpreadsheet className={clsx("w-4 h-4 shrink-0 transition-colors", isRouteActive(`${basePath}/reports`) ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate font-medium">Reports</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 w-full px-4 max-w-sm safe-area-bottom">
        <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full p-2 flex items-center justify-center gap-4">
          {/* Overview Button */}
          <Link
            href={basePath}
            className={clsx(
              "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
              isRouteActive(basePath, true) ? "bg-red-50 text-red-600" : "text-neutral-400"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
          </Link>

          {/* Planning Menu Toggle */}
          <div className="relative" ref={planningMenuRef}>
            <button
              onClick={handleTogglePlanning}
              className={clsx(
                "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                mobilePlanningOpen || isPlanningRoute ? "bg-red-50 text-red-600" : "text-neutral-400"
              )}
            >
              <Calendar className="w-5 h-5" />
            </button>

            {mobilePlanningOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Planning</div>
                {PLANNING_ITEMS.map((item) => {
                  const active = isRouteActive(item.href, true);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobilePlanningOpen(false)}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                        active ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                      )}
                    >
                      <item.icon className={clsx("w-4 h-4", active ? "text-red-600" : "text-neutral-400")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Work Menu Toggle */}
          <div className="relative" ref={workMenuRef}>
            <button
              onClick={handleToggleWork}
              className={clsx(
                "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                mobileWorkOpen || isWorkRoute ? "bg-red-50 text-red-600" : "text-neutral-400"
              )}
            >
              <Activity className="w-5 h-5" />
            </button>

            {mobileWorkOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Work</div>
                {WORK_ITEMS.map((item) => {
                  const active = isRouteActive(item.href, true);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileWorkOpen(false)}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                        active ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                      )}
                    >
                      <item.icon className={clsx("w-4 h-4", active ? "text-red-600" : "text-neutral-400")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Docs Button */}
          <Link
            href={`${basePath}/docs`}
            className={clsx(
              "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
              isRouteActive(`${basePath}/docs`) ? "bg-red-50 text-red-600" : "text-neutral-400"
            )}
          >
            <FileText className="w-5 h-5" />
          </Link>

          {/* More Menu Toggle (Finance, Resources, People, Reports) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={handleToggleMore}
              className={clsx(
                "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                mobileMoreOpen || isRouteActive(`${basePath}/reports`) ? "bg-red-50 text-red-600" : "text-neutral-400"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center font-bold">•••</div>
            </button>

            {mobileMoreOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-52 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">More</div>
                
                {/* Reports */}
                <Link
                  href={`${basePath}/reports`}
                  onClick={() => setMobileMoreOpen(false)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                    isRouteActive(`${basePath}/reports`) ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <FileSpreadsheet className={clsx("w-4 h-4", isRouteActive(`${basePath}/reports`) ? "text-red-600" : "text-neutral-400")} />
                  Reports
                </Link>

                <div className="h-px bg-neutral-200/50 my-1" />

                {/* Finance */}
                <Link
                  href={`${basePath}/finance`}
                  onClick={() => setMobileMoreOpen(false)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                    isRouteActive(`${basePath}/finance`) ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <Banknote className={clsx("w-4 h-4", isRouteActive(`${basePath}/finance`) ? "text-red-600" : "text-neutral-400")} />
                  Finance
                </Link>

                {/* Resources */}
                <Link
                  href={`${basePath}/resources`}
                  onClick={() => setMobileMoreOpen(false)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                    isRouteActive(`${basePath}/resources`) ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <Package className={clsx("w-4 h-4", isRouteActive(`${basePath}/resources`) ? "text-red-600" : "text-neutral-400")} />
                  Resources
                </Link>

                {/* People */}
                <Link
                  href={`${basePath}/people`}
                  onClick={() => setMobileMoreOpen(false)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                    isRouteActive(`${basePath}/people`) ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <Users className={clsx("w-4 h-4", isRouteActive(`${basePath}/people`) ? "text-red-600" : "text-neutral-400")} />
                  People
                </Link>

                {/* Crew */}
                <Link
                  href={`${basePath}/crew`}
                  onClick={() => setMobileMoreOpen(false)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                    isRouteActive(`${basePath}/crew`) ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <UserCheck className={clsx("w-4 h-4", isRouteActive(`${basePath}/crew`) ? "text-red-600" : "text-neutral-400")} />
                  Crew
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
