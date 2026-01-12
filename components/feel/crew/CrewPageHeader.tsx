"use client";
import { Plus } from "lucide-react";


import { Search, List, LayoutList, Calendar, ChartGantt } from "lucide-react";

import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export type CrewView =
  | "list"
  | "grouped"
  | "calendar"
  | "timeline";

const VIEW_OPTIONS = [
  { value: "list" as CrewView, label: "List", icon: <List className="w-4 h-4" /> },
  { value: "grouped" as CrewView, label: "Grouped", icon: <LayoutList className="w-4 h-4" /> },
  { value: "calendar" as CrewView, label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { value: "timeline" as CrewView, label: "Timeline", icon: <ChartGantt className="w-4 h-4" /> },
];

export default function CrewPageHeader({
  view,
  onChangeView,
  onAddCrew,
  searchQuery = "",
  onSearchChange = () => { },
}: {
  view: CrewView;
  onChangeView: (v: CrewView) => void;
  onAddCrew: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Standard Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Crew</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage crew members, roles, and responsibilities.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddCrew}>
            Add Crew
          </Button>
        </div>
      </div>

      {/* Toolbar: Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search crew..."
              inputSize="sm"
              className="pl-9 w-64"
            />
          </div>

          <Select
            value="all"
            options={[
              { value: "all", label: "All Roles" },
              { value: "mandor", label: "Mandor" },
              { value: "tukang", label: "Tukang" },
              { value: "worker", label: "Worker" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="all"
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-36"
          />
        </div>

        {/* View Toggle */}
        <ViewToggle<CrewView>
          value={view}
          onChange={onChangeView}
          options={VIEW_OPTIONS}
        />
      </div>
    </div>
  );
}
