"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import clsx from "clsx";
import { Plus, Search, ChevronDown, ChevronUp, Edit2, Trash2, Filter, List, LayoutGrid, ArrowUpDown, X, Download, Loader2, Users } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import {
    fetchCrewMembers,
    fetchCrewStats,
    createCrewMember,
    updateCrewMember,
    deleteCrewMember,
    CrewMember,
    CrewRole,
    CrewStatus,
    CREW_ROLE_LABELS,
    CREW_ROLE_OPTIONS,
    SKILLED_ROLES,
} from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { generateSmartInitials } from "@/lib/initials";

interface CrewDirectoryProps {
    role?: string;
    onViewDetail?: (crewId: string) => void;
    triggerOpen?: number;
}

type ViewMode = "list" | "board";
type FilterCard = "ALL" | "ACTIVE" | "SKILLED" | "UNSKILLED";

// UI mapped type (simpler than full CrewMember)
interface CrewListItem {
    id: string;
    name: string;
    initials: string;
    role: CrewRole;
    status: CrewStatus;
    skillTags: string[];
    projectCode?: string;
    baseDailyRate?: number;
    overtimeDailyRate?: number;
    otRate1?: number;
    otRate2?: number;
    otRate3?: number;
}

const ROLE_COLORS: Record<CrewRole, string> = {
    FOREMAN: "bg-purple-100 text-purple-700",
    LEADER: "bg-indigo-100 text-indigo-700",
    SKILLED: "bg-blue-100 text-blue-700",
    HELPER: "bg-neutral-100 text-neutral-700",
    OPERATOR: "bg-amber-100 text-amber-700",
    GENERAL: "bg-neutral-100 text-neutral-700"
};

