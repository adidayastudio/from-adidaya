"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ProjectsGroupBy } from "./ProjectsPageHeader";
import {
  ProjectStage,
  PROJECT_STAGE_LABEL_SHORT,
  PROJECT_STAGE_ORDER,
  PROJECT_STAGES,
} from "@/shared/constants/project-stage";
import {
  ProjectStatus,
  PROJECT_STATUS_LABEL,
} from "@/shared/constants/project-status";
import { Project, getProjectSlug } from "./data";

/* ======================
   TYPES
====================== */

type SortKey = "projectNo" | "stage" | "progress" | "lastUpdate";
type SortDir = "asc" | "desc";

/* ======================
   GROUP ORDER
====================== */

const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "at-risk",
  "overloaded",
  "delayed",
  "on-track",
  "completed",
];

/* ======================
   COLORS
====================== */

const STATUS_ACCENT: Record<ProjectStatus, { accent: string; text: string; badge: string }> = {
  "at-risk": {
    accent: "bg-red-500",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700"
  },
  overloaded: {
    accent: "bg-orange-500",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700"
  },
  delayed: {
    accent: "bg-yellow-500",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700"
  },
  "on-track": {
    accent: "bg-neutral-400",
    text: "text-neutral-600",
    badge: "bg-neutral-100 text-neutral-600"
  },
  completed: {
    accent: "bg-green-500",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700"
  },
};

// Progress color by percentage (NOT by status)
function progressBarColor(progress: number) {
  if (progress <= 20) return "bg-red-500";
  if (progress <= 40) return "bg-orange-500";
  if (progress <= 60) return "bg-yellow-500";
  if (progress <= 80) return "bg-blue-500";
  return "bg-green-500";
}

/* ======================
   HELPERS
====================== */

function toggleSortDir(dir: SortDir) {
  return dir === "asc" ? "desc" : "asc";
}

function sortProjects(items: Project[], key: SortKey, dir: SortDir) {
  const mult = dir === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    if (key === "projectNo") return mult * a.projectNo.localeCompare(b.projectNo);
    if (key === "progress") return mult * (a.progress - b.progress);
    if (key === "lastUpdate") return mult * a.lastUpdate.localeCompare(b.lastUpdate);
    if (key === "stage")
      return mult * (PROJECT_STAGE_ORDER[a.stage] - PROJECT_STAGE_ORDER[b.stage]);
    return 0;
  });
}

function groupProjects(projects: Project[], groupBy: ProjectsGroupBy) {
  const map = new Map<string, Project[]>();

  projects.forEach((p) => {
    const k = p[groupBy];
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  });

  if (groupBy === "status") {
    return PROJECT_STATUS_ORDER.map((k) => ({ key: k, items: map.get(k) ?? [] }));
  }

  return PROJECT_STAGES.map((s) => ({ key: s.key, items: map.get(s.key) ?? [] }));
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown className="ml-1 h-3 w-3 text-neutral-300 opacity-50" />;

  return dir === "asc" ? (
    <ChevronUp className="ml-1 h-3 w-3 text-neutral-800" />
  ) : (
    <ChevronDown className="ml-1 h-3 w-3 text-neutral-800" />
  );
}

function getPremiumEmptyMessage(groupBy: ProjectsGroupBy, key: string) {
  if (groupBy === "stage") {
    return "No projects currently in this phase.";
  }

  switch (key as ProjectStatus) {
    case "at-risk": return "Clear sailing. No projects currently at risk.";
    case "overloaded": return "Workload optimized. No overloaded projects.";
    case "delayed": return "On schedule. No delays reported.";
    case "on-track": return "No projects currently tracked here.";
    case "completed": return "No completed projects yet.";
    default: return "No projects to display.";
  }
}

function ThSort({
  label,
  active,
  dir,
  onClick,
  align = "left",
  width,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
  width?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={[
        "select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide",
        "text-neutral-500 hover:text-neutral-700 cursor-pointer bg-neutral-50 border-b border-neutral-200",
        align === "right" ? "text-right" : "text-left",
        width
      ].join(" ")}
      title="Sort"
    >
      <span className={["inline-flex items-center gap-1", align === "right" ? "justify-end w-full" : ""].join(" ")}>
        {label}
        <SortIcon active={active} dir={dir} />
      </span>
    </th>
  );
}

/* ======================
   SUB-COMPONENT: GROUP TABLE
====================== */

