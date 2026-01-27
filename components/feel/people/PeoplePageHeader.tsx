"use client";
import { Plus } from "lucide-react";


import { Search, List, LayoutList, SquareKanban, Calendar, ChartGantt } from "lucide-react";

import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export type PeopleView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

const VIEW_OPTIONS = [
  { value: "list" as PeopleView, label: "List", icon: <List className="w-4 h-4" /> },
  { value: "grouped" as PeopleView, label: "Grouped", icon: <LayoutList className="w-4 h-4" /> },
  { value: "board" as PeopleView, label: "Board", icon: <SquareKanban className="w-4 h-4" /> },
  { value: "calendar" as PeopleView, label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { value: "timeline" as PeopleView, label: "Timeline", icon: <ChartGantt className="w-4 h-4" /> },
];

export default function PeoplePageHeader({
  view,
  onChangeView,
  onAddPerson,
  searchQuery = "",
  onSearchChange = () => { },
}: {
  view: PeopleView;
  onChangeView: (v: PeopleView) => void;
  onAddPerson: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* COMPACT HEADER with ACTIONS */}


      {/* COMPACT TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <div className="relative group shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people..."
              inputSize="sm"
              className="pl-9 w-60 h-9 text-sm bg-white/50 border-neutral-200/60 focus:bg-white transition-all"
            />
          </div>

          <Select
            value="all"
            options={[
              { value: "all", label: "All Roles" },
              { value: "architect", label: "Architect" },
              { value: "interior-designer", label: "Interior Designer" },
              { value: "manager", label: "Manager" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32 h-9 text-xs bg-white/50 border-neutral-200/60"
          />

          <Select
            value="all"
            options={[
              { value: "all", label: "All Status" },
              { value: "full-time", label: "Full Time" },
              { value: "freelance", label: "Freelance" },
              { value: "intern", label: "Intern" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32 h-9 text-xs bg-white/50 border-neutral-200/60"
          />
        </div>

        {/* View Toggle */}
        <div className="shrink-0">
          <ViewToggle<PeopleView>
            value={view}
            onChange={onChangeView}
            options={VIEW_OPTIONS}
          />
        </div>
      </div>
    </div>
  );


}
