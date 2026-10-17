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
      {/* Premium Desktop Header */}
      <div className="hidden lg:block mb-0">
        <div className="flex items-center justify-between gap-4 pt-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Crew Directory
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Manage crew members, roles, assignments, and availability.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
             <Button
                variant="secondary"
                className="rounded-full h-9 px-4 text-[11px] font-bold uppercase tracking-wider text-neutral-600 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm active:scale-95"
                onClick={onAddCrew}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Crew
              </Button>
          </div>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
      </div>

      {/* Toolbar: Filters & View Toggle */}
      <div className="flex items-center justify-between gap-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm p-1.5 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 transition-all shadow-sm">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-1 scrollbar-none overflow-x-auto">
          <div className="relative group min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 group-focus-within:text-neutral-600 transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 text-[12px] bg-white dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800 focus:ring-blue-100 placeholder:text-neutral-400 py-1 rounded-full"
            />
          </div>

          <div className="hidden md:flex items-center gap-2">
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
              className="w-36 h-9 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800 rounded-full"
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
              className="w-32 h-9 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800 rounded-full"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 shrink-0 pr-1">
          <ViewToggle<CrewView>
            value={view}
            onChange={onChangeView}
            options={VIEW_OPTIONS}
            className="hidden md:flex"
          />
        </div>
      </div>
    </div>
  );
}
