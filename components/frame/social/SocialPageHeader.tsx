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
        <div className="space-y-6">
            <div className="hidden lg:block mb-0">
                <div className="flex items-center justify-between gap-4 pt-0">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                            Social Media Planner
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Plan, schedule, and manage content across all your accounts.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            className="rounded-full h-9 px-4 text-[11px] font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95"
                            onClick={onAddPost}
                            icon={<Plus className="w-4 h-4" />}
                        >
                            Add Post
                        </Button>
                    </div>
                </div>
                <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
            </div>

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
        <div className="space-y-6">
            <div className="hidden lg:block mb-0">
                <div className="flex items-center justify-between gap-4 pt-0">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                            Account Management
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Manage your social media accounts and their content.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            className="rounded-full h-9 px-4 text-[11px] font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95"
                            onClick={onAddAccount}
                            icon={<Plus className="w-4 h-4" />}
                        >
                            Add Account
                        </Button>
                    </div>
                </div>
                <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
            </div>

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
