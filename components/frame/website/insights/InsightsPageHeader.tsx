"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Plus, LayoutGrid, List, Calendar } from "lucide-react";
import { InsightView, InsightStatus, INSIGHT_CATEGORIES } from "./types";

type Props = {
    view: InsightView;
    onChangeView: (v: InsightView) => void;
    onAddInsight: () => void;
    categoryFilter: string;
    onCategoryFilterChange: (category: string) => void;
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
};

export default function InsightsPageHeader({
    view,
    onChangeView,
    onAddInsight,
    categoryFilter,
    onCategoryFilterChange,
    statusFilter,
    onStatusFilterChange
}: Props) {
    const categoryOptions = [
        { value: "All", label: "All Categories" },
        ...INSIGHT_CATEGORIES.map(cat => ({ value: cat, label: cat }))
    ];

    const statusOptions = [
        { value: "All", label: "All Status" },
        { value: "NOT_STARTED", label: "Not Started" },
        { value: "TODO", label: "To-Do" },
        { value: "WRITING", label: "Writing" },
        { value: "IN_REVIEW", label: "In Review" },
        { value: "NEED_APPROVAL", label: "Need Approval" },
        { value: "APPROVED", label: "Approved" },
        { value: "SCHEDULED", label: "Scheduled" },
        { value: "PUBLISHED", label: "Published" },
    ];

    return (
        <div className="space-y-4">
            {/* Standard Header */}
            <div className="flex flex-col gap-6 mb-4">
                <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Insights</h1>
                        <p className="text-sm text-neutral-500 mt-1">Manage architecture insights, timelines, and publication status.</p>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onAddInsight}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add Insight
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                {/* Filters on Left */}
                <div className="flex items-center gap-2">
                    <Select
                        value={categoryFilter}
                        options={categoryOptions}
                        onChange={onCategoryFilterChange}
                        selectSize="sm"
                        className="w-40 text-xs"
                    />
                    <Select
                        value={statusFilter}
                        options={statusOptions}
                        onChange={onStatusFilterChange}
                        selectSize="sm"
                        className="w-40 text-xs"
                    />
                </div>

                {/* View Toggles on Right */}
                <ViewToggle<InsightView>
                    value={view}
                    onChange={onChangeView}
                    options={[
                        { value: "LIST", label: "List View", icon: <List className="w-4 h-4" /> },
                        { value: "BOARD", label: "Board View", icon: <LayoutGrid className="w-4 h-4" /> },
                        { value: "CALENDAR", label: "Calendar View", icon: <Calendar className="w-4 h-4" /> },
                    ]}
                />
            </div>
        </div>
    );
}
