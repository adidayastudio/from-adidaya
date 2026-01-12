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
  Settings,
  MoreHorizontal,
  Info,
  Layers,
  Grid3X3,
  DollarSign,
  Calendar,
  ShieldCheck,
} from "lucide-react";

/* ======================
   NAV ITEMS CONFIG
====================== */
const NAV_ITEMS = [
  { label: "Overview", shortLabel: "Overview", href: "", icon: LayoutDashboard },
  { label: "Activity", shortLabel: "Activity", href: "/activity", icon: Activity },
  { label: "Tracking", shortLabel: "Track", href: "/tracking", icon: BarChart },
  { label: "Docs", shortLabel: "Docs", href: "/docs", icon: FileText },
];

const SETUP_ITEMS = [
  { key: "info", label: "Project Information", icon: Info },
  { key: "stages", label: "Stages & Tasks", icon: Layers },
  { key: "wbs", label: "Work Breakdown Structure", icon: Grid3X3 },
  { key: "rab", label: "RAB", icon: DollarSign },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "rules", label: "Rules", icon: ShieldCheck },
];

export default function ProjectDetailSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const basePath = `/flow/projects/${projectId}`;

  const [setupOpen, setSetupOpen] = useState(false);
  const [mobileSetupOpen, setMobileSetupOpen] = useState(false);
  const setupMenuRef = useRef<HTMLDivElement>(null);

  const isSetupRoute = pathname.includes(`${basePath}/setup`);

  // Auto-open accordion when entering setup pages
  useEffect(() => {
    if (isSetupRoute) setSetupOpen(true);
  }, [isSetupRoute]);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (setupMenuRef.current && !setupMenuRef.current.contains(event.target as Node)) {
        setMobileSetupOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    const fullPath = `${basePath}${href}`;
    if (href === "") return pathname === basePath;
    return pathname.startsWith(fullPath);
  };

  const isSetupItemActive = (key: string) => {
    return pathname === `${basePath}/setup/${key}`;
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          {/* Back link - redesigned */}
          <Link
            href="/flow/projects"
            className="group inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-red-600 transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-neutral-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <span>Back to Projects</span>
          </Link>

          {/* Main Nav */}
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={`${basePath}${item.href}`}
                  className={clsx(
                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                    active
                      ? "text-red-600 bg-red-50"
                      : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <span className={clsx("transition-colors", active ? "text-red-600" : "text-neutral-400")}>
                    <item.icon className="w-4 h-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Setup Accordion */}
            <div>
              <button
                onClick={() => setSetupOpen((v) => !v)}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  isSetupRoute
                    ? "text-neutral-900" // Open but not "active" red
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className={clsx("transition-colors", isSetupRoute ? "text-neutral-900" : "text-neutral-400")}>
                  <Settings className="w-4 h-4" />
                </span>
                <span className="flex-1">Setup</span>
                <svg
                  className={clsx("w-4 h-4 text-neutral-400 transition-transform", setupOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {setupOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-neutral-200 pl-3">
                  {SETUP_ITEMS.map((item) => {
                    const active = isSetupItemActive(item.key);
                    return (
                      <Link
                        key={item.key}
                        href={`${basePath}/setup/${item.key}`}
                        className={clsx(
                          "w-full text-left rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2",
                          active
                            ? "text-red-600 bg-red-50 font-medium"
                            : "text-neutral-600 hover:bg-neutral-50"
                        )}
                      >
                        <span className={clsx("transition-colors", active ? "text-red-600" : "text-neutral-400")}>
                          <item.icon className="w-4 h-4" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 w-full px-4 max-w-sm safe-area-bottom">
        <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full p-2 flex items-center justify-center gap-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={`${basePath}${item.href}`}
                className={clsx(
                  "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                  active ? "bg-red-50 text-red-600" : "text-neutral-400"
                )}
              >
                <item.icon className={clsx("w-5 h-5 transition-colors", active && "stroke-2")} />
              </Link>
            );
          })}

          {/* Setup Fan Menu */}
          <div className="relative" ref={setupMenuRef}>
            <button
              onClick={() => setMobileSetupOpen(!mobileSetupOpen)}
              className={clsx(
                "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                (mobileSetupOpen || isSetupRoute) ? "bg-red-50 text-red-600" : "text-neutral-400"
              )}
            >
              {mobileSetupOpen ? (
                <div className="w-5 h-5 flex items-center justify-center font-medium">×</div>
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </button>

            {mobileSetupOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-56 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2">
                {SETUP_ITEMS.map((item) => {
                  const active = isSetupItemActive(item.key);
                  return (
                    <Link
                      key={item.key}
                      href={`${basePath}/setup/${item.key}`}
                      onClick={() => setMobileSetupOpen(false)}
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
        </div>
      </div>
    </>
  );
}
