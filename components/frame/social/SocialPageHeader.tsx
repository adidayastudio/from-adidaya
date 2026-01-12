"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Plus, LayoutGrid, List, Calendar } from "lucide-react";

export type SocialView = "LIST" | "BOARD" | "CALENDAR";
export type AccountView = "LIST" | "BOARD";

type Props = {
    view: SocialView;
    onChangeView: (v: SocialView) => void;
    onAddPost: () => void;
    monthFilter: string;
    onMonthFilterChange: (month: string) => void;
    monthOptions: { value: string; label: string }[];
};

export default function SocialPageHeader({
    view,
    onChangeView,
    onAddPost,
    monthFilter,
    onMonthFilterChange,
    monthOptions
}: Props) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Social Media Planner"
                description="Plan, schedule, and manage content across all your accounts."
                actions={
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onAddPost}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add Post
                    </Button>
                }
            />

            <div className="flex items-center justify-between">
                {/* Filters on Left */}
                <div className="flex items-center gap-2">
                    <Select
                        value={monthFilter}
                        options={monthOptions}
                        onChange={onMonthFilterChange}
                        selectSize="sm"
                        className="w-40 text-xs"
                    />
                </div>

                {/* View Toggles on Right */}
                <ViewToggle<SocialView>
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

// Separate header for Account Management section
export function AccountPageHeader({
    view,
    onChangeView,
    onAddAccount
}: {
    view: AccountView;
    onChangeView: (v: AccountView) => void;
    onAddAccount: () => void;
}) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Account Management"
                description="Manage your social media accounts and their content."
                actions={
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onAddAccount}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add Account
                    </Button>
                }
            />

            <div className="flex items-center justify-end">
                <ViewToggle<AccountView>
                    value={view}
                    onChange={onChangeView}
                    options={[
                        { value: "LIST", label: "List View", icon: <List className="w-4 h-4" /> },
                        { value: "BOARD", label: "Board View", icon: <LayoutGrid className="w-4 h-4" /> },
                    ]}
                />
            </div>
        </div>
    );
}
