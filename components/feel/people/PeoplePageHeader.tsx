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
  { value: "list" as PeopleView, label: "List View", icon: <List className="w-4 h-4" /> },
  { value: "board" as PeopleView, label: "Board View", icon: <SquareKanban className="w-4 h-4" /> },
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
    <div className="space-y-6">
      {/* Premium Desktop Header */}
      <div className="hidden lg:block mb-0">
        <div className="flex items-center justify-between gap-4 pt-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              People & Directory
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Manage team members, directory profiles, and organization structure.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
             <Button
                variant="secondary"
                className="rounded-full h-9 px-4 text-[11px] font-bold uppercase tracking-wider text-neutral-600 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-sm active:scale-95"
                onClick={onExport}
                icon={<Download className="w-4 h-4" />}
              >
                Export
              </Button>
          </div>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
      </div>

      <div className="flex items-center justify-between gap-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm p-1.5 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 transition-all shadow-sm">
        {/* LEFT: Search & Filters */}
        <div className={clsx("flex items-center gap-2 flex-1 transition-all", showMobileSearch ? "w-full" : "")}>

          {/* Mobile Search Toggle */}
          {!showMobileSearch && (
            <div className="md:hidden pl-1">
              <Button 
                variant="text" 
                onClick={() => setShowMobileSearch(true)} 
                className="h-8 w-8 !p-0 text-neutral-500 hover:bg-neutral-100 rounded-full"
                iconOnly={<Search className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Search Input */}
          <div className={clsx(
            "relative transition-all duration-300",
            showMobileSearch ? "w-full" : "hidden md:block w-64"
          )}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 text-[12px] bg-white dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800 focus:ring-blue-100 placeholder:text-neutral-400 py-1 rounded-full"
            />
            {showMobileSearch && (
              <button
                onClick={() => { setShowMobileSearch(false); onSearchChange(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Desktop Filters */}
          {!showMobileSearch && (
            <div className="hidden md:flex items-center gap-2">
              {onDeptChange && (
                <Select
                  value={deptFilter || "all"}
                  options={[{ value: "all", label: "All Dept" }, ...departments.map(d => ({ value: d, label: d }))]}
                  onChange={(val) => onDeptChange(val as string)}
                  selectSize="sm"
                  className="w-32 h-9 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800 rounded-full"
                />
              )}
              {onStatusChange && (
                <Select
                  value={statusFilter || "all"}
                  options={[{ value: "all", label: "All Status" }, ...statuses.map(s => ({ value: s, label: s }))]}
                  onChange={(val) => onStatusChange(val as string)}
                  selectSize="sm"
                  className="w-28 h-9 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-neutral-950 border-neutral-200/80 dark:border-neutral-800 rounded-full"
                />
              )}
            </div>
          )}
          
          {/* Mobile Filter Icon */}
          {!showMobileSearch && (
            <div className="md:hidden">
              <Button 
                variant="text" 
                className="h-8 w-8 !p-0 text-neutral-500 border border-transparent hover:border-neutral-200 hover:bg-white rounded-full"
                iconOnly={<Filter className="w-4 h-4" />}
              />
            </div>
          )}
        </div>

        {/* RIGHT: View Toggle */}
        {!showMobileSearch && (
          <div className="flex items-center gap-2 shrink-0 pr-1">
            <ViewToggle<PeopleView>
              value={view}
              onChange={onChangeView}
              options={VIEW_OPTIONS}
              className="hidden md:flex"
            />
          </div>
        )}
      </div>
    </div>
  );
}
