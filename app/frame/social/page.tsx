"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SocialPageWrapper from "@/components/frame/social/SocialPageWrapper";
import { SocialPost, PostStatus, SocialAccount, Platform } from "@/components/frame/social/types/social.types";
import { getSocialAccounts, saveSocialAccount, deleteSocialAccount, getSocialPosts, saveSocialPost, deleteSocialPost } from "@/lib/api/social";

import SocialSidebar from "@/components/frame/social/SocialSidebar";
import SocialPageHeader, { SocialView, AccountPageHeader, AccountView } from "@/components/frame/social/SocialPageHeader";
import SocialPlannerView from "@/components/frame/social/SocialPlannerView";
import SocialBoardView from "@/components/frame/social/SocialBoardView";
import SocialListView from "@/components/frame/social/SocialListView";
import SocialPostCreator from "@/components/frame/social/SocialPostCreator";
import SocialPostCard from "@/components/frame/social/SocialPostCard";
import AddAccountModal from "@/components/frame/social/AddAccountModal";
import AccountListView from "@/components/frame/social/AccountListView";
import AccountBoardView from "@/components/frame/social/AccountBoardView";
import AccountDetailPage from "@/components/frame/social/AccountDetailPage";
import AccountSettingsPage from "@/components/frame/social/AccountSettingsPage";
import AccountInsightsPage from "@/components/frame/social/AccountInsightsPage";
import DeleteAccountModal from "@/components/frame/social/DeleteAccountModal";
import { SocialTab } from "@/components/frame/social/SocialMobileHeader";
import { Plus, Eye, Trash2 } from "lucide-react";

type Section = "overview" | "accounts" | "account-detail";
type DetailTab = "content" | "settings" | "insights";

// Platform visual constants for mobile Account cards
const PLATFORM_CARD_STYLES: Record<Platform, { bg: string; text: string; code: string; dot: string }> = {
    INSTAGRAM: { bg: "bg-gradient-to-br from-pink-50 to-pink-100/50", text: "text-pink-600", code: "IG", dot: "bg-pink-500" },
    TIKTOK: { bg: "bg-gradient-to-br from-neutral-50 to-neutral-100/50", text: "text-neutral-900", code: "TT", dot: "bg-neutral-800" },
    LINKEDIN: { bg: "bg-gradient-to-br from-blue-50 to-blue-100/50", text: "text-blue-700", code: "IN", dot: "bg-blue-600" },
    YOUTUBE: { bg: "bg-gradient-to-br from-red-50 to-red-100/50", text: "text-red-600", code: "YT", dot: "bg-red-500" },
    FACEBOOK: { bg: "bg-gradient-to-br from-blue-50 to-sky-100/50", text: "text-blue-600", code: "FB", dot: "bg-blue-500" },
};

// Status groupings for the mobile Status tab (kanban-like)
const STATUS_GROUPS = [
    { label: "Backlog", statuses: ["NOT_STARTED", "TODO"] as PostStatus[], color: "bg-neutral-200", dot: "bg-neutral-400" },
    { label: "In Progress", statuses: ["WRITING", "DESIGNING", "IN_REVIEW", "NEED_APPROVAL"] as PostStatus[], color: "bg-orange-200", dot: "bg-orange-500" },
    { label: "Scheduled", statuses: ["APPROVED", "SCHEDULED"] as PostStatus[], color: "bg-blue-200", dot: "bg-blue-500" },
    { label: "Published", statuses: ["PUBLISHED"] as PostStatus[], color: "bg-green-200", dot: "bg-green-500" },
];

