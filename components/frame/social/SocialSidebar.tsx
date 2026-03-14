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
                <div className="space-y-0.5">
                    <button
                        onClick={() => onSectionChange("overview")}
                        className={clsx(
                            "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                            activeSection === "overview"
                                ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                                : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                        )}
                    >
                        <LayoutDashboard className={clsx("w-4 h-4 shrink-0 transition-colors", activeSection === "overview" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                        <span className="truncate">Overview</span>
                    </button>

                    <button
                        onClick={() => onSectionChange("accounts")}
                        className={clsx(
                            "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                            activeSection === "accounts"
                                ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                                : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                        )}
                    >
                        <Users className={clsx("w-4 h-4 shrink-0 transition-colors", activeSection === "accounts" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                        <span className="truncate">Account Management</span>
                    </button>
                </div>

                {/* ACCOUNT DETAIL TABS */}
                {isInAccountDetail && viewingAccount && (
                    <>
                        <div className="border-t border-neutral-100" />
                        <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">
                                {viewingAccount.name}
                            </div>
                            <button
                                onClick={() => onDetailTabChange?.("content")}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                    activeDetailTab === "content" 
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" 
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <FileText className={clsx("w-4 h-4 shrink-0 transition-colors", activeDetailTab === "content" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                                <span className="truncate">Content Plan</span>
                            </button>
                            <button
                                onClick={() => onDetailTabChange?.("settings")}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                    activeDetailTab === "settings" 
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" 
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <Settings className={clsx("w-4 h-4 shrink-0 transition-colors", activeDetailTab === "settings" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                                <span className="truncate">Settings</span>
                            </button>
                            <button
                                onClick={() => onDetailTabChange?.("insights")}
                                className={clsx(
                                    "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                    activeDetailTab === "insights" 
                                        ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" 
                                        : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                )}
                            >
                                <BarChart className={clsx("w-4 h-4 shrink-0 transition-colors", activeDetailTab === "insights" ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                                <span className="truncate">Insights</span>
                            </button>
                        </div>
                    </>
                )}

                {/* FILTERS (only in Overview) */}
                {isInOverview && (
                    <>
                        <div className="h-px bg-neutral-200/30 dark:bg-neutral-800/30 my-4" />

                        <div className="space-y-4">
                            <div className="space-y-1.5 px-1">
                                <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest leading-none mb-2">Platform</div>
                                <Select
                                    value={selectedPlatform}
                                    options={PLATFORMS}
                                    onChange={(v) => onPlatformChange(v as Platform | "ALL")}
                                    selectSize="sm"
                                    variant="filled"
                                />
                            </div>

                            <div className="space-y-1.1">
                                <button
                                    onClick={() => setAccountsExpanded(!accountsExpanded)}
                                    className="w-full flex items-center justify-between text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest hover:text-neutral-600 transition-colors px-2 mb-2"
                                >
                                    Accounts
                                    <ChevronDown className={clsx("w-3 h-3 transition-transform opacity-50", accountsExpanded && "rotate-180")} />
                                </button>

                                {accountsExpanded && (
                                    <div className="space-y-0.5 max-h-[200px] overflow-y-auto scrollbar-hide">
                                        {filteredAccounts.map(acc => {
                                            const isChecked = selectedAccountIds.includes(acc.id);
                                            const color = PLATFORM_COLORS[acc.platform] || "bg-neutral-400";

                                            return (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => onToggleAccount(acc.id)}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12px] transition-all",
                                                        isChecked
                                                            ? "bg-neutral-500/10 dark:bg-neutral-400/20 text-neutral-900 dark:text-white font-semibold"
                                                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200"
                                                    )}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
                                                    <span className="truncate flex-1 text-left">{acc.name}</span>
                                                    {isChecked && <span className="text-[10px] text-neutral-400 font-bold ml-auto shrink-0">✓</span>}
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
