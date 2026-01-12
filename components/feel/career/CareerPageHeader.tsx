"use client";

import { Plus, Search, List, LayoutList, SquareKanban, Calendar, ChartGantt } from "lucide-react";

import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export type CareerView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

const VIEW_OPTIONS: { value: CareerView; label: string; icon: React.ReactNode }[] = [
  { value: "list", label: "List", icon: <List className="w-4 h-4" /> },
  { value: "grouped", label: "Grouped", icon: <LayoutList className="w-4 h-4" /> },
  { value: "board", label: "Board", icon: <SquareKanban className="w-4 h-4" /> },
  { value: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { value: "timeline", label: "Timeline", icon: <ChartGantt className="w-4 h-4" /> },
];

export default function CareerPageHeader({
  view,
  onChangeView,
  onCreateJob,
  searchQuery = "",
  onSearchChange = () => { },
}: {
  view: CareerView;
  onChangeView: (v: CareerView) => void;
  onCreateJob: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Standard Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Career</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage recruitment, job openings, and career paths.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onCreateJob}>
            Create Job Posting
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
              placeholder="Search jobs..."
              inputSize="sm"
              className="pl-9 w-64"
            />
          </div>

          <Select
            value="all"
            options={[
              { value: "all", label: "All Departments" },
              { value: "design", label: "Design" },
              { value: "construction", label: "Construction" },
              { value: "marketing", label: "Marketing" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="active"
            options={[
              { value: "active", label: "Active Jobs" },
              { value: "draft", label: "Drafts" },
              { value: "closed", label: "Closed" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-36"
          />
        </div>

        {/* View Toggle */}
        <ViewToggle<CareerView>
          value={view}
          onChange={onChangeView}
          options={VIEW_OPTIONS}
        />
      </div>
    </div>
  );
}
