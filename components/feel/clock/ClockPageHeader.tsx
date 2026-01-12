"use client";

import { Plus, List, Calendar, Search } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export type ClockView = "list" | "calendar";

const VIEW_OPTIONS = [
    { value: "list" as ClockView, label: "List", icon: <List className="w-4 h-4" /> },
    { value: "calendar" as ClockView, label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
];

interface ClockPageHeaderProps {
    view: ClockView;
    onChangeView: (v: ClockView) => void;
    onAddEntry: () => void;
}

export default function ClockPageHeader({
    view,
    onChangeView,
    onAddEntry,
}: ClockPageHeaderProps) {
    return (
        <div className="space-y-6">
            {/* Standard Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Clock</h1>
                        <p className="text-sm text-neutral-500 mt-1">Time tracking, leaves, and attendance records.</p>
                    </div>
                    <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddEntry}>
                        Log Time
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
                            placeholder="Search records..."
                            inputSize="sm"
                            className="pl-9 w-64"
                        />
                    </div>

                    <Select
                        value="this-month"
                        options={[
                            { value: "this-week", label: "This Week" },
                            { value: "this-month", label: "This Month" },
                            { value: "last-month", label: "Last Month" },
                        ]}
                        onChange={() => { }}
                        selectSize="sm"
                        className="w-40"
                    />
                </div>

                {/* View Toggle */}
                <ViewToggle<ClockView>
                    value={view}
                    onChange={onChangeView}
                    options={VIEW_OPTIONS}
                />
            </div>
        </div>
    );
}
