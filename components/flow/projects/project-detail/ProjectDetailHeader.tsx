"use client";
import React, { useState, useEffect, useContext, useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ProjectContext } from "@/components/flow/project-context";

import {
  ProjectStatus,
  PROJECT_STATUS_LABEL,
} from "@/shared/constants/project-status";
import { Project } from "@/components/flow/projects/data";
import { PROJECT_STAGE_LABEL_SHORT } from "@/shared/constants/project-stage";
import clsx from "clsx";

/* =====================
   COLOR HELPERS
====================== */

const STATUS_THEME: Record<string, { badge: string, dot: string }> = {
  "at-risk": { badge: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
  overloaded: { badge: "bg-orange-50 text-orange-700 border-orange-100", dot: "bg-orange-500" },
  delayed: { badge: "bg-yellow-50 text-yellow-700 border-yellow-100", dot: "bg-yellow-500" },
  "on-track": { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  completed: { badge: "bg-brand-blue/5 text-brand-blue border-brand-blue/10", dot: "bg-brand-blue" },
  active: { badge: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  archived: { badge: "bg-neutral-100 text-neutral-600 border-neutral-200", dot: "bg-neutral-500" },
  on_hold: { badge: "bg-yellow-50 text-yellow-700 border-yellow-100", dot: "bg-yellow-500" },
};

/* =====================
   TYPES
====================== */

export interface ProjectHeaderProps {
  name: string;
  projectNo: string;
  code: string;
  type: string;
  stage: string;
  status: string;
  progress: number;
}

/* =====================
   COMPONENT
====================== */

export default function ProjectDetailHeader({ project }: { project: ProjectHeaderProps }) {
  const { name, projectNo, code, type, stage, status, progress } = project;
  const theme = STATUS_THEME[status] || STATUS_THEME["active"];

  const params = useParams();
  const pathname = usePathname() || "";
  const projectCtx = useContext(ProjectContext);
  const proj = projectCtx?.project || null;

  const urlParam = (params?.projectId || params?.id) as string;
  const projectSlug = proj?.project_code || code || urlParam;
  const basePath = `/project/${projectSlug}`;

  // Mock breakdown based on progress
  const design = Math.min(100, Math.floor(progress * 1.2));
  const construction = Math.max(0, Math.floor(progress * 0.8));
  const budget = Math.floor(progress * 0.9);

  // Safe stage access
  const stageLabel = PROJECT_STAGE_LABEL_SHORT[stage as keyof typeof PROJECT_STAGE_LABEL_SHORT] || stage;

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && typeof target.scrollTop === 'number') {
        setIsScrolled(target.scrollTop > 5);
      }
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Pages where sticky header is disabled (scrolls naturally to maximize screen space)
  const isHeavyContentPage = useMemo(() => {
    const p = pathname.toLowerCase();
    return (
      p.includes('/wbs') ||
      p.includes('/stages') ||
      p.includes('/rab') ||
      p.includes('/volume-calc') ||
      p.includes('/schedule') ||
      p.includes('/tasks/editor')
    );
  }, [pathname]);

  return (
    <>
      {/* HEADER CARD */}
      <div
        className={clsx(
          "transition-all duration-300",
          !isHeavyContentPage && "lg:sticky lg:top-0 lg:z-20",
          isScrolled
            ? "px-6 py-4 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] mt-2"
            : "px-0 pb-4 pt-2 bg-transparent border-transparent shadow-none mt-0"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
          {/* ================= LEFT ================= */}
          <div className="space-y-2 min-w-0 flex-1">
            {/* Main Title */}
            <div className="flex items-center gap-3 group">
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight leading-none group-hover:text-neutral-700 transition-colors cursor-default line-clamp-1 lg:line-clamp-none">
                {name}
              </h1>
              <div className={clsx("w-2 h-2 rounded-full ring-2 ring-white", theme.dot)} />
            </div>

            {/* Meta Row: Project No • Code • Stage */}
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-600">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
                #{projectNo}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
                {code}
              </span>

              <span className="text-neutral-300 mx-1 hidden sm:inline">•</span>

              <span className={clsx("uppercase tracking-wide text-xs font-bold", theme.badge.split(" ")[1])}>
                {stageLabel}
              </span>

              <span className="text-neutral-300 mx-1 hidden sm:inline">•</span>

              <span className="text-neutral-500 font-normal text-xs sm:text-sm">
                {type === "design-only" ? "Design Only" : type === "build-only" ? "Build Only" : "Design & Build"}
              </span>
            </div>
          </div>

          {/* ================= RIGHT (Progress) ================= */}
          <div className="w-full lg:w-[280px] shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Overall Progress</span>
              <span className="text-lg font-bold text-neutral-900 leading-none">{progress}%</span>
            </div>

            {/* Bar */}
            <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden mb-2">
              <div
                className={clsx("h-full rounded-full transition-all duration-500", theme.dot)}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Mini Stats */}
            <div className="flex justify-between items-center text-[10px] uppercase font-medium text-neutral-400 tracking-wide">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                <span>Design {design}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                <span>Const. {construction}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <span>Paid {budget}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MOBILE / TABLET FLOATING PILL TABS NAVIGATION (OUTSIDE HEADER CARD) ================= */}
      <div className="lg:hidden sticky top-3 z-30 flex items-center gap-1.5 overflow-x-auto my-3 py-2 px-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full border border-white/60 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hide-scrollbar">
        {[
          { label: "Overview", href: `${basePath}` },
          { label: "Info", href: `${basePath}/setup/info` },
          { label: "Stages", href: `${basePath}/setup/stages` },
          { label: "WBS", href: `${basePath}/setup/wbs` },
          { label: "RAB", href: `${basePath}/setup/rab` },
          { label: "Schedule", href: `${basePath}/setup/schedule` },
          { label: "Tasks", href: `${basePath}/tasks` },
          { label: "Tracking", href: `${basePath}/tracking` },
          { label: "Activity", href: `${basePath}/activity` },
          { label: "Docs", href: `${basePath}/docs` },
          { label: "Reports", href: `${basePath}/reports` },
        ].map((tab) => {
          const isExact = tab.href === basePath;
          const active = isExact
            ? (pathname === basePath || pathname === `${basePath}/`)
            : (pathname?.startsWith(tab.href));

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shrink-0",
                active
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
