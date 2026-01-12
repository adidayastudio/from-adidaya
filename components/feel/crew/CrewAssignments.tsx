"use client";

import { useState, useMemo, useEffect } from "react";
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

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCard, setActiveCard] = useState<FilterCard>("ALL");
    const [sortBy, setSortBy] = useState<"name" | "project" | "date">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [showDrawer, setShowDrawer] = useState(false);

    const [formRole, setFormRole] = useState<CrewRole | "">("");
    const [formCrew, setFormCrew] = useState("");
    const [formProject, setFormProject] = useState("");
    const [exporting, setExporting] = useState(false);
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

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

    const handleSave = async () => {
        if (!formRole || !formCrew || !formProject) return;

        try {
            // formCrew is the crewID here because we updated Select options below
            const crewId = formCrew;
            const projectCode = formProject;

            // Call API
            const success = await assignCrewToProject(crewId, projectCode);

            if (success) {
                // Refresh list
                await loadAssignments();
                setShowDrawer(false);
                resetForm();
            } else {
                alert("Failed to assign crew. Please try again.");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred while saving.");
        }
    };

    const openEditDrawer = (a: Assignment) => { setEditingAssignment(a); setFormRole(a.crewRole); setFormCrew(a.crewName); setFormProject(a.projectCode); setFormStartDate(a.startDate); setFormEndDate(a.endDate || ""); setShowDrawer(true); };

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
                    crewRole: CREW_ROLE_LABELS[a.crewRole]?.id || a.crewRole,
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

    const inputClass = "w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

    const FormInput = ({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        </div>
    );

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">Project Assignment</h1>
                            <p className="text-sm text-neutral-500 mt-1">History of crew assignments to projects.</p>
                        </div>
                        <Button variant="primary" className="!rounded-xl !py-2.5 !px-5 hidden sm:flex" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowDrawer(true); }}>New Assignment</Button>
                    </div>
                    <Button variant="primary" className="!rounded-xl !py-2.5 !px-5 sm:hidden w-full justify-center" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowDrawer(true); }}>New Assignment</Button>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

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
                    <div className="flex flex-wrap gap-2">{projects.map(p => <button key={p.code} onClick={() => toggleProject(p.code)} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full border transition-colors", selectedProjects.includes(p.code) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-200")}>{formatProjectCode(p.code)}</button>)}</div>
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

            {/* TABLE */}
            {filteredAssignments.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
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
                                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{getInitials(a.crewName)}</div><div><div className="font-medium text-neutral-900">{a.crewName}</div><div className="text-xs text-neutral-500">{CREW_ROLE_LABELS[a.crewRole]?.id || a.crewRole}</div></div></div></td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{formatProjectCode(a.projectCode)}</span></td>
                                        <td className="px-4 py-3 text-neutral-600 text-xs">{formatDate(a.startDate)} → {a.endDate ? formatDate(a.endDate) : "Present"}</td>
                                        <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", a.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-50 text-neutral-600")}>{a.status === "ACTIVE" ? "Active" : "Done"}</span></td>
                                        <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openEditDrawer(a)} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button><button className="p-1.5 rounded-full hover:bg-blue-50 text-blue-500 hover:text-blue-600" title="Contract"><FileText className="w-3.5 h-3.5" /></button><button className="p-1.5 rounded-full hover:bg-red-50 text-neutral-400 hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DRAWER */}
            {showDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-xl animate-in slide-in-from-right overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold text-neutral-900">{editingAssignment ? "Edit Assignment" : "New Assignment"}</h2>
                            <button onClick={() => setShowDrawer(false)} className="p-2 rounded-full hover:bg-neutral-100"><X className="w-5 h-5 text-neutral-500" /></button>
                        </div>
                        <div className="p-4 space-y-4 pb-24">
                            <Select label="Role *" value={formRole} onChange={(v) => { setFormRole(v as CrewRole); setFormCrew(""); }} options={CREW_ROLE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} placeholder="Select role first" />
                            <Select
                                label="Crew *"
                                value={formCrew}
                                onChange={setFormCrew}
                                disabled={!formRole}
                                options={crewOptions.filter(c => c.role === formRole).map(c => ({ value: c.value, label: c.label }))}
                                placeholder={formRole ? "Select crew member" : "Select role first"}
                            />
                            <Select label="Project *" value={formProject} onChange={setFormProject} options={projects.map(p => ({ value: p.code, label: `[${p.code}] ${p.name}` }))} placeholder="Select project" />
                            <FormInput label="Start Date *" type="date" value={formStartDate} onChange={setFormStartDate} />
                            <FormInput label="End Date" type="date" value={formEndDate} onChange={setFormEndDate} />
                        </div>
                        <div className="fixed bottom-0 right-0 w-full max-w-md p-4 border-t bg-white"><button onClick={handleSave} className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">Save Assignment</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