export default function FrameSocialPage() {
    const searchParams = useSearchParams();
    const sectionParam = searchParams.get("section") as Section | null;
    const tabParam = searchParams.get("tab") as SocialTab | null;

    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<Section>(sectionParam || "overview");
    const [overviewView, setOverviewView] = useState<SocialView>("BOARD");
    const [accountView, setAccountView] = useState<AccountView>("LIST");
    const [viewingAccount, setViewingAccount] = useState<SocialAccount | undefined>();
    const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("content");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | "ALL">("ALL");
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [creatorDate, setCreatorDate] = useState<string>();
    const [postToEdit, setPostToEdit] = useState<SocialPost | undefined>();
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<SocialAccount | undefined>();
    const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
    const [mobileSortOption, setMobileSortOption] = useState("date-desc");
    const [accountStatusFilter, setAccountStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [accountSort, setAccountSort] = useState("name-asc");
    const [postStatusFilter, setPostStatusFilter] = useState<string>("ALL");
    const [postDeadlineFilter, setPostDeadlineFilter] = useState<string>("ALL");

    // Fetch data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [accs, pts] = await Promise.all([
                getSocialAccounts(),
                getSocialPosts()
            ]);
            setAccounts(accs);
            setPosts(pts);

            // Set initial selected accounts if not set
            if (accs.length > 0 && selectedAccountIds.length === 0) {
                setSelectedAccountIds(accs.map(a => a.id));
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // Sync with URL query params
    useEffect(() => {
        if (sectionParam) {
            setActiveSection(sectionParam);
        } else {
            setActiveSection("overview");
        }
    }, [sectionParam]);

    const handleToggleAccount = (id: string) => {
        if (selectedAccountIds.includes(id)) {
            if (selectedAccountIds.length > 1) {
                setSelectedAccountIds(prev => prev.filter(x => x !== id));
            }
        } else {
            setSelectedAccountIds(prev => [...prev, id]);
        }
    };

    const handleNavigateMonth = (dir: -1 | 1) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + dir);
        setCurrentDate(newDate);
    };

    const handleCreatePost = (dateStr?: string, status: PostStatus = "NOT_STARTED") => {
        setCreatorDate(dateStr || new Date().toISOString().split('T')[0]);
        setPostToEdit(undefined);
        setIsCreatorOpen(true);
    };

    const handleEditPost = (post: SocialPost) => {
        setPostToEdit(post);
        setCreatorDate(undefined);
        setIsCreatorOpen(true);
    };

    const handleAddAccount = () => {
        setAccountToEdit(undefined);
        setIsAddAccountOpen(true);
    };

    const handleEditAccount = (acc: SocialAccount) => {
        setAccountToEdit(acc);
        setIsAddAccountOpen(true);
    };

    const handleDeleteAccount = (id: string) => {
        setDeleteAccountId(id);
    };

    const confirmDeleteAccount = async () => {
        if (deleteAccountId) {
            const success = await deleteSocialAccount(deleteAccountId);
            if (success) {
                setAccounts(prev => prev.filter(a => a.id !== deleteAccountId));
                setSelectedAccountIds(prev => prev.filter(x => x !== deleteAccountId));
                if (viewingAccount?.id === deleteAccountId) {
                    setViewingAccount(undefined);
                    setActiveSection("accounts");
                }
            }
            setDeleteAccountId(null);
        }
    };

    const handleSaveAccount = async (accountData: Partial<SocialAccount>) => {
        const savedAccount = await saveSocialAccount(accountData);
        if (savedAccount) {
            setAccounts(prev => {
                const exists = prev.find(a => a.id === savedAccount.id);
                if (exists) {
                    return prev.map(a => a.id === savedAccount.id ? savedAccount : a);
                }
                return [...prev, savedAccount];
            });
            if (viewingAccount?.id === savedAccount.id) {
                setViewingAccount(prev => prev ? ({ ...prev, ...savedAccount } as SocialAccount) : undefined);
            }
            if (!accountData.id) {
                setSelectedAccountIds((prev: string[]) => [...prev, savedAccount.id]);
            }
        }
    };

    const handleSavePost = async (newPost: Partial<SocialPost>) => {
        const savedPost = await saveSocialPost(newPost);
        if (savedPost) {
            setPosts((prev: SocialPost[]) => {
                const exists = prev.find(p => p.id === savedPost.id);
                if (exists) {
                    return prev.map(p => p.id === savedPost.id ? savedPost : p);
                }
                return [savedPost, ...prev];
            });
        }
    };

    const handleDeletePost = async (postId: string) => {
        const success = await deleteSocialPost(postId);
        if (success) {
            setPosts((prev: SocialPost[]) => prev.filter(p => p.id !== postId));
        }
    };

    const handleViewAccount = (acc: SocialAccount) => {
        setViewingAccount(acc);
        setActiveSection("account-detail");
        setActiveDetailTab("content");
    };

    const handleSectionChange = (section: Section) => {
        setActiveSection(section);
        if (section !== "account-detail") {
            setViewingAccount(undefined);
        }
    };

    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const [overviewMonthFilter, setOverviewMonthFilter] = useState<string>(currentMonthKey);

    const filteredAccounts = useMemo(() => {
        let result = accounts;
        if (selectedPlatform !== "ALL") {
            result = result.filter(a => a.platform === selectedPlatform);
        }
        if (accountStatusFilter !== "all") {
            result = result.filter(a => accountStatusFilter === "active" ? a.isActive !== false : a.isActive === false);
        }
        if (accountSort === "name-asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        else if (accountSort === "name-desc") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
        else if (accountSort === "platform") result = [...result].sort((a, b) => a.platform.localeCompare(b.platform));
        return result;
    }, [accounts, selectedPlatform, accountStatusFilter, accountSort]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        posts.forEach(p => {
            const monthKey = p.scheduledDate.slice(0, 7);
            months.add(monthKey);
        });
        return Array.from(months).sort().reverse();
    }, [posts]);

    const monthOptions = useMemo(() => {
        const options = [{ value: "all", label: "All Months" }];
        availableMonths.forEach(m => {
            const date = new Date(m + "-01");
            const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const isThisMonth = m === currentMonthKey;
            options.push({ value: m, label: isThisMonth ? `${label} (This Month)` : label });
        });
        return options;
    }, [availableMonths, currentMonthKey]);

    const filteredPosts = useMemo(() => {
        let result = posts.filter(p => selectedAccountIds.includes(p.accountId));
        if (selectedPlatform !== "ALL") {
            result = result.filter(p => {
                const acc = accounts.find(a => a.id === p.accountId);
                return acc?.platform === selectedPlatform;
            });
        }
        if (overviewMonthFilter !== "all") {
            result = result.filter(p => p.scheduledDate.startsWith(overviewMonthFilter));
        }
        return result;
    }, [posts, selectedAccountIds, selectedPlatform, accounts, overviewMonthFilter]);

    // Mobile-specific sorted posts
    const mobileSortedPosts = useMemo(() => {
        const sorted = [...filteredPosts];
        if (mobileSortOption === "date-desc") sorted.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
        else if (mobileSortOption === "date-asc") sorted.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        else if (mobileSortOption === "name-asc") sorted.sort((a, b) => a.title.localeCompare(b.title));
        else if (mobileSortOption === "name-desc") sorted.sort((a, b) => b.title.localeCompare(a.title));
        return sorted;
    }, [filteredPosts, mobileSortOption]);

    const existingCodes = accounts.map(a => a.name.slice(0, 3).toUpperCase());
    const deleteAccountName = deleteAccountId ? accounts.find(a => a.id === deleteAccountId)?.name || "" : "";

    // Determine current mobile tab
    const mobileTab: SocialTab = tabParam || "account";

    return (
        <>
            <SocialPageWrapper
                breadcrumbItems={[
                    { label: "Frame" },
                    { label: "Social" },
                    ...(activeSection === "account-detail" && viewingAccount ? [{ label: viewingAccount.name }] : [])
                ]}
                onBack={activeSection === "account-detail" ? () => handleSectionChange("accounts") : undefined}
                hideTabs={activeSection === "account-detail"}
                selectedPlatform={selectedPlatform}
                onPlatformChange={setSelectedPlatform}
                monthFilter={overviewMonthFilter}
                onMonthFilterChange={setOverviewMonthFilter}
                monthOptions={monthOptions}
                selectedSort={mobileSortOption}
                onSortChange={setMobileSortOption}
                accountStatusFilter={accountStatusFilter}
                onAccountStatusFilterChange={setAccountStatusFilter}
                accountSort={accountSort}
                onAccountSortChange={setAccountSort}
                postStatusFilter={postStatusFilter}
                onPostStatusFilterChange={setPostStatusFilter}
                postDeadlineFilter={postDeadlineFilter}
                onPostDeadlineFilterChange={setPostDeadlineFilter}
                onAddPost={() => handleCreatePost()}
                onAddAccount={handleAddAccount}
                accounts={accounts}
                title={activeSection === "account-detail" && viewingAccount ? viewingAccount.name : undefined}
                sidebar={
                    <SocialSidebar
                        accounts={filteredAccounts}
                        selectedPlatform={selectedPlatform}
                        onPlatformChange={setSelectedPlatform}
                        selectedAccountIds={selectedAccountIds}
                        onToggleAccount={handleToggleAccount}
                        activeSection={activeSection}
                        onSectionChange={handleSectionChange}
                        viewingAccount={viewingAccount}
                        activeDetailTab={activeDetailTab}
                        onDetailTabChange={setActiveDetailTab}
                    />
                }
            >
                {/* ============================================================ */}
                {/* MOBILE CONTENT — Tab-based routing (lg:hidden in wrapper)    */}
                {/* ============================================================ */}
                <div className="md:hidden">
                    {activeSection === "account-detail" && viewingAccount ? (
                        <AccountDetailPage
                            account={viewingAccount}
                            allAccounts={accounts}
                            posts={posts}
                            onBack={() => handleSectionChange("accounts")}
                            onEditAccount={() => setActiveDetailTab("settings")}
                            onViewInsights={() => setActiveDetailTab("insights")}
                            onViewSettings={() => setActiveDetailTab("settings")}
                            onEditPost={handleEditPost}
                            onCreatePost={(status) => handleCreatePost(undefined, status)}
                            onNavigateMonth={handleNavigateMonth}
                            currentDate={currentDate}
                            postStatusFilter={postStatusFilter}
                            onPostStatusFilterChange={setPostStatusFilter}
                            postDeadlineFilter={postDeadlineFilter}
                            onPostDeadlineFilterChange={setPostDeadlineFilter}
                            selectedSort={mobileSortOption}
                            onSortChange={setMobileSortOption}
                            onSaveAccount={handleSaveAccount}
                            onDeleteAccount={handleDeleteAccount}
                        />
                    ) : (
                        <>
                            {/* ACCOUNT TAB */}
                            {mobileTab === "account" && (
                                <div className="space-y-3">
                                    {filteredAccounts.length > 0 ? (
                                        filteredAccounts.map(acc => {
                                            const style = PLATFORM_CARD_STYLES[acc.platform];
                                            return (
                                                <div
                                                    key={acc.id}
                                                    onClick={() => handleViewAccount(acc)}
                                                    className="group relative rounded-[24px] p-4 flex gap-4 transition-all duration-300 shadow-sm bg-white border border-neutral-100/80 active:scale-[0.96] cursor-pointer"
                                                >
                                                    {/* Platform Icon */}
                                                    <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${style.bg}`}>
                                                        <span className={`text-[13px] font-extrabold ${style.text}`}>{style.code}</span>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <h3 className="text-[17px] font-bold text-gray-900 leading-tight mb-1">{acc.name}</h3>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${acc.isActive !== false ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
                                                            <span className="text-[12px] font-medium text-gray-400">{acc.handle}</span>
                                                            {acc.isActive === false && (
                                                                <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">Inactive</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Chevron */}
                                                    <div className="flex items-center">
                                                        <svg className="w-5 h-5 text-neutral-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-50 to-orange-100/50 flex items-center justify-center mb-5">
                                                <Plus className="w-8 h-8 text-orange-300" />
                                            </div>
                                            <h3 className="text-[19px] font-bold text-gray-900 mb-2">Connect your first account</h3>
                                            <p className="text-[14px] text-neutral-400 leading-relaxed max-w-[260px] mb-6">
                                                Link your social media accounts to start planning and scheduling content.
                                            </p>
                                            <button
                                                onClick={handleAddAccount}
                                                className="px-6 py-3 bg-orange-500 backdrop-blur-xl backdrop-saturate-[1.5] text-white rounded-full font-bold text-[15px] active:scale-[0.96] transition-all shadow-lg shadow-orange-500/20 border border-white/20 ring-1 ring-inset ring-white/10"
                                            >
                                                + Add Account
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PLAN TAB — Card list of all posts */}
                            {mobileTab === "plan" && (
                                <div className="space-y-3">
                                    {mobileSortedPosts.length > 0 ? (
                                        mobileSortedPosts.map(post => (
                                            <SocialPostCard
                                                key={post.id}
                                                post={post}
                                                account={accounts.find(a => a.id === post.accountId)}
                                                onClick={() => handleEditPost(post)}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                                                <Plus className="w-6 h-6 text-neutral-300" />
                                            </div>
                                            <p className="text-sm text-neutral-400 font-medium">No posts found</p>
                                            <p className="text-xs text-neutral-300 mt-1">Try adjusting your filters or add a new post</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CALENDAR TAB — Reuse SocialPlannerView */}
                            {mobileTab === "calendar" && (
                                <SocialPlannerView
                                    posts={filteredPosts}
                                    accounts={accounts}
                                    currentDate={currentDate}
                                    onNavigateMonth={handleNavigateMonth}
                                    onCreatePost={(date) => handleCreatePost(date)}
                                    onEditPost={handleEditPost}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* ============================================================ */}
                {/* DESKTOP CONTENT — Section-based (hidden on mobile)           */}
                {/* ============================================================ */}
                <div className="hidden md:block">
                    {activeSection === "overview" && (
                        <>
                            <SocialPageHeader
                                view={overviewView}
                                onChangeView={setOverviewView}
                                onAddPost={() => handleCreatePost()}
                                monthFilter={overviewMonthFilter}
                                onMonthFilterChange={setOverviewMonthFilter}
                                monthOptions={monthOptions}
                            />

                            <div className="min-h-[500px]">
                                {overviewView === "CALENDAR" && (
                                    <SocialPlannerView
                                        posts={filteredPosts}
                                        accounts={accounts}
                                        currentDate={currentDate}
                                        onNavigateMonth={handleNavigateMonth}
                                        onCreatePost={(date) => handleCreatePost(date)}
                                        onEditPost={handleEditPost}
                                    />
                                )}
                                {overviewView === "BOARD" && (
                                    <SocialBoardView
                                        posts={filteredPosts}
                                        accounts={accounts}
                                        onEditPost={handleEditPost}
                                        onCreatePost={(status) => handleCreatePost(undefined, status)}
                                    />
                                )}
                                {overviewView === "LIST" && (
                                    <SocialListView
                                        posts={filteredPosts}
                                        accounts={accounts}
                                        onEditPost={handleEditPost}
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {activeSection === "accounts" && (
                        <>
                            <AccountPageHeader
                                view={accountView}
                                onChangeView={setAccountView}
                                onAddAccount={handleAddAccount}
                            />
                            <div className="min-h-[500px]">
                                {accountView === "LIST" && (
                                    <AccountListView
                                        accounts={accounts}
                                        onViewAccount={handleViewAccount}
                                        onEditAccount={handleEditAccount}
                                        onDeleteAccount={handleDeleteAccount}
                                        onAddAccount={handleAddAccount}
                                    />
                                )}
                                {accountView === "BOARD" && (
                                    <AccountBoardView
                                        accounts={accounts}
                                        onViewAccount={handleViewAccount}
                                        onEditAccount={handleEditAccount}
                                        onDeleteAccount={handleDeleteAccount}
                                        onAddAccount={handleAddAccount}
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {activeSection === "account-detail" && viewingAccount && (
                        <AccountDetailPage
                            account={viewingAccount}
                            allAccounts={accounts}
                            posts={posts}
                            onBack={() => setActiveSection("accounts")}
                            onEditAccount={() => setActiveDetailTab("settings")}
                            onViewInsights={() => setActiveDetailTab("insights")}
                            onViewSettings={() => setActiveDetailTab("settings")}
                            onEditPost={handleEditPost}
                            onCreatePost={(status) => handleCreatePost(undefined, status)}
                            onNavigateMonth={handleNavigateMonth}
                            currentDate={currentDate}
                            postStatusFilter={postStatusFilter}
                            onPostStatusFilterChange={setPostStatusFilter}
                            postDeadlineFilter={postDeadlineFilter}
                            onPostDeadlineFilterChange={setPostDeadlineFilter}
                            selectedSort={mobileSortOption}
                            onSortChange={setMobileSortOption}
                        />
                    )}
                </div>
            </SocialPageWrapper>

            <SocialPostCreator
                isOpen={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                initialDate={creatorDate}
                postToEdit={postToEdit}
                accounts={accounts}
                onSave={handleSavePost}
                onDelete={handleDeletePost}
            />

            <AddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => { setIsAddAccountOpen(false); setAccountToEdit(undefined); }}
                onSave={handleSaveAccount}
                accountToEdit={accountToEdit}
                existingCodes={existingCodes}
            />

            <DeleteAccountModal
                isOpen={!!deleteAccountId}
                accountName={deleteAccountName}
                onConfirm={confirmDeleteAccount}
                onCancel={() => setDeleteAccountId(null)}
            />
        </>
    );
}
