"use client";

import { Search } from "lucide-react";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export type TrackView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

export default function TrackPageHeader({
  view,
  onChangeView,
}: {
  view: TrackView;
  onChangeView: (v: TrackView) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <PageHeader
          title="Track"
          description="Manage milestones, schedules, and deliverables for project tracking."
        />
      </div>

      {/* Toolbar: Filters & View Switcher */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-neutral-200 pb-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              placeholder="Search tracking info..."
              inputSize="sm"
              className="pl-9 w-60"
            />
          </div>

          <Select
            value="all-projects"
            options={[
              { value: "all-projects", label: "All Projects" },
              { value: "gym", label: "Precision Gym" },
              { value: "padel", label: "Padel JPF" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="this-month"
            options={[
              { value: "this-week", label: "This Week" },
              { value: "this-month", label: "This Month" },
              { value: "this-stage", label: "This Stage" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32"
          />

          <Select
            value="all-crews"
            options={[
              { value: "all-crews", label: "All Crews" },
              { value: "mandor", label: "Mandor" },
              { value: "mep", label: "MEP" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32"
          />
        </div>

        {/* View Options */}
        <Tabs<TrackView>
          value={view}
          onChange={onChangeView}
          className="-mb-px"
          items={[
            { key: "list", label: "List" },
            { key: "grouped", label: "Grouped" },
            { key: "board", label: "Board" },
            { key: "calendar", label: "Calendar" },
            { key: "timeline", label: "Timeline" },
          ]}
        />
      </div>
    </div>
  );
}
