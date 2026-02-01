"use client";

import { Search, List, SquareKanban, Download, Filter, X, Plus } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { useState } from "react";
import clsx from "clsx";

export type PeopleView = "list" | "board";

const VIEW_OPTIONS = [
  { value: "list" as PeopleView, label: "List", icon: <List className="w-4 h-4" /> },
  { value: "board" as PeopleView, label: "Card", icon: <SquareKanban className="w-4 h-4" /> },
];

interface PeoplePageHeaderProps {
  view: PeopleView;
  onChangeView: (v: PeopleView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  // Filters
  deptFilter?: string;
  onDeptChange?: (v: string) => void;
  departments?: string[];
  statusFilter?: string;
  onStatusChange?: (v: string) => void;
  statuses?: string[];
  // Actions
  onExport?: () => void;
}

export default function PeoplePageHeader({
  view,
  onChangeView,
  searchQuery,
  onSearchChange,
  deptFilter,
  onDeptChange,
  departments = [],
  statusFilter,
  onStatusChange,
  statuses = [],
  onExport
}: PeoplePageHeaderProps) {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-neutral-200/60 sticky top-0 z-10 transition-all shadow-sm">

      {/* LEFT: Search & Filters */}
      <div className={clsx("flex items-center gap-2 flex-1 transition-all", showMobileSearch ? "w-full" : "")}>

        {/* Mobile Search Toggle (Visible only on mobile when search is hidden) */}
        {!showMobileSearch && (
          <div className="md:hidden pl-1">
            <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(true)} className="h-8 w-8 text-neutral-500 hover:bg-neutral-100 rounded-full">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Search Input (Always visible on Desktop, Conditional on Mobile) */}
        <div className={clsx(
          "relative transition-all duration-300",
          showMobileSearch ? "w-full" : "hidden md:block w-64"
        )}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="pl-9 h-9 text-sm bg-white border-neutral-200/80 focus:ring-blue-100 placeholder:text-neutral-400 py-1 rounded-full"
          />
          {showMobileSearch && (
            <button
              onClick={() => { setShowMobileSearch(false); onSearchChange(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters (Desktop Only - Mobile uses Bottom Sheet triggered by Icon potentially, but for now user said '1 line') */}
        {/* Only show filters if mobile search is NOT active */}
        {!showMobileSearch && (
          <>
            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              {onDeptChange && (
                <Select
                  value={deptFilter || "all"}
                  options={[{ value: "all", label: "All Dept" }, ...departments.map(d => ({ value: d, label: d }))]}
                  onChange={(val) => onDeptChange(val as string)}
                  selectSize="sm"
                  accentColor="blue"
                  className="w-32 h-9 text-xs bg-white border-neutral-200/80 rounded-full"
                />
              )}
              {onStatusChange && (
                <Select
                  value={statusFilter || "all"}
                  options={[{ value: "all", label: "All Status" }, ...statuses.map(s => ({ value: s, label: s }))]}
                  onChange={(val) => onStatusChange(val as string)}
                  selectSize="sm"
                  accentColor="blue"
                  className="w-28 h-9 text-xs bg-white border-neutral-200/80 rounded-full"
                />
              )}
            </div>

            {/* Mobile Filter Icon (Placeholder for future bottom sheet or simple toggle) */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 border border-transparent hover:border-neutral-200 hover:bg-white rounded-full">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Actions (Export, Toggle) */}
      {!showMobileSearch && (
        <div className="flex items-center gap-2 shrink-0 pr-1">

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            icon={<Download className="w-3.5 h-3.5" />}
            className="h-9 w-9 md:w-auto md:px-4 text-xs font-medium text-neutral-600 border-neutral-200/80 bg-white hover:bg-neutral-50 rounded-full"
          >
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* View Toggle */}
          <ViewToggle<PeopleView>
            value={view}
            onChange={onChangeView}
            options={VIEW_OPTIONS}
            className="hidden md:flex"
          />
        </div>
      )}
    </div>
  );
}
