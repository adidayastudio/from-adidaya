"use client";

import clsx from "clsx";
import { Plus, List, Grid3X3, BarChart3 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

export type MyTasksView =
  | "summary"
  | "list"
  | "board"
  | "timeline"
  | "calendar";

interface MyTasksHeaderProps {
  view: MyTasksView;
  onChangeView: (v: MyTasksView) => void;
  onNewTask: () => void;
}

export default function MyTasksHeader({ view, onChangeView, onNewTask }: MyTasksHeaderProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* TITLE + BUTTON ROW */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Tasks</h1>
          <p className="text-sm text-neutral-500 mt-1">Track your personal tasks and responsibilities.</p>
        </div>
        <Button onClick={onNewTask} variant="primary" className="!rounded-full !py-2 !px-5" icon={<Plus className="w-4 h-4" />}>
          New Task
        </Button>
      </div>

      {/* DIVIDER */}
      <div className="border-b border-neutral-200" />

      {/* VIEW TOGGLE - Matches Feel Clock style */}
      <div className="flex items-center justify-between gap-4">
        {/* VIEW TABS (Summary, List, Board, etc.) */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-full">
          <ViewToggleButton active={view === "summary"} onClick={() => onChangeView("summary")} label="Summary" />
          <ViewToggleButton active={view === "list"} onClick={() => onChangeView("list")} label="List" />
          <ViewToggleButton active={view === "board"} onClick={() => onChangeView("board")} label="Board" />
          <ViewToggleButton active={view === "timeline"} onClick={() => onChangeView("timeline")} label="Timeline" />
          <ViewToggleButton active={view === "calendar"} onClick={() => onChangeView("calendar")} label="Calendar" />
        </div>

        {/* ICON VIEW TOGGLE (optional - for quick switching) */}
        <div className="hidden md:flex items-center bg-neutral-100 rounded-full p-1">
          <button
            onClick={() => onChangeView("list")}
            className={clsx("p-2 rounded-full transition-colors", view === "list" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeView("board")}
            className={clsx("p-2 rounded-full transition-colors", view === "board" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
            title="Board View"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeView("summary")}
            className={clsx("p-2 rounded-full transition-colors", view === "summary" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
            title="Summary"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-4 py-2 text-xs font-semibold rounded-full transition-all",
        active ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
      )}
    >
      {label}
    </button>
  );
}
