"use client";

import { useState } from "react";
import TodaySummary from "./TodaySummary";
import WeeklySummary from "./WeeklySummary";
import AlertsPanel from "./AlertsPanel";
import { Project } from "@/components/flow/projects/data";
import { clsx } from "clsx";

/* =======================================
   OVERVIEW CONTENT
   - Refined Layout: Title Left, Toggle Right
======================================= */

export default function ProjectDetailOverviewContent({ project }: { project: Project }) {
  const [activeView, setActiveView] = useState<"snapshot" | "alerts">("snapshot");

  // Simulate active alerts
  const hasActiveAlerts = true;

  return (
    <div className="max-w-5xl space-y-8">
      {/* HEADER WITH TOGGLE */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900">Project Overview</h2>

        {/* SEGMENTED TOGGLE */}
        <div className="inline-flex items-center p-1 bg-neutral-100 rounded-xl">
          <button
            onClick={() => setActiveView("snapshot")}
            className={clsx(
              "px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
              activeView === "snapshot"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            Snapshot
          </button>
          <button
            onClick={() => setActiveView("alerts")}
            className={clsx(
              "px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2",
              activeView === "alerts"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            Alerts
            {hasActiveAlerts && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============ SNAPSHOT VIEW ============ */}
      {activeView === "snapshot" && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs ring-4 ring-white">T</div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 leading-none">Today's Focus</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Quick look at daily metrics</p>
              </div>
            </div>
            <div className="ml-2 pl-9 border-l border-neutral-100/0">
              <TodaySummary />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs ring-4 ring-white">W</div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 leading-none">Weekly Performance</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Progress against plan</p>
              </div>
            </div>
            <div className="ml-2 pl-9 border-l border-neutral-100/0">
              <WeeklySummary />
            </div>
          </section>
        </div>
      )}

      {/* ============ ALERTS VIEW ============ */}
      {activeView === "alerts" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AlertsPanel />
        </div>
      )}

    </div>
  );
}
