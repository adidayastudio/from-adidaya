"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { Plus, Search, ChevronDown, ChevronUp, X, Download, ArrowUpDown, Filter, Edit2, FileText, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import {
    CREW_ROLE_LABELS,
    CREW_ROLE_OPTIONS,
    CrewRole,
    assignCrewToProject,
    fetchCrewProjectHistory,
    fetchCrewMembers,
    fetchCrewMemberById
} from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { toast } from "react-hot-toast";

interface CrewAssignmentsProps {
    role?: string;
    triggerOpen?: number;
}

interface CrewOption {
    value: string; // crew ID
    label: string; // crew Name
    role: CrewRole;
}

interface Assignment {
    id: string;
    crewId: string; // Added crewId for editing
    crewName: string;
    crewRole: CrewRole;
    projectCode: string;
    startDate: string;
    endDate?: string;
    status: "ACTIVE" | "COMPLETED";
}

type FilterCard = "ALL" | "ACTIVE" | "COMPLETED";

const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return words[0].substring(0, 2).toUpperCase();
};

// Helper to format project code (get 3 letters after dash)
const formatProjectCode = (code?: string) => {
    if (!code) return "-";
    const parts = code.split("-");
    return parts.length > 1 ? parts[1] : code;
};

export function CrewAssignments({ role, triggerOpen }: CrewAssignmentsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Data state - empty, will be populated from database later
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);

    // Load projects and crew for dropdowns
    useEffect(() => {
        const load = async () => {
            try {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const [projData, crewData] = await Promise.all([
                        fetchProjectsByWorkspace(wsId),
                        fetchCrewMembers(wsId)
                    ]);

                    setProjects(projData.map((p: any) => ({
                        code: `${p.project_number}-${p.project_code}`,
                        name: p.project_name
                    })));

                    setCrewOptions(crewData.map(c => ({
                        value: c.id,
                        label: c.name,
                        role: c.role
                    })));
                }
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    // Helper for array params - checks 'projects' first, then fallback to 'project'
    const getArrayParam = (key: string) => {
        const val = searchParams.get(key);
        if (val) return val.split(",");
        // Fallback for compatibility
        if (key === "projects") {
            const single = searchParams.get("project");
            return single ? [single] : [];
        }
        return [];
    };

    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [activeCard, setActiveCard] = useState<FilterCard>((searchParams.get("card") as FilterCard) || "ALL");
    const [sortBy, setSortBy] = useState<"name" | "project" | "date">((searchParams.get("sort") as "name" | "project" | "date") || "date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("order") as "asc" | "desc") || "desc");
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState<string[]>(getArrayParam("projects"));

    // Sync from URL params
    useEffect(() => {
        const search = searchParams.get("search");
        if (search !== null && search !== searchQuery) setSearchQuery(search);

        const card = searchParams.get("card") as FilterCard;
        if (card && card !== activeCard) setActiveCard(card);

        const sort = searchParams.get("sort") as any;
        if (sort && sort !== sortBy) setSortBy(sort);

        const order = searchParams.get("order") as any;
        if (order && order !== sortOrder) setSortOrder(order);

        const projectsParam = searchParams.get("projects") || searchParams.get("project");
        if (projectsParam) {
            const projectsArray = projectsParam.split(",");
            if (JSON.stringify(projectsArray) !== JSON.stringify(selectedProjects)) setSelectedProjects(projectsArray);
        } else if (selectedProjects.length > 0) {
            setSelectedProjects([]);
        }
    }, [searchParams]);

    // Sync state to URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (searchQuery) params.set("search", searchQuery); else params.delete("search");
        if (activeCard && activeCard !== "ALL") params.set("card", activeCard); else params.delete("card");
        if (sortBy) params.set("sort", sortBy); else params.delete("sort");
        if (sortOrder) params.set("order", sortOrder); else params.delete("order");

        if (selectedProjects.length > 0) {
            params.set("projects", selectedProjects.join(","));
            params.set("project", selectedProjects[0]);
        } else {
            params.delete("projects");
            params.delete("project");
        }

        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [searchQuery, activeCard, sortBy, sortOrder, selectedProjects]);
    const [showDrawer, setShowDrawer] = useState(false);

    const [formRole, setFormRole] = useState<CrewRole | "">("");
    const [formCrew, setFormCrew] = useState("");
    const [formProject, setFormProject] = useState("");
    const [exporting, setExporting] = useState(false);
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const resetForm = () => { setFormRole(""); setFormCrew(""); setFormProject(""); setFormStartDate(""); setFormEndDate(""); setEditingAssignment(null); };

    // Load Assignments
    const loadAssignments = async () => {
        // In a real app we would join tables, but for now let's fetch history + crew details
        // This is a simplified fetch for demonstration. Ideally we have a joined view.
        try {
            // const history = await fetchCrewProjectHistory(""); // Removed to prevent error

            // Actually fetchCrewProjectHistory expects a crewMemberId. 
            // We need a new API to fetch ALL history or use supabase directly here for the list
            // For now, let's just fetch all crew members and map their 'currentProjectCode' as active assignment
            const crew = await fetchCrewMembers();
            const activeAssignments: Assignment[] = crew
                .filter(c => c.currentProjectCode)
                .map(c => ({
                    id: c.id,
                    crewId: c.id, // Map crew ID
                    crewName: c.name,
                    crewRole: c.role,
                    projectCode: c.currentProjectCode!,
                    startDate: new Date().toISOString(), // Fallback as we don't have joined history yet
                    status: "ACTIVE"
                }));
            setAssignments(activeAssignments);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadAssignments(); }, []);

    // Listen to floating button trigger
    useEffect(() => {
        if (triggerOpen && triggerOpen > 0) {
            resetForm();
            setShowDrawer(true);
        }
    }, [triggerOpen]);

    const handleSave = async () => {
        if (!formRole || !formCrew || !formProject) return;

        try {
            const crewId = formCrew;
            const projectCode = formProject;

            // Extract the matching project name if possible
            const matchedProject = projects.find(p => p.code === projectCode);

            // Call API
            const result = await assignCrewToProject(
                crewId,
                projectCode,
                matchedProject?.name,
                formStartDate || undefined,
                formEndDate || undefined,
                editingAssignment?.id
            );

            if (result.success) {
                // Refresh list
                await loadAssignments();
                setShowDrawer(false);
                resetForm();
                toast.success("Assignment saved successfully");
            } else {
                toast.error(result.error || "Failed to assign crew. Please try again.");
            }
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "An error occurred while saving.");
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;

        // Mock delete - in real app call API
        setAssignments(prev => prev.filter(a => a.id !== deleteConfirmId));
        setDeleteConfirmId(null);
        toast.success("Assignment deleted successfully");
    };

    const openEditDrawer = (a: Assignment) => {
        setEditingAssignment(a);
        setFormRole(a.crewRole);
        setFormCrew(a.crewId);

        // Find matching project (handle potential format mismatch e.g., "008-RWM" vs "RWM")
        const matchingProject = projects.find(p => p.code === a.projectCode || p.code.endsWith(`-${a.projectCode}`));
        setFormProject(matchingProject ? matchingProject.code : a.projectCode);

        // Extract YYYY-MM-DD from ISO string
        setFormStartDate(a.startDate.split('T')[0]);
        setFormEndDate(a.endDate ? a.endDate.split('T')[0] : "");
        setShowDrawer(true);
    };

    const stats = useMemo(() => ({
        total: assignments.length,
        active: assignments.filter(a => a.status === "ACTIVE").length,
        completed: assignments.filter(a => a.status === "COMPLETED").length,
    }), [assignments]);

    const filteredAssignments = useMemo(() => {
        let data = assignments;
        if (activeCard === "ACTIVE") data = data.filter(a => a.status === "ACTIVE");
        else if (activeCard === "COMPLETED") data = data.filter(a => a.status === "COMPLETED");
        if (selectedProjects.length > 0) {
            // Normalize both assignment code and selected filter code to match "LAX" == "009-LAX"
            data = data.filter(a => selectedProjects.some(sp => formatProjectCode(a.projectCode) === formatProjectCode(sp)));
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(a => a.crewName.toLowerCase().includes(q) || a.projectCode.toLowerCase().includes(q));
        }
        return [...data].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name") cmp = a.crewName.localeCompare(b.crewName);
            else if (sortBy === "project") cmp = a.projectCode.localeCompare(b.projectCode);
            else if (sortBy === "date") cmp = a.startDate.localeCompare(b.startDate);
            return sortOrder === "asc" ? cmp : -cmp;
        });
    }, [assignments, searchQuery, activeCard, selectedProjects, sortBy, sortOrder]);

    const handleSort = (column: "name" | "project" | "date") => {
        if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(column); setSortOrder(column === "date" ? "desc" : "asc"); }
    };

    const SortIcon = ({ column }: { column: "name" | "project" | "date" }) => {
        if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-neutral-400" />;
        return sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    const toggleProject = (code: string) => setSelectedProjects(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" });

    const handleExport = async () => {
        if (filteredAssignments.length === 0) return;
        setExporting(true);

        try {
            // 1. Prepare Meta
            const documentName = "Crew Assignment Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = `As of ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}`;

            // 2. Prepare Summary
            const summaryCards = [
                { label: "Total Assignments", value: stats.total, format: "number" as const },
                { label: "Active", value: stats.active, format: "number" as const, color: "green" as const },
                { label: "Completed", value: stats.completed, format: "number" as const, color: "blue" as const },
            ];

            // 3. Prepare Columns
            const columns = [
                { id: "crewName", label: "Crew Name", align: "left" as const },
                { id: "crewRole", label: "Role", align: "left" as const },
                { id: "project", label: "Project", align: "left" as const },
                { id: "startDate", label: "Start Date", align: "left" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            // 4. Prepare Data
            const rows = filteredAssignments.map(a => {
                const project = projects.find(p => p.code === a.projectCode);
                const formattedProject = project
                    ? project.code.includes("-")
                        ? project.code.replace("-", " · ").toUpperCase()
                        : project.code.toUpperCase()
                    : a.projectCode;

                return {
                    crewName: a.crewName,
                    crewRole: CREW_ROLE_LABELS[a.crewRole]?.en || a.crewRole,
                    project: formattedProject,
                    startDate: formatDate(a.startDate),
                    status: a.status
                };
            });

            // 5. POST to API
            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "ASSIGN",
                        projectName: "Adidaya Crew Assignments",
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
            a.download = `Crew_Assignments_${new Date().toISOString().split('T')[0]}.pdf`;
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

    const inputClass = "w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,118,255,0.3)] transition-all";

    const FormInput = ({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        </div>
    );

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            {/* HEADER REMOVED - Using Global PageHeader */}

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setActiveCard("ALL")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ALL" ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-200")}>
                    <div className={clsx("text-sm mb-1", activeCard === "ALL" ? "text-blue-100" : "text-neutral-500")}>Total</div>
                    <div className={clsx("text-2xl font-bold", activeCard === "ALL" ? "text-white" : "text-blue-600")}>{stats.total}</div>
                </button>
                <button onClick={() => setActiveCard("ACTIVE")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ACTIVE" ? "bg-emerald-600 border-emerald-600" : "bg-white border-neutral-200")}>
                    <div className={clsx("text-sm mb-1", activeCard === "ACTIVE" ? "text-emerald-100" : "text-neutral-500")}>Active</div>
                    <div className={clsx("text-2xl font-bold", activeCard === "ACTIVE" ? "text-white" : "text-emerald-600")}>{stats.active}</div>
                </button>
                <button onClick={() => setActiveCard("COMPLETED")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "COMPLETED" ? "bg-neutral-600 border-neutral-600" : "bg-white border-neutral-200")}>
                    <div className={clsx("text-sm mb-1", activeCard === "COMPLETED" ? "text-neutral-300" : "text-neutral-500")}>Done</div>
                    <div className={clsx("text-2xl font-bold", activeCard === "COMPLETED" ? "text-white" : "text-neutral-600")}>{stats.completed}</div>
                </button>
            </div>

            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-32 sm:w-40 transition-all" />
                    </div>
                    <button onClick={() => setShowFilterPopup(!showFilterPopup)} className={clsx("p-2 rounded-full border transition-colors flex items-center gap-1.5", selectedProjects.length > 0 ? "border-blue-500 bg-blue-50 text-blue-600" : "border-neutral-200 bg-white text-neutral-500")}>
                        <Filter className="w-4 h-4" />
                        {selectedProjects.length > 0 && <span className="text-xs font-medium">{selectedProjects.length}</span>}
                    </button>
                </div>
                <Button
                    variant="secondary"
                    className="!rounded-full !py-1.5 !px-3"
                    icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    onClick={handleExport}
                    disabled={exporting || filteredAssignments.length === 0}
                >
                    {exporting ? "Exporting..." : "Export"}
                </Button>
            </div>

            {/* FILTER */}
            {showFilterPopup && projects.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 shadow-lg p-4 space-y-4">
                    <div className="flex items-center justify-between"><h3 className="font-semibold text-neutral-900">Filter by Project</h3><button onClick={() => setShowFilterPopup(false)} className="p-1 rounded-full hover:bg-neutral-100"><X className="w-4 h-4 text-neutral-500" /></button></div>
                    <div className="flex flex-wrap gap-2">{projects.map(p => <button key={p.code} onClick={() => toggleProject(formatProjectCode(p.code))} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full border transition-colors", selectedProjects.includes(formatProjectCode(p.code)) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200")}>{formatProjectCode(p.code)}</button>)}</div>
                    {selectedProjects.length > 0 && <button onClick={() => setSelectedProjects([])} className="text-sm text-red-600 hover:underline">Clear</button>}
                </div>
            )}

            {/* EMPTY STATE */}
            {assignments.length === 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="font-medium text-neutral-600 mb-2">No assignments yet</h3>
                    <p className="text-sm text-neutral-400 mb-4">Create your first crew assignment to a project.</p>
                    <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowDrawer(true); }}>New Assignment</Button>
                </div>
            )}



            {/* CONTENT (TABLE & CARDS) */}
            {filteredAssignments.length > 0 && (
                <div className="space-y-4">
                    {/* MOBILE CARDS */}
                    <div className="lg:hidden space-y-3">
                        {filteredAssignments.map((a) => (
                            <div
                                key={a.id}
                                className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 p-4 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-semibold shadow-sm">
                                            {getInitials(a.crewName)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-neutral-900">{a.crewName}</div>
                                            <div className="text-xs text-neutral-500 font-medium tracking-wide uppercase">
                                                {CREW_ROLE_LABELS[a.crewRole]?.en || a.crewRole}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        a.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                    )}>
                                        {a.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-3 border-y border-black/[0.03]">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Project</div>
                                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-neutral-700 bg-neutral-100/80 px-2 py-1 rounded-lg w-fit">
                                            {formatProjectCode(a.projectCode)}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Period</div>
                                        <div className="text-xs text-neutral-600 font-medium">
                                            {formatDate(a.startDate)} → {a.endDate ? formatDate(a.endDate) : "Present"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-1">
                                    <div className="flex gap-1.5">
                                        <button onClick={() => openEditDrawer(a)} className="p-2.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1.5 active:scale-90 transition-all">
                                            <Edit2 className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-bold uppercase">Edit</span>
                                        </button>
                                        <button className="p-2.5 rounded-full bg-neutral-100 text-neutral-600 active:scale-90 transition-all">
                                            <FileText className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <button onClick={() => setDeleteConfirmId(a.id)} className="p-2.5 rounded-full text-neutral-400 hover:text-red-500 active:scale-90 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE */}
                    <div className="hidden lg:block bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-50 border-b border-neutral-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("name")}><div className="flex items-center gap-1">Name <SortIcon column="name" /></div></th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("project")}><div className="flex items-center gap-1">Project <SortIcon column="project" /></div></th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("date")}><div className="flex items-center gap-1">Period <SortIcon column="date" /></div></th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filteredAssignments.map((a) => (
                                        <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{getInitials(a.crewName)}</div><div><div className="font-medium text-neutral-900">{a.crewName}</div><div className="text-xs text-neutral-500">{CREW_ROLE_LABELS[a.crewRole]?.en || a.crewRole}</div></div></div></td>
                                            <td className="px-4 py-3"><span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{formatProjectCode(a.projectCode)}</span></td>
                                            <td className="px-4 py-3 text-neutral-600 text-xs">{formatDate(a.startDate)} → {a.endDate ? formatDate(a.endDate) : "Present"}</td>
                                            <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", a.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-50 text-neutral-600")}>{a.status === "ACTIVE" ? "Active" : "Done"}</span></td>
                                            <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openEditDrawer(a)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button><button className="p-1.5 rounded-full hover:bg-blue-50 text-blue-500 hover:text-blue-600" title="Contract"><FileText className="w-3.5 h-3.5" /></button><button onClick={() => setDeleteConfirmId(a.id)} className="p-1.5 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 border border-black/[0.05] dark:border-white/[0.1]">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center shadow-inner"><Trash2 className="w-8 h-8" /></div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Delete Assignment?</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Are you sure you want to remove this assignment? This action cannot be undone.</p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 text-sm font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                                <button onClick={handleDelete} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-full hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DRAWER */}
            {showDrawer && (
                <div className="fixed inset-0 z-[100] isolate">
                    <div className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowDrawer(false)} />
                    <div className={clsx(
                        "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-500 rounded-[56px] overflow-hidden flex flex-col",
                        "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]",
                        showDrawer ? "translate-y-0 sm:translate-x-0 opacity-100 scale-100" : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 sm:scale-95"
                    )}>
                        <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">{editingAssignment ? "Edit Assignment" : "New Assignment"}</h2>
                                <button
                                    onClick={() => setShowDrawer(false)}
                                    className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pb-32">
                            <div className="space-y-6">
                                <Select label="Role *" value={formRole} onChange={(v) => { setFormRole(v as CrewRole); setFormCrew(""); }} options={CREW_ROLE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} placeholder="Select role first" accentColor="blue" />
                                <Select
                                    label="Crew *"
                                    value={formCrew}
                                    onChange={setFormCrew}
                                    disabled={!formRole}
                                    options={crewOptions.filter(c => c.role === formRole).map(c => ({ value: c.value, label: c.label }))}
                                    placeholder={formRole ? "Select crew member" : "Select role first"}
                                    accentColor="blue"
                                    searchable={true}
                                />
                                <Select label="Project *" value={formProject} onChange={setFormProject} options={projects.map(p => ({ value: p.code, label: `[${p.code}] ${p.name}` }))} placeholder="Select project" accentColor="blue" searchable={true} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Start Date *" type="date" value={formStartDate} onChange={setFormStartDate} />
                                    <FormInput label="End Date" type="date" value={formEndDate} onChange={setFormEndDate} />
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-8 left-8 right-8">
                            <button onClick={handleSave} className="w-full py-4 px-6 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2">
                                <span>Save Assignment</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
