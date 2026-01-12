"use client";

import { useMemo, useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { SocialPost, PostStatus, SocialAccount, Platform } from "@/components/frame/social/types/social.types";
import { MOCK_POSTS, MOCK_ACCOUNTS } from "@/components/frame/social/data/mock-posts";

import SocialSidebar from "@/components/frame/social/SocialSidebar";
import SocialPageHeader, { SocialView, AccountPageHeader, AccountView } from "@/components/frame/social/SocialPageHeader";
import SocialPlannerView from "@/components/frame/social/SocialPlannerView";
import SocialBoardView from "@/components/frame/social/SocialBoardView";
import SocialListView from "@/components/frame/social/SocialListView";
import SocialPostCreator from "@/components/frame/social/SocialPostCreator";
import AddAccountModal from "@/components/frame/social/AddAccountModal";
import AccountListView from "@/components/frame/social/AccountListView";
import AccountBoardView from "@/components/frame/social/AccountBoardView";
import AccountDetailPage from "@/components/frame/social/AccountDetailPage";
import AccountSettingsPage from "@/components/frame/social/AccountSettingsPage";
import AccountInsightsPage from "@/components/frame/social/AccountInsightsPage";
import DeleteAccountModal from "@/components/frame/social/DeleteAccountModal";

type Section = "overview" | "accounts" | "account-detail";
type DetailTab = "content" | "settings" | "insights";

export default function FrameSocialPage() {

    // STATE
    const [posts, setPosts] = useState<SocialPost[]>(MOCK_POSTS);
    const [accounts, setAccounts] = useState<SocialAccount[]>(MOCK_ACCOUNTS);

    // SECTION & VIEW
    const [activeSection, setActiveSection] = useState<Section>("overview");
    const [overviewView, setOverviewView] = useState<SocialView>("BOARD");
    const [accountView, setAccountView] = useState<AccountView>("LIST");
    const [viewingAccount, setViewingAccount] = useState<SocialAccount | undefined>();
    const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("content");

    // FILTERS
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | "ALL">("ALL");
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(MOCK_ACCOUNTS.map(a => a.id));

    const [currentDate, setCurrentDate] = useState(new Date());

    // MODALS
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [creatorDate, setCreatorDate] = useState<string>();
    const [postToEdit, setPostToEdit] = useState<SocialPost | undefined>();
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<SocialAccount | undefined>();
    const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

    // HANDLERS
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

    const handleSavePost = (newPost: SocialPost) => {
        setPosts(prev => {
            const exists = prev.find(p => p.id === newPost.id);
            if (exists) {
                return prev.map(p => p.id === newPost.id ? newPost : p);
            }
            return [...prev, newPost];
        });
    };

    const handleDeletePost = (postId: string) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    // ACCOUNT
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

    const confirmDeleteAccount = () => {
        if (deleteAccountId) {
            setAccounts(prev => prev.filter(a => a.id !== deleteAccountId));
            setSelectedAccountIds(prev => prev.filter(x => x !== deleteAccountId));
            if (viewingAccount?.id === deleteAccountId) {
                setViewingAccount(undefined);
                setActiveSection("accounts");
            }
            setDeleteAccountId(null);
        }
    };

    const handleSaveAccount = (accountData: Omit<SocialAccount, "id"> & { id?: string }) => {
        if (accountData.id) {
            setAccounts(prev => prev.map(a => a.id === accountData.id ? { ...a, ...accountData } as SocialAccount : a));
            if (viewingAccount?.id === accountData.id) {
                setViewingAccount({ ...viewingAccount, ...accountData } as SocialAccount);
            }
        } else {
            const newAccount: SocialAccount = {
                ...accountData,
                id: `acc-${Date.now()}`
            };
            setAccounts(prev => [...prev, newAccount]);
            setSelectedAccountIds(prev => [...prev, newAccount.id]);
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

    // CURRENT MONTH KEY
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // MONTH FILTER for Overview
    const [overviewMonthFilter, setOverviewMonthFilter] = useState<string>(currentMonthKey);

    // FILTERING
    const filteredAccounts = useMemo(() => {
        if (selectedPlatform === "ALL") return accounts;
        return accounts.filter(a => a.platform === selectedPlatform);
    }, [accounts, selectedPlatform]);

    // Get available months from posts
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

        // Apply month filter (only for Overview)
        if (overviewMonthFilter !== "all") {
            result = result.filter(p => p.scheduledDate.startsWith(overviewMonthFilter));
        }

        return result;
    }, [posts, selectedAccountIds, selectedPlatform, accounts, overviewMonthFilter]);

    const existingCodes = accounts.map(a => a.name.slice(0, 3).toUpperCase());
    const deleteAccountName = deleteAccountId ? accounts.find(a => a.id === deleteAccountId)?.name || "" : "";

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb
                items={[
                    { label: "Frame" },
                    { label: "Social" },
                    ...(activeSection === "account-detail" && viewingAccount ? [{ label: viewingAccount.name }] : [])
                ]}
            />

            <PageWrapper
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
                <div className="space-y-6">

                    {/* OVERVIEW */}
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

                    {/* ACCOUNT MANAGEMENT */}
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

                    {/* ACCOUNT DETAIL */}
                    {activeSection === "account-detail" && viewingAccount && (
                        <>
                            {activeDetailTab === "content" && (
                                <AccountDetailPage
                                    account={viewingAccount}
                                    allAccounts={accounts}
                                    posts={posts}
                                    onBack={() => setActiveSection("accounts")}
                                    onEditAccount={() => setActiveDetailTab("settings")}
                                    onEditPost={handleEditPost}
                                    onCreatePost={(status) => handleCreatePost(undefined, status)}
                                    onNavigateMonth={handleNavigateMonth}
                                    currentDate={currentDate}
                                />
                            )}

                            {activeDetailTab === "settings" && (
                                <AccountSettingsPage
                                    account={viewingAccount}
                                    onSave={(data) => {
                                        handleSaveAccount({ ...viewingAccount, ...data });
                                        setActiveDetailTab("content");
                                    }}
                                    onBack={() => setActiveDetailTab("content")}
                                />
                            )}

                            {activeDetailTab === "insights" && (
                                <AccountInsightsPage
                                    account={viewingAccount}
                                    posts={posts}
                                    onBack={() => setActiveDetailTab("content")}
                                />
                            )}
                        </>
                    )}
                </div>
            </PageWrapper>

            {/* POST CREATOR */}
            <SocialPostCreator
                isOpen={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                initialDate={creatorDate}
                postToEdit={postToEdit}
                accounts={accounts}
                onSave={handleSavePost}
                onDelete={handleDeletePost}
            />

            {/* ADD/EDIT ACCOUNT */}
            <AddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => { setIsAddAccountOpen(false); setAccountToEdit(undefined); }}
                onSave={handleSaveAccount}
                accountToEdit={accountToEdit}
                existingCodes={existingCodes}
            />

            {/* DELETE CONFIRMATION */}
            <DeleteAccountModal
                isOpen={!!deleteAccountId}
                accountName={deleteAccountName}
                onConfirm={confirmDeleteAccount}
                onCancel={() => setDeleteAccountId(null)}
            />
        </div>
    );
}
