"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import ActivityDrawer from "./ActivityDrawer";
import clsx from "clsx";

const FILTERS = ["All", "Design", "Site", "Expense", "Procurement"];

export default function ActivityToolbar() {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [dateString, setDateString] = useState("");

  useEffect(() => {
    // Client-side date to avoid hydration mismatch
    const now = new Date();
    setDateString(
      now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-white p-5 shadow-sm border border-neutral-100">
      {/* LEFT */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
          Activity
        </h2>
        <p className="text-sm text-neutral-500 font-medium">
          Today — {dateString || "Loading..."}
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filters */}
        <div className="hidden md:flex items-center rounded-lg bg-neutral-100 p-1">
          {FILTERS.map((label) => {
            const isActive = activeFilter === label;
            return (
              <button
                key={label}
                onClick={() => setActiveFilter(label)}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Add Activity */}
        <Button size="sm" onClick={() => setOpenDrawer(true)} className="ml-2">
          Add Activity
        </Button>
      </div>

      {/* DRAWER */}
      <ActivityDrawer
        open={openDrawer}
        mode="create"
        onClose={() => setOpenDrawer(false)}
      />
    </div>
  );
}