export function CrewDirectory({ role, onViewDetail, triggerOpen }: CrewDirectoryProps) {
    // Data state
    const [crewList, setCrewList] = useState<CrewListItem[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [stats, setStats] = useState({ total: 0, active: 0, skilled: 0, unskilled: 0 });
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filter & UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoles, setSelectedRoles] = useState<CrewRole[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<CrewStatus[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [activeCard, setActiveCard] = useState<FilterCard>("ALL");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [sortBy, setSortBy] = useState<"name" | "role" | "status" | "project">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [showFilterPopup, setShowFilterPopup] = useState(false);

    // Drawer state
    const [showAddDrawer, setShowAddDrawer] = useState(false);
    const [showEditDrawer, setShowEditDrawer] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedCrew, setSelectedCrew] = useState<CrewListItem | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formInitials, setFormInitials] = useState("");
    const [formRole, setFormRole] = useState<CrewRole>("SKILLED");
    const [formStatus, setFormStatus] = useState<CrewStatus>("ACTIVE");
    const [formSkills, setFormSkills] = useState("");

    const [formProject, setFormProject] = useState("");

    // Rate State
    const [formBaseRate, setFormBaseRate] = useState("0");
    const [formOvertimeRate, setFormOvertimeRate] = useState("0");
    const [formOtRate1, setFormOtRate1] = useState("0");
    const [formOtRate2, setFormOtRate2] = useState("0");
    const [formOtRate3, setFormOtRate3] = useState("0");

    // Helper to format project code (get 3 letters after dash)
    const formatProjectCode = (code?: string) => {
        if (!code) return "-";
        const parts = code.split("-");
        return parts.length > 1 ? parts[1] : code;
    };

    // Get unique project codes from crew list
    const uniqueProjects = useMemo(() => {
        const codes = crewList.map(c => c.projectCode).filter(Boolean) as string[];
        return [...new Set(codes)];
    }, [crewList]);

    // Load data from database
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();

            const [members, statsData, projectsData] = await Promise.all([
                fetchCrewMembers(wsId || undefined),
                fetchCrewStats(wsId || undefined),
                wsId ? fetchProjectsByWorkspace(wsId) : Promise.resolve([])
            ]);

            if (projectsData.length > 0) {
                setProjects(projectsData.map((p: any) => ({
                    code: `${p.project_number}-${p.project_code}`,
                    name: p.project_name
                })));
            }

            const mappedCrew: CrewListItem[] = members.map(m => ({
                id: m.id,
                name: m.name,
                initials: m.initials,
                role: m.role,
                status: m.status,
                skillTags: m.skillTags,
                projectCode: m.currentProjectCode,
                baseDailyRate: m.baseDailyRate,
                overtimeDailyRate: m.overtimeDailyRate,
                otRate1: m.otRate1,
                otRate2: m.otRate2,
                otRate3: m.otRate3
            }));

            setCrewList(mappedCrew);
            setStats(statsData);
            setWorkspaceId(wsId);
        } catch (err) {
            console.error("Failed to load crew:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);


    // Handlers
    const resetForm = () => {
        setFormName("");
        setFormInitials("");
        setFormRole("SKILLED");
        setFormStatus("ACTIVE");
        setFormSkills("");
        setFormProject("");
        setFormBaseRate("0");
        setFormOvertimeRate("0");
        setFormOtRate1("0");
        setFormOtRate2("0");
        setFormOtRate3("0");
    };

    // FAB trigger
    useEffect(() => {
        if (triggerOpen && triggerOpen > 0) {
            resetForm();
            setShowAddDrawer(true);
        }
    }, [triggerOpen]);

    // Base filtered data (ignoring the Active Card filter) to calculate dynamic stats
    const filteredBaseData = useMemo(() => {
        let data = crewList;
        if (selectedRoles.length > 0) data = data.filter(c => selectedRoles.includes(c.role));
        if (selectedStatuses.length > 0) data = data.filter(c => selectedStatuses.includes(c.status));
        if (selectedProjects.length > 0) data = data.filter(c => c.projectCode && selectedProjects.includes(c.projectCode));
        if (searchQuery) data = data.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return data;
    }, [crewList, searchQuery, selectedRoles, selectedStatuses, selectedProjects]);

    // Derived stats from the base filtered data
    const derivedStats = useMemo(() => {
        return {
            total: filteredBaseData.length,
            active: filteredBaseData.filter(c => c.status === "ACTIVE").length,
            skilled: filteredBaseData.filter(c => SKILLED_ROLES.includes(c.role)).length,
            unskilled: filteredBaseData.filter(c => c.role === "HELPER" || c.role === "GENERAL").length
        };
    }, [filteredBaseData]);

    // Filtered & sorted crew (Applying the Active Card filter)
    const filteredCrew = useMemo(() => {
        let data = filteredBaseData;

        // Apply Card Filter
        if (activeCard === "ACTIVE") data = data.filter(c => c.status === "ACTIVE");
        else if (activeCard === "SKILLED") data = data.filter(c => SKILLED_ROLES.includes(c.role));
        else if (activeCard === "UNSKILLED") data = data.filter(c => c.role === "HELPER" || c.role === "GENERAL");

        return [...data].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name") cmp = a.name.localeCompare(b.name);
            else if (sortBy === "role") cmp = a.role.localeCompare(b.role);
            else if (sortBy === "status") cmp = a.status.localeCompare(b.status);
            else if (sortBy === "project") cmp = (a.projectCode || "").localeCompare(b.projectCode || "");

            return sortOrder === "asc" ? cmp : -cmp;
        });
    }, [filteredBaseData, activeCard, sortBy, sortOrder]);

    const handleSort = (col: "name" | "role" | "status" | "project") => {
        if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
    };

    const toggleRole = (r: CrewRole) => setSelectedRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    const toggleStatus = (s: CrewStatus) => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    const toggleProject = (c: string) => setSelectedProjects(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

    const openEditDrawer = (crew: CrewListItem) => {
        setSelectedCrew(crew);
        setFormName(crew.name);
        setFormInitials(crew.initials);
        setFormRole(crew.role);
        setFormStatus(crew.status);
        setFormSkills(crew.skillTags.join(", "));
        setFormProject(crew.projectCode || "");
        setFormBaseRate(crew.baseDailyRate?.toString() || "0");
        setFormOvertimeRate(crew.overtimeDailyRate?.toString() || "0");
        setFormOtRate1(crew.otRate1?.toString() || "0");
        setFormOtRate2(crew.otRate2?.toString() || "0");
        setFormOtRate3(crew.otRate3?.toString() || "0");
        setShowEditDrawer(true);
    };

    const openDeleteConfirm = (crew: CrewListItem) => {
        setSelectedCrew(crew);
        setShowDeleteConfirm(true);
    };

    // Auto-generate initials on name change
    useEffect(() => {
        // Only run if form is open (to avoid unnecessary calcs)
        if (!showAddDrawer && !showEditDrawer) return;

        const occupied = crewList
            .filter(c => c.id !== selectedCrew?.id) // Exclude self if editing
            .map(c => c.initials);

        const smart = generateSmartInitials(formName, occupied);
        setFormInitials(smart);
    }, [formName, crewList, selectedCrew, showAddDrawer, showEditDrawer]);

    // CRUD handlers
    const handleAddCrew = async () => {
        if (!formName.trim()) return;
        setIsSaving(true);
        try {
            const skillTags = formSkills.split(",").map(s => s.trim()).filter(Boolean);
            const result = await createCrewMember({
                workspaceId: workspaceId || undefined,
                name: formName.trim(),
                initials: formInitials,
                role: formRole,
                status: formStatus,
                skillTags,
                currentProjectCode: formProject || undefined,
                baseDailyRate: parseFloat(formBaseRate) || 0,
                overtimeDailyRate: parseFloat(formOvertimeRate) || 0,
                otRate1: parseFloat(formOtRate1) || 0,
                otRate2: parseFloat(formOtRate2) || 0,
                otRate3: parseFloat(formOtRate3) || 0,
            });
            if (result) {
                await loadData();
                setShowAddDrawer(false);
                resetForm();
            }
        } catch (err: any) {
            console.error("Failed to add crew:", err);
            alert(`Failed to add crew: ${err.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditCrew = async () => {
        if (!selectedCrew || !formName.trim()) return;
        setIsSaving(true);
        try {
            const skillTags = formSkills.split(",").map(s => s.trim()).filter(Boolean);
            const result = await updateCrewMember(selectedCrew.id, {
                name: formName.trim(),
                initials: formInitials,
                role: formRole,
                status: formStatus,
                skillTags,
                currentProjectCode: formProject || undefined,
                baseDailyRate: parseFloat(formBaseRate) || 0,
                overtimeDailyRate: parseFloat(formOvertimeRate) || 0,
                otRate1: parseFloat(formOtRate1) || 0,
                otRate2: parseFloat(formOtRate2) || 0,
                otRate3: parseFloat(formOtRate3) || 0,
            });
            if (result) {
                await loadData();
                setShowEditDrawer(false);
                setSelectedCrew(null);
                resetForm();
            }
        } catch (err: any) {
            console.error("Failed to update crew:", err);
            alert(`Failed to update crew: ${err.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCrew = async () => {
        if (!selectedCrew) return;
        setIsSaving(true);
        try {
            const success = await deleteCrewMember(selectedCrew.id);
            if (success) {
                await loadData();
                setShowDeleteConfirm(false);
                setSelectedCrew(null);
            }
        } catch (err: any) {
            console.error("Failed to delete crew:", err);
            alert(`Failed to delete crew: ${err.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (filteredCrew.length === 0) return;
        setExporting(true);

        try {
            // 1. Prepare Meta
            const documentName = "Crew Directory Report";
            const generatedAt = new Date().toLocaleString("id-ID");

            // Use current date as period text for directory
            const periodText = `As of ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}`;

            // 2. Prepare Summary
            const summaryCards = [
                { label: "Total Crew", value: derivedStats.total, format: "number" as const },
                { label: "Active", value: derivedStats.active, format: "number" as const, color: "green" as const },
                { label: "Skilled", value: derivedStats.skilled, format: "number" as const, color: "blue" as const },
                { label: "Unskilled", value: derivedStats.unskilled, format: "number" as const, color: "default" as const },
            ];

            // 3. Prepare Columns
            const columns = [
                { id: "name", label: "Name", align: "left" as const },
                { id: "role", label: "Role", align: "left" as const },
                { id: "project", label: "Current Project", align: "left" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            // 4. Prepare Data
            const rows = filteredCrew.map(c => {
                // Find actual project from projects list to get full code
                const project = projects.find(p => p.code.includes(c.projectCode || ""));
                const formattedProject = project
                    ? project.code.includes("-")
                        ? project.code.replace("-", " · ").toUpperCase()
                        : project.code.toUpperCase()
                    : "-";

                return {
                    name: c.name,
                    role: CREW_ROLE_LABELS[c.role]?.id || c.role,
                    project: formattedProject,
                    status: c.status === "ACTIVE" ? "Active" : "Inactive"
                };
            });

            // 5. POST to API
            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "CREW",
                        projectName: "Adidaya Crew Directory",
                        documentName,
                        periodText,
                        generatedAt,
                    },
                    summary: summaryCards,
                    columns,
                    data: rows
                })
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Crew_Directory_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to export PDF. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const activeFiltersCount = selectedRoles.length + selectedStatuses.length + selectedProjects.length;

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div><h1 className="text-2xl font-bold text-neutral-900">Crew Directory</h1><p className="text-sm text-neutral-500 mt-1">Manage field workers.</p></div>
                        <Button variant="primary" className="!rounded-xl !py-2.5 !px-5 hidden sm:flex" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowAddDrawer(true); }}>Add Crew</Button>
                    </div>
                    <Button variant="primary" className="!rounded-xl !py-2.5 !px-5 sm:hidden w-full justify-center" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowAddDrawer(true); }}>Add Crew</Button>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveCard("ALL")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ALL" ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "ALL" ? "text-blue-100" : "text-neutral-500")}>Total</div><div className={clsx("text-2xl font-bold", activeCard === "ALL" ? "text-white" : "text-blue-600")}>{derivedStats.total}</div></button>
                <button onClick={() => setActiveCard("ACTIVE")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ACTIVE" ? "bg-emerald-600 border-emerald-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "ACTIVE" ? "text-emerald-100" : "text-neutral-500")}>Active</div><div className={clsx("text-2xl font-bold", activeCard === "ACTIVE" ? "text-white" : "text-emerald-600")}>{derivedStats.active}</div></button>
                <button onClick={() => setActiveCard("SKILLED")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "SKILLED" ? "bg-purple-600 border-purple-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "SKILLED" ? "text-purple-100" : "text-neutral-500")}>Skilled</div><div className={clsx("text-2xl font-bold", activeCard === "SKILLED" ? "text-white" : "text-purple-600")}>{derivedStats.skilled}</div></button>
                <button onClick={() => setActiveCard("UNSKILLED")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "UNSKILLED" ? "bg-orange-500 border-orange-500" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "UNSKILLED" ? "text-orange-100" : "text-neutral-500")}>Unskilled</div><div className={clsx("text-2xl font-bold", activeCard === "UNSKILLED" ? "text-white" : "text-orange-500")}>{derivedStats.unskilled}</div></button>
            </div>

            {/* Search & Filters Bar */}
            <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative flex-shrink-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-32 sm:w-40 transition-all" /></div>
                    <button onClick={() => setShowFilterPopup(!showFilterPopup)} className={clsx("p-2 rounded-full border transition-colors flex items-center gap-1.5", activeFiltersCount > 0 ? "border-blue-500 bg-blue-50 text-blue-600" : "border-neutral-200 bg-white text-neutral-500")}><Filter className="w-4 h-4" />{activeFiltersCount > 0 && <span className="text-xs font-medium">{activeFiltersCount}</span>}</button>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        className="!rounded-full !py-1.5 !px-3"
                        icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handleExport}
                        disabled={exporting || filteredCrew.length === 0}
                    >
                        {exporting ? "Exporting..." : "Export"}
                    </Button>
                    <div className="flex items-center bg-neutral-100 rounded-full p-1">
                        <button onClick={() => setViewMode("list")} className={clsx("p-2 rounded-full transition-colors", viewMode === "list" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><List className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode("board")} className={clsx("p-2 rounded-full transition-colors", viewMode === "board" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><LayoutGrid className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Filter Popup */}
            {showFilterPopup && (
                <div className="bg-white rounded-xl border border-neutral-200 shadow-lg p-4 space-y-4">
                    <div className="flex items-center justify-between"><h3 className="font-semibold text-neutral-900">Filters</h3><button onClick={() => setShowFilterPopup(false)} className="p-1 rounded-full hover:bg-neutral-100"><X className="w-4 h-4 text-neutral-500" /></button></div>
                    <div><div className="text-xs font-medium text-neutral-500 mb-2">Roles</div><div className="flex flex-wrap gap-2">{CREW_ROLE_OPTIONS.map(opt => <button key={opt.value} onClick={() => toggleRole(opt.value)} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full border transition-colors", selectedRoles.includes(opt.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200")}>{CREW_ROLE_LABELS[opt.value].id}</button>)}</div></div>
                    <div><div className="text-xs font-medium text-neutral-500 mb-2">Status</div><div className="flex flex-wrap gap-2">{(["ACTIVE", "INACTIVE"] as CrewStatus[]).map(s => <button key={s} onClick={() => toggleStatus(s)} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full border transition-colors", selectedStatuses.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200")}>{s}</button>)}</div></div>
                    {uniqueProjects.length > 0 && (
                        <div><div className="text-xs font-medium text-neutral-500 mb-2">Projects</div><div className="flex flex-wrap gap-2">{uniqueProjects.map(p => <button key={p} onClick={() => toggleProject(p)} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full border transition-colors", selectedProjects.includes(p) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200")}>{formatProjectCode(p)}</button>)}</div></div>
                    )}
                    {activeFiltersCount > 0 && <button onClick={() => { setSelectedRoles([]); setSelectedStatuses([]); setSelectedProjects([]); }} className="text-sm text-red-600 hover:underline">Clear all</button>}
                </div>
            )}

            {/* Empty State */}
            {filteredCrew.length === 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="font-medium text-neutral-600 mb-2">{crewList.length === 0 ? "No crew members yet" : "No results found"}</h3>
                    <p className="text-sm text-neutral-400 mb-4">{crewList.length === 0 ? "Start by adding your first crew member." : "Try adjusting your filters."}</p>
                    {crewList.length === 0 && (
                        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowAddDrawer(true); }}>Add First Crew</Button>
                    )}
                </div>
            )}

            {/* List View */}
            {viewMode === "list" && filteredCrew.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon col="name" sortBy={sortBy} sortOrder={sortOrder} /></div></th>

                                    {/* Desktop Headers */}
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100 hidden sm:table-cell" onClick={() => handleSort("role")}><div className="flex items-center gap-1">Role <SortIcon col="role" sortBy={sortBy} sortOrder={sortOrder} /></div></th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100 hidden sm:table-cell" onClick={() => handleSort("project")}><div className="flex items-center gap-1">Project <SortIcon col="project" sortBy={sortBy} sortOrder={sortOrder} /></div></th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100 hidden sm:table-cell" onClick={() => handleSort("status")}><div className="flex items-center gap-1">Status <SortIcon col="status" sortBy={sortBy} sortOrder={sortOrder} /></div></th>

                                    {/* Mobile Consolidated Header */}
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase sm:hidden">Details</th>

                                    <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredCrew.map((crew) => (
                                    <tr key={crew.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => onViewDetail?.(crew.id)}>
                                        <td className="px-4 py-3 align-top sm:align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-semibold flex-shrink-0">{crew.initials}</div>
                                                <span className="font-medium text-neutral-900">{crew.name}</span>
                                            </div>
                                        </td>

                                        {/* Desktop Columns */}
                                        <td className="px-4 py-3 hidden sm:table-cell"><span className={clsx("px-2 py-1 rounded-full text-xs font-medium", ROLE_COLORS[crew.role])}>{CREW_ROLE_LABELS[crew.role].id}</span></td>
                                        <td className="px-4 py-3 hidden sm:table-cell">{crew.projectCode ? <span className="px-2 py-1 text-xs font-mono bg-neutral-100 text-neutral-600 rounded">{formatProjectCode(crew.projectCode)}</span> : <span className="text-neutral-400 text-xs">-</span>}</td>
                                        <td className="px-4 py-3 hidden sm:table-cell"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", crew.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500")}>{crew.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>

                                        {/* Mobile Consolidated Column */}
                                        <td className="px-4 py-3 sm:hidden align-middle">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={clsx("px-2 py-1 rounded-full text-[10px] font-medium", ROLE_COLORS[crew.role])}>
                                                    {CREW_ROLE_LABELS[crew.role].id}
                                                </span>
                                                {crew.projectCode && (
                                                    <span className="px-2 py-1 text-[10px] font-mono bg-neutral-100 text-neutral-600 rounded">
                                                        {formatProjectCode(crew.projectCode)}
                                                    </span>
                                                )}
                                                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-medium", crew.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500")}>
                                                    {crew.status === "ACTIVE" ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEditDrawer(crew)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => openDeleteConfirm(crew)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Board View */}
            {viewMode === "board" && filteredCrew.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredCrew.map((crew) => (
                        <div key={crew.id} className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetail?.(crew.id)}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-semibold flex-shrink-0">{crew.initials}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-neutral-900 truncate">{crew.name}</div>
                                    <span className={clsx("inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium", ROLE_COLORS[crew.role])}>{CREW_ROLE_LABELS[crew.role].id}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                                <div className="flex items-center gap-2">
                                    {crew.projectCode && <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{formatProjectCode(crew.projectCode)}</span>}
                                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-medium", crew.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500")}>{crew.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                                </div>
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => openEditDrawer(crew)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => openDeleteConfirm(crew)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Drawer */}
            {showAddDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddDrawer(false)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-xl animate-in slide-in-from-right overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold text-neutral-900">Add Crew</h2>
                            <button onClick={() => setShowAddDrawer(false)} className="p-2 rounded-full hover:bg-neutral-100"><X className="w-5 h-5 text-neutral-500" /></button>
                        </div>
                        <div className="p-4 space-y-4 pb-48 md:pb-24">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:border-neutral-400">
                                    <Plus className="w-6 h-6 text-neutral-400" />
                                </div>
                            </div>
                            <FormInput label="Name *" value={formName} onChange={setFormName} placeholder="Enter full name" />
                            <Select label="Role *" value={formRole} onChange={(v) => setFormRole(v as CrewRole)} options={CREW_ROLE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} placeholder="Select role" accentColor="blue" />
                            <Select label="Status" value={formStatus} onChange={(v) => setFormStatus(v as CrewStatus)} options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} placeholder="Select status" accentColor="blue" />
                            {/* Project is set via Project Assignments only */}
                            <FormInput label="Skills (comma separated)" value={formSkills} onChange={setFormSkills} placeholder="e.g. Beton, Finishing" />

                            <div className="border-t pt-4 mt-2">
                                <h3 className="font-semibold text-neutral-900 mb-3">Rates (IDR)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Daily Rate" value={formBaseRate} onChange={setFormBaseRate} type="number" />
                                    <FormInput label="Sunday/Holiday" value={formOvertimeRate} onChange={setFormOvertimeRate} type="number" />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    <FormInput label="OT Hour 1" value={formOtRate1} onChange={setFormOtRate1} type="number" />
                                    <FormInput label="OT Hour 2" value={formOtRate2} onChange={setFormOtRate2} type="number" />
                                    <FormInput label="OT Hour 3" value={formOtRate3} onChange={setFormOtRate3} type="number" />
                                </div>
                            </div>

                        </div>
                        <div className="fixed bottom-24 md:bottom-0 right-0 w-full max-w-md p-4 border-t bg-white">
                            <button onClick={handleAddCrew} disabled={isSaving || !formName.trim()} className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Crew
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Drawer */}
            {showEditDrawer && selectedCrew && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditDrawer(false)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-xl animate-in slide-in-from-right overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold text-neutral-900">Edit Crew</h2>
                            <button onClick={() => setShowEditDrawer(false)} className="p-2 rounded-full hover:bg-neutral-100"><X className="w-5 h-5 text-neutral-500" /></button>
                        </div>
                        <div className="p-4 space-y-4 pb-48 md:pb-24">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-2xl font-bold">{formInitials}</div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1"><FormInput label="Name *" value={formName} onChange={setFormName} placeholder="Enter full name" /></div>
                                <div className="w-24"><FormInput label="Initials" value={formInitials} onChange={setFormInitials} placeholder="XX" /></div>
                            </div>
                            <Select label="Role *" value={formRole} onChange={(v) => setFormRole(v as CrewRole)} options={CREW_ROLE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} placeholder="Select role" accentColor="blue" />
                            <Select label="Status" value={formStatus} onChange={(v) => setFormStatus(v as CrewStatus)} options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} placeholder="Select status" accentColor="blue" />
                            {/* Project is set via Project Assignments only */}
                            {selectedCrew.projectCode && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Current Project</label>
                                    <div className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-600">
                                        {formatProjectCode(selectedCrew.projectCode)}
                                    </div>
                                </div>
                            )}
                            <FormInput label="Skills (comma separated)" value={formSkills} onChange={setFormSkills} placeholder="e.g. Beton, Finishing" />
                        </div>
                        <div className="fixed bottom-24 md:bottom-0 right-0 w-full max-w-md p-4 border-t bg-white">
                            <button onClick={handleEditCrew} disabled={isSaving || !formName.trim()} className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {showDeleteConfirm && selectedCrew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 animate-in zoom-in-95">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4"><Trash2 className="w-6 h-6" /></div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-2">Delete Crew?</h3>
                            <p className="text-sm text-neutral-500 mb-6">Are you sure you want to delete <strong>{selectedCrew.name}</strong>?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 px-4 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50">Cancel</button>
                                <button onClick={handleDeleteCrew} disabled={isSaving} className="flex-1 py-2.5 px-4 bg-red-600 rounded-xl text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputClass = "w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:!ring-blue-500/30 focus:!border-blue-500 transition-all";

const FormInput = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </div>
);

const SortIcon = ({ col, sortBy, sortOrder }: { col: "name" | "role" | "status" | "project", sortBy: string, sortOrder: string }) =>
    sortBy !== col ? <ArrowUpDown className="w-3 h-3 text-neutral-400" /> :
        sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
