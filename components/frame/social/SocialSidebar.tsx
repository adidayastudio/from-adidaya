"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, LayoutDashboard, Users, FileText, Settings, BarChart, Plus, UserPlus } from "lucide-react";
import { SocialAccount, Platform } from "./types/social.types";
import { Select } from "@/shared/ui/primitives/select/select";
import type { LucideIcon } from "lucide-react";

type Section = "overview" | "accounts" | "account-detail";
type DetailTab = "content" | "settings" | "insights";

type Props = {
    accounts: SocialAccount[];
    selectedPlatform: Platform | "ALL";
    onPlatformChange: (p: Platform | "ALL") => void;
    selectedAccountIds: string[];
    onToggleAccount: (id: string) => void;
    activeSection: Section;
    onSectionChange: (section: Section) => void;
    viewingAccount?: SocialAccount;
    activeDetailTab?: DetailTab;
    onDetailTabChange?: (tab: DetailTab) => void;
};

const PLATFORMS: { value: Platform | "ALL"; label: string }[] = [
    { value: "ALL", label: "All Platforms" },
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

const PLATFORM_COLORS: Record<string, string> = {
    INSTAGRAM: "bg-pink-500",
    TIKTOK: "bg-neutral-800",
    LINKEDIN: "bg-blue-600",
    YOUTUBE: "bg-red-500",
    FACEBOOK: "bg-blue-500"
};

interface NavItemConfig {
    id: Section;
    label: string;
    icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "accounts", label: "Accounts", icon: Users },
];

export default function SocialSidebar({
    accounts,
    selectedPlatform,
    onPlatformChange,
    selectedAccountIds,
    onToggleAccount,
    activeSection,
    onSectionChange,
    viewingAccount,
    activeDetailTab = "content",
    onDetailTabChange
}: Props) {
    const [accountsExpanded, setAccountsExpanded] = useState(true);

    const filteredAccounts = selectedPlatform === "ALL"
        ? accounts
        : accounts.filter(a => a.platform === selectedPlatform);

    const isInOverview = activeSection === "overview";
    const isInAccountDetail = activeSection === "account-detail";

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <aside className="w-full h-full hidden lg:block">

                {/* NAVIGATION */}
                <div className="space-y-1">
                    <button
                        onClick={() => onSectionChange("overview")}
                        className={clsx(
                            "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                            activeSection === "overview"
                                ? "text-orange-600 bg-orange-50"
                                : "text-neutral-600 hover:bg-neutral-50"
                        )}
                    >
                        <span className={clsx("transition-colors", activeSection === "overview" ? "text-orange-600" : "text-neutral-400")}>
                            <LayoutDashboard className="w-4 h-4" />
                        </span>
                        <span>Overview</span>
                    </button>

                    <button
                        onClick={() => onSectionChange("accounts")}
                        className={clsx(
                            "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                            activeSection === "accounts"
                                ? "text-orange-600 bg-orange-50"
                                : "text-neutral-600 hover:bg-neutral-50"
                        )}
                    >
                        <span className={clsx("transition-colors", activeSection === "accounts" ? "text-orange-600" : "text-neutral-400")}>
                            <Users className="w-4 h-4" />
                        </span>
                        <span>Account Management</span>
                    </button>
                </div>

                {/* ACCOUNT DETAIL TABS */}
                {isInAccountDetail && viewingAccount && (
                    <>
                        <div className="border-t border-neutral-100" />
                        <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">
                                {viewingAccount.name}
                            </div>
                            <button
                                onClick={() => onDetailTabChange?.("content")}
                                className={clsx(
                                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                                    activeDetailTab === "content" ? "text-orange-600 bg-orange-50" : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                <span className={clsx("transition-colors", activeDetailTab === "content" ? "text-orange-600" : "text-neutral-400")}>
                                    <FileText className="w-4 h-4" />
                                </span>
                                <span>Content Plan</span>
                            </button>
                            <button
                                onClick={() => onDetailTabChange?.("settings")}
                                className={clsx(
                                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                                    activeDetailTab === "settings" ? "text-orange-600 bg-orange-50" : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                <span className={clsx("transition-colors", activeDetailTab === "settings" ? "text-orange-600" : "text-neutral-400")}>
                                    <Settings className="w-4 h-4" />
                                </span>
                                <span>Settings</span>
                            </button>
                            <button
                                onClick={() => onDetailTabChange?.("insights")}
                                className={clsx(
                                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                                    activeDetailTab === "insights" ? "text-orange-600 bg-orange-50" : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                <span className={clsx("transition-colors", activeDetailTab === "insights" ? "text-orange-600" : "text-neutral-400")}>
                                    <BarChart className="w-4 h-4" />
                                </span>
                                <span>Insights</span>
                            </button>
                        </div>
                    </>
                )}

                {/* FILTERS (only in Overview) */}
                {isInOverview && (
                    <>
                        <div className="border-t border-neutral-100" />

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Platform</div>
                                <Select
                                    value={selectedPlatform}
                                    options={PLATFORMS}
                                    onChange={(v) => onPlatformChange(v as Platform | "ALL")}
                                    selectSize="sm"
                                    variant="filled"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <button
                                    onClick={() => setAccountsExpanded(!accountsExpanded)}
                                    className="w-full flex items-center justify-between text-[10px] font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 transition-colors"
                                >
                                    Accounts
                                    <ChevronDown className={clsx("w-3 h-3 transition-transform", accountsExpanded && "rotate-180")} />
                                </button>

                                {accountsExpanded && (
                                    <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                                        {filteredAccounts.map(acc => {
                                            const isChecked = selectedAccountIds.includes(acc.id);
                                            const color = PLATFORM_COLORS[acc.platform] || "bg-neutral-400";

                                            return (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => onToggleAccount(acc.id)}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                                                        isChecked
                                                            ? "bg-neutral-100 text-neutral-900"
                                                            : "text-neutral-500 hover:bg-neutral-50"
                                                    )}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
                                                    <span className="font-medium truncate">{acc.name}</span>
                                                    {isChecked && <span className="text-[9px] text-neutral-400 ml-auto">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </aside>

            {/* MOBILE FLOATING TAB BAR - Compact & Centered */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 lg:hidden safe-area-bottom">

                {/* 1. Main Nav Bar (Compact Pill) */}
                <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-4 py-1.5 flex items-center justify-center gap-4">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSectionChange(item.id)}
                            className={clsx(
                                "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                                activeSection === item.id
                                    ? "bg-orange-50 text-orange-600"
                                    : "text-neutral-400"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5", activeSection === item.id && "stroke-2")} />
                        </button>
                    ))}
                </div>

                {/* 2. Conditional FAB */}
                {/* OVERVIEW: Add Post */}
                {activeSection === "overview" && (
                    <button
                        onClick={() => console.log("Add Post Clicked")}
                        className="w-12 h-12 flex items-center justify-center rounded-full shadow-lg bg-orange-500 text-white transition-transform active:scale-95 flex-shrink-0 animate-in fade-in zoom-in duration-300"
                        style={{ backgroundColor: '#F97316' }} // Force Orange
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                )}

                {/* ACCOUNTS: Add Account */}
                {activeSection === "accounts" && (
                    <button
                        onClick={() => console.log("Add Account Clicked")}
                        className="w-12 h-12 flex items-center justify-center rounded-full shadow-lg bg-orange-500 text-white transition-transform active:scale-95 flex-shrink-0 animate-in fade-in zoom-in duration-300"
                        style={{ backgroundColor: '#F97316' }} // Force Orange
                    >
                        <UserPlus className="w-6 h-6" />
                    </button>
                )}
            </div>
        </>
    );
}
