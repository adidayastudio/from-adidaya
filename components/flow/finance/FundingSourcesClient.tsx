"use client";

import { useState, useEffect, useCallback } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Plus,
    Landmark,
    X,
    ArrowRightLeft,
    Check,
    ChevronDown,
    Loader2
} from "lucide-react";
import { clsx } from 'clsx';
import { motion } from "framer-motion";
import { FundingSource, BankProvider } from "@/lib/types/finance-types";
import FundingSourceCard from "./modules/FundingSourceCard";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import {
    fetchFundingSources,
    upsertFundingSource,
    deleteFundingSource,
    toggleFundingSourceArchive,
    toggleFundingSourceActive,
    updateFundingSourcePositions
} from "@/lib/client/finance-api";

// --- HELPER TO GET PLACEHOLDER ---
function getBankPlaceholder(provider: string) {
    switch (provider) {
        case "BCA": return "e.g. 1234567890 (10 digits)";
        case "MANDIRI": return "e.g. 1234567890123 (13 digits)";
        case "BRI": return "e.g. 123456789012345 (15 digits)";
        case "BNI": return "e.g. 1234567890 (10 digits)";
        default: return "Account Number";
    }
}

// --- CUSTOM SELECT COMPONENT ---
function CustomSelect({ value, options, onChange, placeholder }: { value: string, options: { value: string, label: string }[], onChange: (val: string) => void, placeholder: string }) {
    const [isOpen, setIsOpen] = useState(false);

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = () => setIsOpen(false);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [isOpen]);

    const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

    return (
        <div className={clsx("relative", isOpen ? "z-50" : "z-0")} onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-6 py-4 bg-white/40 border-0 ring-1 ring-white/60 shadow-inner rounded-full focus:ring-2 focus:ring-red-500/20 focus:bg-white/60 outline-none transition-all font-medium text-neutral-800 flex items-center justify-between group active:scale-[0.99] duration-200"
            >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown className={clsx("w-4 h-4 text-neutral-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            <div className={clsx(
                "absolute top-full left-0 right-0 mt-2 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_16px_32px_rgba(0,0,0,0.1)] border border-white/40 ring-1 ring-black/5 z-50 overflow-hidden transition-all duration-200 origin-top transform",
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            )}>
                <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                            className={clsx(
                                "w-full text-left px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between transition-colors",
                                value === option.value
                                    ? "bg-red-500 text-white shadow-md"
                                    : "text-neutral-700 hover:bg-black/5"
                            )}
                        >
                            {option.label}
                            {value === option.value && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function FundingSourcesClient() {
    const { viewMode, setViewMode, canAccessTeam, isLoading: authLoading, userRole } = useFinance();

    // FORCE TEAM VIEW on mount
    useEffect(() => {
        if (!authLoading && canAccessTeam && viewMode !== "team") {
            setViewMode("team");
        }
    }, [authLoading, canAccessTeam, viewMode, setViewMode]);

    const [sources, setSources] = useState<FundingSource[]>([]);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // DELETE MODAL STATE
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState<FundingSource | null>(null);

    const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

    const [editingSource, setEditingSource] = useState<FundingSource | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "BANK",
        provider: "MANDIRI",
        balance: "",
        account_number: "",
    });

    // Load Data
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                const data = await fetchFundingSources(wsId);
                setSources(data);
            }
        } catch (error) {
            console.error("Failed to load funding sources", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);


    // Filter sources based on tab
    const filteredSources = sources.filter(s => {
        if (activeTab === "ACTIVE") return !s.is_archived;
        return s.is_archived;
    });

    const activeCount = sources.filter(s => !s.is_archived).length;
    const archivedCount = sources.filter(s => s.is_archived).length;

    if (isLoading) {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
                header={<FinanceHeader title="Funding Sources" subtitle="Loading..." />}
            >
                <div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />
            </FinancePageWrapper>
        );
    }

    // Team-only page - show message for personal view
    if (!canAccessTeam || viewMode === "personal") {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
                header={<FinanceHeader title="Funding Sources" subtitle="Manage payment sources." hideToggle />}
            >
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-neutral-200">
                    <Landmark className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-neutral-900 font-medium text-lg mb-2">Funding Sources are Team Assets</h3>
                    <p className="text-neutral-500 max-w-md mx-auto mb-8">
                        This module is available in Team View only.
                    </p>

                    {/* Logic: If they CAN access team but are in personal mode, show button to switch */}
                    {canAccessTeam ? (
                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={() => setViewMode("team")}
                                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Switch to Team View
                            </button>
                            <p className="text-xs text-neutral-400">
                                You are signed in as <strong className="text-neutral-600">{userRole}</strong> (Authorized)
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-xs text-neutral-400 max-w-md mx-auto">
                                Your current detected role is <strong className="text-neutral-600">{(authLoading ? "loading..." : (userRole || "unknown"))}</strong>.
                                To access this page, you need one of: Superadmin, Admin, Finance, or Management.
                            </p>
                            <div className="p-3 bg-neutral-50 rounded text-[10px] text-neutral-400 font-mono inline-block text-left">
                                DEBUG INFO:<br />
                                View: {viewMode}<br />
                                Allowed: {canAccessTeam ? "YES" : "NO"}
                            </div>
                        </div>
                    )}
                </div>
            </FinancePageWrapper>
        );
    }

    const handleToggle = async (id: string) => {
        const source = sources.find(s => s.id === id);
        if (!source) return;

        const newStatus = !source.is_active;

        // Optimistic Update
        setSources(prev => prev.map(s => s.id === id ? { ...s, is_active: newStatus } : s));

        try {
            await toggleFundingSourceActive(id, newStatus);
        } catch (error) {
            console.error("Failed to toggle status", error);
            // Revert on error
            setSources(prev => prev.map(s => s.id === id ? { ...s, is_active: !newStatus } : s));
        }
    };



    const handleEdit = (id: string) => {
        const source = sources.find(s => s.id === id);
        if (source) {
            setEditingSource(source);
            setFormData({
                name: source.name,
                type: source.type,
                provider: source.provider || "MANDIRI",
                balance: source.balance?.toString() || "",
                account_number: source.account_number || "",
            });
            setShowAddModal(true);
        }
    };

    const handleArchive = async (id: string) => {
        const source = sources.find(s => s.id === id);
        if (!source) return;

        const newArchived = !source.is_archived;

        // Optimistic
        setSources(prev => prev.map(s => s.id === id ? { ...s, is_archived: newArchived } : s));

        try {
            await toggleFundingSourceArchive(id, newArchived);
        } catch (error) {
            console.error("Failed to archive", error);
            loadData(); // Reload to be safe
        }
    };

    // START DELETE LOGIC
    const triggerDelete = (id: string) => {
        const source = sources.find(s => s.id === id);
        if (source) {
            setSourceToDelete(source);
            setShowDeleteModal(true);
        }
    };

    const confirmDelete = async () => {
        if (!sourceToDelete) return;
        const id = sourceToDelete.id;

        // Optimistic
        const previous = [...sources];
        setSources(prev => prev.filter(s => s.id !== id));
        setShowDeleteModal(false);
        setSourceToDelete(null);

        try {
            const success = await deleteFundingSource(id);
            if (!success) throw new Error("Delete failed");
        } catch (error: any) {
            console.error("Failed to delete", error);
            setSources(previous);
            alert(`Failed to delete funding source: ${error.message}`);
        }
    };
    // END DELETE LOGIC

    const handleMoveSource = async (id: string, direction: "up" | "down") => {
        // Need to find the item in the *filtered* list to know who to swap with visually
        const currentIndex = filteredSources.findIndex(s => s.id === id);
        if (currentIndex === -1) return;

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= filteredSources.length) return;

        const targetSource = filteredSources[targetIndex];

        // Now find them in the global list to swap and update positions
        const sourceIndexMain = sources.findIndex(s => s.id === id);
        const targetIndexMain = sources.findIndex(s => s.id === targetSource.id);

        if (sourceIndexMain === -1 || targetIndexMain === -1) return;

        const newSources = [...sources];

        // Swap their positions in the object
        const pos1 = newSources[sourceIndexMain].position || 0;
        const pos2 = newSources[targetIndexMain].position || 0;

        // Actually, better to just swap the OBJECTS in the array + swap their position values to persist.

        newSources[sourceIndexMain] = { ...newSources[sourceIndexMain], position: pos2 };
        newSources[targetIndexMain] = { ...newSources[targetIndexMain], position: pos1 };

        // Also swap them in the array so the UI updates immediately based on array order
        // (Since filteredSources is derived from source order)
        [newSources[sourceIndexMain], newSources[targetIndexMain]] = [newSources[targetIndexMain], newSources[sourceIndexMain]];

        setSources(newSources);

        try {
            await updateFundingSourcePositions([
                { id: newSources[sourceIndexMain].id, position: newSources[sourceIndexMain].position! },
                { id: newSources[targetIndexMain].id, position: newSources[targetIndexMain].position! }
            ]);
        } catch (error) {
            console.error("Failed to update positions", error);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !workspaceId) return;

        // Auto-generate account number if missing
        let finalAccountNumber = formData.account_number;
        if (!finalAccountNumber) {
            if (formData.type === "BANK") {
                // Generate based on common length (random for now)
                finalAccountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            } else {
                // Auto generate 8000...
                const suffix = Math.floor(1000 + Math.random() * 9000).toString();
                finalAccountNumber = `80008000${suffix}`;
            }
        }

        const newPosition = sources.length > 0 ? (Math.max(...sources.map(s => s.position || 0)) + 1) : 0;

        const payload: any = {
            id: editingSource ? editingSource.id : undefined,
            workspace_id: workspaceId,
            name: formData.name,
            type: formData.type as any,
            provider: formData.type === "BANK" ? formData.provider as any : undefined,
            currency: "IDR",
            balance: parseFloat(formData.balance) || 0,
            account_number: finalAccountNumber,
            position: editingSource ? editingSource.position : newPosition,
            is_active: editingSource ? editingSource.is_active : true,
        };

        try {
            const saved = await upsertFundingSource(payload);
            if (saved) {
                if (editingSource) {
                    setSources(prev => prev.map(s => s.id === saved.id ? saved : s));
                } else {
                    setSources(prev => [...prev, saved]);
                }
                closeModal();
            }
        } catch (error: any) {
            console.error("Failed to save", error);
            alert(`Failed to save funding source: ${error.message || "Unknown error"}`);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingSource(null);
        setFormData({ name: "", type: "BANK", provider: "MANDIRI", balance: "", account_number: "" });
    };

    const addButton = (
        <button
            onClick={() => {
                setEditingSource(null);
                setFormData({ name: "", type: "BANK", provider: "MANDIRI", balance: "", account_number: "" });
                setShowAddModal(true);
            }}
            className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2"
        >
            <Plus className="w-4 h-4" />
            New Source
        </button>
    );

    if (isLoading && sources.length === 0) {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
                header={<FinanceHeader title="Funding Sources" subtitle="Manage payment sources for all projects." hideToggle />}
            >
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
            </FinancePageWrapper>
        );
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
            header={<FinanceHeader title="Funding Sources" subtitle="Manage payment sources for all projects." hideToggle action={addButton} />}
        >
            {/* TABS - ANIMATED SWITCHER */}
            <div className="flex items-center p-1 bg-neutral-100/80 rounded-full w-fit mb-6 ml-1 border border-neutral-200/50">
                {["ACTIVE", "ARCHIVED"].map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className="relative px-6 py-2 rounded-full text-xs font-medium transition-colors duration-200 outline-none"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className={clsx("relative z-10", isActive ? "text-neutral-800" : "text-neutral-400 hover:text-neutral-600")}>
                                {tab === "ACTIVE" ? `Active (${activeCount})` : `Archived (${archivedCount})`}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* SOURCES GRID */}
            {filteredSources.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-neutral-100 rounded-3xl">
                    <p className="text-neutral-400 text-sm">No {activeTab.toLowerCase()} funding sources found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                    {filteredSources.map((source, index) => (
                        <FundingSourceCard
                            key={source.id}
                            source={source}
                            isFirst={index === 0}
                            isLast={index === filteredSources.length - 1}
                            onToggle={handleToggle}
                            onEdit={handleEdit}
                            onArchive={handleArchive}
                            onDelete={triggerDelete}
                            onMoveUp={() => handleMoveSource(source.id, "up")}
                            onMoveDown={() => handleMoveSource(source.id, "down")}
                        />
                    ))}
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && sourceToDelete && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[110] p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white/80 backdrop-blur-[50px] rounded-[32px] w-full max-w-sm shadow-[0_32px_64px_rgba(0,0,0,0.2)] p-8 transform transition-all scale-100 border border-white/60 ring-1 ring-white/60 relative overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Highlights */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none" />

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                                <Landmark className="w-8 h-8 text-red-600" />
                            </div>

                            <h3 className="text-xl font-bold text-neutral-900 mb-2">Delete Funding Source</h3>
                            <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
                                Are you sure you want to delete <strong className="text-neutral-800">{sourceToDelete.name}</strong>?
                                <br />This action cannot be undone.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-3 border-0 ring-1 ring-black/5 bg-white/40 hover:bg-white/60 rounded-full text-xs font-bold text-neutral-600 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold shadow-[0_8px_16px_rgba(220,38,38,0.25)] active:scale-95 transition-all"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD/EDIT MODAL - LIQUID GLASS 26 STYLE */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={closeModal}>
                    <div className="bg-white/70 backdrop-blur-[40px] rounded-[40px] w-full max-w-md shadow-[0_32px_64px_rgba(0,0,0,0.2)] p-8 transform transition-all scale-100 border border-white/40 ring-1 ring-white/60 relative overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Highlights for liquid feel */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">
                                    {editingSource ? "Edit Source" : "New Source"}
                                </h3>
                                <p className="text-neutral-500 font-medium text-xs mt-1">
                                    {editingSource ? "Update funding source details." : "Add a new payment source."}
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-2.5 hover:bg-black/5 rounded-full transition-colors group">
                                <X className="w-5 h-5 text-neutral-400 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>

                        <div className="space-y-6 mb-10 relative z-20">
                            {/* NAME */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">Source Name</label>
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 bg-white/40 border-0 ring-1 ring-white/60 shadow-inner rounded-full focus:ring-2 focus:ring-red-500/20 focus:bg-white/60 outline-none transition-all font-medium text-neutral-800 placeholder:text-neutral-400"
                                    placeholder="e.g. Bank Mandiri Ops"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* TYPE - CUSTOM SELECT */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">Type</label>
                                <CustomSelect
                                    value={formData.type}
                                    options={[
                                        { value: "BANK", label: "Bank Account" },
                                        { value: "PETTY_CASH", label: "Petty Cash" },
                                        { value: "REIMBURSE", label: "Reimburse Pool" },
                                        { value: "CASH", label: "Cash on Hand" }
                                    ]}
                                    onChange={(val) => setFormData({ ...formData, type: val as any })}
                                    placeholder="Select Type"
                                />
                            </div>

                            {/* PROVIDER - CUSTOM SELECT (if BANK) */}
                            {formData.type === "BANK" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">Bank Provider</label>
                                    <CustomSelect
                                        value={formData.provider}
                                        options={[
                                            { value: "MANDIRI", label: "Bank Mandiri" },
                                            { value: "BCA", label: "Bank BCA" },
                                            { value: "BRI", label: "Bank BRI" },
                                            { value: "BNI", label: "Bank BNI" },
                                            { value: "BSI", label: "Bank BSI" },
                                            { value: "BLU", label: "Blu by BCA" },
                                            { value: "JAGO", label: "Bank Jago" },
                                            { value: "JENIUS", label: "Jenius BTPN" },
                                            { value: "CIMB", label: "CIMB Niaga" },
                                            { value: "DANAMON", label: "Danamon" },
                                            { value: "PERMATA", label: "Permata Bank" },
                                        ]}
                                        onChange={(val) => setFormData({ ...formData, provider: val as any })}
                                        placeholder="Select Provider"
                                    />
                                </div>
                            )}

                            {/* ACCOUNT NUMBER (BANK ONLY) */}
                            {formData.type === "BANK" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">Account Number (Optional)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full px-6 py-4 bg-white/40 border-0 ring-1 ring-white/60 shadow-inner rounded-full focus:ring-2 focus:ring-red-500/20 focus:bg-white/60 outline-none transition-all font-medium text-neutral-800 placeholder:text-neutral-400 font-mono tracking-wide"
                                        placeholder={getBankPlaceholder(formData.provider)}
                                        value={formData.account_number}
                                        onChange={e => {
                                            // Only allow numbers
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setFormData({ ...formData, account_number: val });
                                        }}
                                    />
                                    <p className="text-[10px] text-neutral-400 px-3">
                                        {formData.provider === "BCA" && "10 digits"}
                                        {formData.provider === "MANDIRI" && "13 digits"}
                                        {formData.provider === "BRI" && "15 digits"}
                                        {formData.provider === "BNI" && "10 digits"}
                                        {formData.provider === "CIMB" && "13 digits"}
                                        {!["BCA", "MANDIRI", "BRI", "BNI", "CIMB"].includes(formData.provider) && "Enter valid account number"}
                                        {" • Leave empty to auto-generate"}
                                    </p>
                                </div>
                            )}

                            {/* BALANCE - FORMATTED INPUT */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">Current Balance (IDR)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full px-6 py-4 bg-white/40 border-0 ring-1 ring-white/60 shadow-inner rounded-full focus:ring-2 focus:ring-red-500/20 focus:bg-white/60 outline-none transition-all font-medium text-neutral-800 placeholder:text-neutral-400 font-mono tracking-wide"
                                    placeholder="0"
                                    value={formData.balance ? Number(formData.balance).toLocaleString('id-ID') : ""}
                                    onChange={e => {
                                        const raw = e.target.value.replace(/\./g, "");
                                        if (!isNaN(Number(raw))) {
                                            setFormData({ ...formData, balance: raw });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2 relative z-10">
                            <button onClick={closeModal} className="flex-1 px-6 py-4 border-0 ring-1 ring-black/5 bg-white/30 hover:bg-white/50 rounded-full text-xs font-bold text-neutral-600 transition-all">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.name}
                                className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_8px_16px_rgba(220,38,38,0.25)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <span className="capitalize">{editingSource ? "Save Changes" : "Create Source"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FinancePageWrapper>
    );
}