function ProjectListGroup({
  groupKey,
  groupBy,
  items,
  isStatusGrouping,
  collapsedCompleted,
  setCollapsedCompleted,
}: {
  groupKey: string;
  groupBy: ProjectsGroupBy;
  items: Project[];
  isStatusGrouping: boolean;
  collapsedCompleted: boolean;
  setCollapsedCompleted: (v: boolean) => void;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("projectNo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(
    () => sortProjects(items, sortKey, sortDir),
    [items, sortKey, sortDir]
  );

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => toggleSortDir(d));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleRowClick = (project: Project) => {
    router.push(`/flow/projects/${getProjectSlug(project)}`);
  };

  const isAttention = isStatusGrouping && groupKey === "at-risk";

  const groupLabel = isStatusGrouping
    ? PROJECT_STATUS_LABEL[groupKey as ProjectStatus]
    : PROJECT_STAGE_LABEL_SHORT[groupKey as ProjectStage];

  return (
    <div className="space-y-3">
      {/* GROUP HEADER */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-semibold text-neutral-900">{groupLabel}</span>
        <span className="text-xs font-medium text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
        {isAttention && (
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Needs Attention" />
        )}
        {/* Toggle for completed only */}
        {isStatusGrouping && groupKey === "completed" && (
          <button
            onClick={() => setCollapsedCompleted(!collapsedCompleted)}
            className="ml-auto text-xs text-neutral-500 hover:text-neutral-700 font-medium"
          >
            {collapsedCompleted ? "Show" : "Hide"}
          </button>
        )}
      </div>

      {/* TABLE CARD */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr>
              <ThSort
                label="No"
                active={sortKey === "projectNo"}
                dir={sortDir}
                onClick={() => onSort("projectNo")}
                align="left"
                width="w-[70px]"
              />
              <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-50 border-b border-neutral-200">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-50 border-b border-neutral-200 w-auto">
                Project
              </th>

              {groupBy !== "stage" && (
                <ThSort
                  label="Stage"
                  active={sortKey === "stage"}
                  dir={sortDir}
                  onClick={() => onSort("stage")}
                  align="left"
                  width="w-[120px]"
                />
              )}

              {groupBy !== "status" && (
                <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-50 border-b border-neutral-200">
                  Status
                </th>
              )}

              <ThSort
                label="Progress"
                active={sortKey === "progress"}
                dir={sortDir}
                onClick={() => onSort("progress")}
                align="right"
                width="w-[180px]"
              />

              <ThSort
                label="Update"
                active={sortKey === "lastUpdate"}
                dir={sortDir}
                onClick={() => onSort("lastUpdate")}
                align="right"
                width="w-[140px]"
              />
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-neutral-400"
                >
                  {getPremiumEmptyMessage(groupBy, groupKey)}
                </td>
              </tr>
            ) : (
              sorted.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => handleRowClick(p)}
                  className={`
                    group cursor-pointer hover:bg-neutral-50 transition-colors
                    ${idx !== sorted.length - 1 ? "border-b border-neutral-100" : ""}
                  `}
                >
                  <td className="px-4 py-3 text-left text-neutral-500 font-medium text-xs">
                    {p.projectNo}
                  </td>
                  <td className="px-4 py-3 text-left text-neutral-500 text-xs font-medium">
                    {p.code}
                  </td>
                  <td className="px-4 py-3 text-left font-semibold text-neutral-900 truncate">
                    {p.name}
                  </td>

                  {groupBy !== "stage" && (
                    <td className="px-4 py-3 text-left text-neutral-600">
                      {PROJECT_STAGE_LABEL_SHORT[p.stage]}
                    </td>
                  )}

                  {groupBy !== "status" && (
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_ACCENT[p.status].badge || "bg-gray-100 text-gray-700"} `}>
                        {PROJECT_STATUS_LABEL[p.status]}
                      </span>
                    </td>
                  )}

                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-medium text-neutral-700">
                        {p.progress}%
                      </span>
                      <div className="h-1 w-full max-w-[120px] rounded-full bg-neutral-100">
                        <div
                          className={`h-1 rounded-full ${progressBarColor(p.progress)}`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right text-xs text-neutral-400">
                    {p.lastUpdate}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ======================
   MAIN COMPONENT
====================== */

export default function ProjectsListTable({
  groupBy,
  projects,
}: {
  groupBy: ProjectsGroupBy;
  projects: Project[];
}) {
  // Global collapse state for "completed" group
  const [collapsedCompleted, setCollapsedCompleted] = useState(true);

  const groups = useMemo(() => groupProjects(projects, groupBy), [groupBy, projects]);

  const isStatusGrouping = groupBy === "status";
  const shouldHideCompleted = isStatusGrouping && collapsedCompleted;

  return (
    <div className="overflow-x-auto pb-10">
      <div className="min-w-[960px] space-y-8">
        {groups.map(({ key, items }) => {
          // Note: items.length === 0 check REMOVED to show empty messages

          // Hide completed table entirely if collapsed
          if (key === "completed" && shouldHideCompleted) return null;

          return (
            <ProjectListGroup
              key={key}
              groupKey={key}
              groupBy={groupBy}
              items={items}
              isStatusGrouping={isStatusGrouping}
              collapsedCompleted={collapsedCompleted}
              setCollapsedCompleted={setCollapsedCompleted}
            />
          );
        })}

        {/* Restore Button for Completed Projects */}
        {isStatusGrouping && collapsedCompleted && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setCollapsedCompleted(false)}
              className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900 bg-white border border-neutral-200 rounded-full shadow-sm hover:shadow transition-all font-medium"
            >
              Show {projects.filter(p => p.status === "completed").length} completed projects
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
