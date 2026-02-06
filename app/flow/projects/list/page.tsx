"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProjectsPageWrapper from "@/components/flow/projects/ProjectsPageWrapper";
import { User, Users, Search, Plus, Eye, LayoutGrid, Edit2, Trash2, Loader2, FolderOpen, X, ChevronUp, ChevronDown } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import Drawer, { FormField, FormInput, FormTextarea, FormActions } from "@/components/shared/Drawer";
import { supabase } from "@/lib/supabaseClient";
import { fetchTypologies, Typology } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId, fetchProjectTypes, ProjectTypeTemplate } from "@/lib/api/templates";
import { Select } from "@/shared/ui/primitives/select/select";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

interface ProjectListItem {
    id: string;
    name: string;
    code: string;
    number: string;
    client: string;
    scope: string;
    typology: string;
    status: string;
    progress: number;
    value: number;
}

// Mock role - in real app, fetch from auth context
const USER_ROLE = "admin"; // Change to "staff" to test read-only mode
const CAN_EDIT = USER_ROLE === "admin" || USER_ROLE === "supervisor";

function formatShort(n: number) { return n >= 1000000000 ? `${(n / 1000000000).toFixed(1)}B` : n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { "In Progress": "bg-blue-50 text-blue-700", "active": "bg-blue-50 text-blue-700", Planning: "bg-orange-50 text-orange-700", "planning": "bg-orange-50 text-orange-700", Completed: "bg-green-50 text-green-700", "completed": "bg-green-50 text-green-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium capitalize", colors[status] || "bg-neutral-100 text-neutral-600")}>{status}</span>;
}

export default function ProjectsListPage() {
    const [projects, setProjects] = useState<ProjectListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Toggle Refs
    const personalRef = useRef<HTMLButtonElement>(null);
    const teamRef = useRef<HTMLButtonElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

    useEffect(() => {
        const activeRef = viewMode === "personal" ? personalRef : teamRef;
        if (activeRef.current) {
            setIndicatorStyle({
                width: activeRef.current.offsetWidth,
                left: activeRef.current.offsetLeft,
            });
        }
    }, [viewMode]);

    // Sort state
    type SortKey = "number" | "name" | "client" | "scope" | "progress" | "value" | "status";
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // Form state
    const [formCode, setFormCode] = useState("");
    const [formNumber, setFormNumber] = useState("");
    const [formName, setFormName] = useState("");
    const [formClient, setFormClient] = useState("");
    const [formScope, setFormScope] = useState("");
    const [formTypology, setFormTypology] = useState("");
    const [formValue, setFormValue] = useState("");
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [formLocation, setFormLocation] = useState("");
    const [formDescription, setFormDescription] = useState("");

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Typologies and Scopes from database
    const [typologies, setTypologies] = useState<Typology[]>([]);
    const [scopes, setScopes] = useState<ProjectTypeTemplate[]>([]);

    // Load projects from database
    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("projects")
                .select("*")
                .order("project_number", { ascending: true });

            if (error) {
                console.error("Error loading projects:", error);
                setProjects([]);
            } else {
                setProjects((data || []).map(p => ({
                    id: p.id,
                    name: p.project_name || p.name || "",
                    code: p.project_code || "",
                    number: p.project_number || "",
                    client: p.meta?.client || "",
                    scope: p.meta?.scope || "",
                    typology: p.meta?.typology || "",
                    status: p.status || "active",
                    progress: p.meta?.progress || 0,
                    value: p.meta?.value || 0,
                })));
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load typologies and scopes from database
    const loadMasterData = useCallback(async () => {
        try {
            const wsId = await fetchDefaultWorkspaceId() || "00000000-0000-0000-0000-000000000001";
            const [typData, scopeData] = await Promise.all([
                fetchTypologies(wsId),
                fetchProjectTypes(wsId)
            ]);
            setTypologies(typData);
            setScopes(scopeData);
        } catch (err) {
            console.error("Error loading master data:", err);
        }
    }, []);

    useEffect(() => { loadProjects(); loadMasterData(); }, [loadProjects, loadMasterData]);

    // Listen for FAB events
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'PROJECT_NEW') {
                openAddDrawer();
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    // Filter projects
    const filtered = projects.filter(p => {
        if (filter !== "all" && p.status.toLowerCase() !== filter.toLowerCase()) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.number.toLowerCase().includes(q);
        }
        return true;
    });

    // Sort projects
    const sorted = [...filtered].sort((a, b) => {
        if (!sortKey) return 0;
        const aVal = a[sortKey] ?? "";
        const bVal = b[sortKey] ?? "";
        if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortDir === "asc"
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
    });

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    // Sortable header component
    const SortHeader = ({ label, sortKeyName, align = "left" }: { label: string; sortKeyName: SortKey; align?: "left" | "center" | "right" }) => (
        <th
            className={clsx("px-6 py-3 text-xs font-semibold text-neutral-500 uppercase cursor-pointer hover:text-neutral-700 transition-colors select-none", align === "center" && "text-center", align === "right" && "text-right")}
            onClick={() => toggleSort(sortKeyName)}
        >
            <div className={clsx("flex items-center gap-1", align === "center" && "justify-center", align === "right" && "justify-end")}>
                {label}
                {sortKey === sortKeyName && (
                    sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                )}
            </div>
        </th>
    );

    const resetForm = () => {
        setFormCode(""); setFormNumber(""); setFormName(""); setFormClient("");
        setFormScope(""); setFormTypology(""); setFormValue(""); setFormStartDate(""); setFormEndDate("");
        setFormLocation(""); setFormDescription("");
    };

    const openAddDrawer = () => {
        setEditingProject(null);
        resetForm();
        setIsDrawerOpen(true);
    };

    const openEditDrawer = (project: ProjectListItem) => {
        setEditingProject(project);
        setFormCode(project.code);
        setFormNumber(project.number);
        setFormName(project.name);
        setFormClient(project.client);
        setFormScope(project.scope);
        setFormTypology(project.typology);
        setFormValue(project.value?.toString() || "");
        setIsDrawerOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formCode.trim() || !formNumber.trim() || !formName.trim()) {
            alert("Please fill in Code, Number, and Name fields.");
            return;
        }

        setIsSaving(true);
        try {
            const projectData = {
                project_code: formCode.toUpperCase(),
                project_number: formNumber,
                project_name: formName,
                status: "active",
                meta: {
                    client: formClient,
                    scope: formScope,
                    typology: formTypology,
                    value: parseFloat(formValue) || 0,
                    progress: 0,
                },
            };

            if (editingProject) {
                const { error } = await supabase
                    .from("projects")
                    .update(projectData)
                    .eq("id", editingProject.id);
                if (error) {
                    if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
                        if (error.message.includes("number")) {
                            alert(`Project Number "${formNumber}" is already in use. Please choose a different number.`);
                        } else if (error.message.includes("code")) {
                            alert(`Project Code "${formCode}" is already in use. Please choose a different code.`);
                        } else {
                            alert(`Duplicate error: ${error.message}`);
                        }
                    } else {
                        alert(`Failed to update: ${error.message}`);
                    }
                    return;
                }
            } else {
                // Get workspace ID first
                const wsId = await fetchDefaultWorkspaceId() || "00000000-0000-0000-0000-000000000001";
                const { error } = await supabase
                    .from("projects")
                    .insert({ ...projectData, workspace_id: wsId });
                if (error) {
                    if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
                        if (error.message.includes("number")) {
                            alert(`Project Number "${formNumber}" is already in use. Please choose a different number.`);
                        } else if (error.message.includes("code")) {
                            alert(`Project Code "${formCode}" is already in use. Please choose a different code.`);
                        } else {
                            alert(`Duplicate error: ${error.message}`);
                        }
                    } else {
                        alert(`Failed to create project: ${error.message}`);
                    }
                    return;
                }
            }

            setIsDrawerOpen(false);
            loadProjects();
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`Error: ${err?.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from("projects").delete().eq("id", deleteTarget.id);
            if (error) throw error;
            setDeleteTarget(null);
            loadProjects();
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Convert to select options
    const scopeOptions = [{ label: "Select scope...", value: "" }, ...scopes.map(s => ({ label: `${s.name} (${s.code || ""})`, value: s.code || s.projectTypeId }))];
    const typologyOptions = [{ label: "Select typology...", value: "" }, ...typologies.map(t => ({ label: `${t.name} (${t.code})`, value: t.code }))];

    return (
        <ProjectsPageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Projects" }, { label: "List" }]}
        >
            <div className="space-y-8 w-full animate-in fade-in duration-500">
                {/* Page Header */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">Projects</h1>
                            <p className="text-sm text-neutral-500 mt-1">Manage and track all your projects in one place.</p>
                        </div>
                        {CAN_EDIT && (<button onClick={openAddDrawer} className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /> New Project</button>)}
                    </div>
                </div>
                <div className="border-b border-neutral-200" />

                {/* Mobile Floating Toggle (Me/Team) */}
                <div className="lg:hidden fixed top-[72px] right-3 z-30">
                    <button
                        onClick={() => setViewMode(viewMode === "personal" ? "team" : "personal")}
                        className="flex items-center gap-1 h-7 px-2 pr-1.5 rounded-full backdrop-blur-xl border border-neutral-200/80 shadow-sm transition-all active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.9)' }}
                    >
                        {viewMode === "personal" ? <User className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} /> : <Users className="w-3.5 h-3.5 text-rose-600" strokeWidth={2} />}
                        <span className="text-[11px] font-semibold text-neutral-600 max-w-[60px] truncate">{viewMode === "personal" ? "Me" : "Team"}</span>
                        <svg className="w-3 h-3 text-neutral-300 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    </button>
                </div>

                {/* Desktop Toggle (Hidden on Mobile) */}
                <div className="hidden lg:flex items-center gap-3 justify-end -mt-12 mb-4">
                    <div className="relative inline-flex p-1 rounded-full h-10 bg-black/5" style={{ background: 'rgba(0, 0, 0, 0.06)' }}>
                        <div
                            className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out"
                            style={{ width: `${indicatorStyle.width}px`, left: `${indicatorStyle.left}px` }}
                        />
                        <button
                            ref={personalRef}
                            onClick={() => setViewMode("personal")}
                            className={clsx("relative z-10 flex items-center gap-2 px-3 h-full rounded-full text-sm font-medium transition-colors duration-200", viewMode === "personal" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                        >
                            <User className="w-4 h-4" /> Personal
                        </button>
                        <button
                            ref={teamRef}
                            onClick={() => setViewMode("team")}
                            className={clsx("relative z-10 flex items-center gap-2 px-3 h-full rounded-full text-sm font-medium transition-colors duration-200", viewMode === "team" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
                        >
                            <Users className="w-4 h-4" /> Team
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search projects..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                    <select className="px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="planning">Planning</option><option value="completed">Completed</option></select>
                </div>

                {/* Loading */}
                {isLoading && <GlobalLoading />}

                {/* Empty */}
                {!isLoading && projects.length === 0 && (
                    <div className="text-center py-16 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                        <FolderOpen className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                        <h3 className="text-lg font-medium text-neutral-600 mb-2">No projects yet</h3>
                        <p className="text-sm text-neutral-400 mb-6">Create your first project to get started</p>
                        {CAN_EDIT && (<button onClick={openAddDrawer} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"><Plus className="w-4 h-4" /> Create Project</button>)}
                    </div>
                )}

                {/* Table (Desktop) */}
                {!isLoading && projects.length > 0 && (
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {sorted.map((p) => (
                                <div key={p.id} className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mb-1">
                                                <span className="bg-neutral-100 px-1.5 py-0.5 rounded">{p.number}</span>
                                                <span>{p.code}</span>
                                            </div>
                                            <h3 className="font-bold text-neutral-900 line-clamp-2">{p.name}</h3>
                                        </div>
                                        <StatusBadge status={p.status} />
                                    </div>

                                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-100">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                                                <span>Progress</span>
                                                <span>{p.progress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.progress}%` }} />
                                            </div>
                                        </div>
                                        <Link href={`/flow/projects/${p.number}-${p.code}`} className="flex items-center justify-center p-2 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-white active:scale-95 transition-all text-neutral-600">
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-neutral-50/80 border-b border-neutral-100">
                                    <tr>
                                        <SortHeader label="Project" sortKeyName="number" />
                                        <SortHeader label="Scope" sortKeyName="scope" />
                                        <SortHeader label="Progress" sortKeyName="progress" align="center" />
                                        <SortHeader label="Value" sortKeyName="value" align="right" />
                                        <SortHeader label="Status" sortKeyName="status" />
                                        <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">{sorted.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-neutral-50/50 cursor-pointer transition-colors"
                                        onClick={() => window.location.href = `/flow/projects/${p.number}-${p.code}`}
                                    >
                                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600"><LayoutGrid className="w-5 h-5" /></div><div><div className="font-medium text-neutral-900">{p.name || "-"}</div><div className="text-xs text-neutral-500">{p.code || "-"} · {p.number || "-"}</div></div></div></td>
                                        <td className="px-6 py-4 text-sm text-neutral-500">{p.scope || "-"}</td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2 justify-center"><div className="w-20 h-2 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${p.progress}%` }} /></div><span className="text-sm font-medium">{p.progress}%</span></div></td>
                                        <td className="px-6 py-4 text-sm font-medium text-right">{p.value ? formatShort(p.value) : "-"}</td>
                                        <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/flow/projects/${p.number}-${p.code}`} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><Eye className="w-4 h-4 text-neutral-500" /></Link>
                                                {CAN_EDIT && (
                                                    <>
                                                        <button onClick={() => openEditDrawer(p)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><Edit2 className="w-4 h-4 text-neutral-500" /></button>
                                                        <button onClick={() => setDeleteTarget(p)} className="p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-4 h-4 text-neutral-400 hover:text-red-500" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* No results */}
                {!isLoading && projects.length > 0 && filtered.length === 0 && (
                    <div className="text-center py-8 text-neutral-500">No projects match your search or filter.</div>
                )}
            </div>

            {/* Add/Edit Drawer */}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={editingProject ? "Edit Project" : "New Project"} width="lg">
                <form className="space-y-5" onSubmit={handleSave}>
                    <FormField label="Project Code" required><FormInput placeholder="e.g. VBL" value={formCode} onChange={(e) => setFormCode(e.target.value)} /></FormField>
                    <FormField label="Project Number" required><FormInput placeholder="e.g. 001" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} /></FormField>
                    <FormField label="Project Name" required><FormInput placeholder="e.g. Villa Lebak Banten" value={formName} onChange={(e) => setFormName(e.target.value)} /></FormField>
                    <div className="border-t border-neutral-200 pt-4 mt-4">
                        <p className="text-xs text-neutral-400 mb-4">Optional Fields</p>
                    </div>
                    <FormField label="Client"><FormInput placeholder="Client name" value={formClient} onChange={(e) => setFormClient(e.target.value)} /></FormField>

                    {/* Styled Select for Scope */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Scope</label>
                        <Select
                            options={scopeOptions}
                            value={formScope}
                            onChange={(val) => setFormScope(val)}
                            placeholder="Select scope..."
                        />
                    </div>

                    {/* Styled Select for Typology */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Building Type (Typology)</label>
                        <Select
                            options={typologyOptions}
                            value={formTypology}
                            onChange={(val) => setFormTypology(val)}
                            placeholder="Select typology..."
                        />
                    </div>

                    <FormField label="Contract Value (IDR)"><FormInput type="number" placeholder="0" value={formValue} onChange={(e) => setFormValue(e.target.value)} /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date"><FormInput type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} /></FormField>
                        <FormField label="Target End Date"><FormInput type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} /></FormField>
                    </div>
                    <FormField label="Location"><FormTextarea placeholder="Project address..." value={formLocation} onChange={(e) => setFormLocation(e.target.value)} /></FormField>
                    <FormField label="Description"><FormTextarea placeholder="Project description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel={isSaving ? "Saving..." : (editingProject ? "Save Changes" : "Create Project")} />
                </form>
            </Drawer>

            {/* Delete Modal */}
            {
                deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                        <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-neutral-900 mb-2">Delete Project?</h3>
                            <p className="text-sm text-neutral-600 mb-6">Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 px-4 border border-neutral-200 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50">Cancel</button>
                                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">{isDeleting ? "Deleting..." : "Delete"}</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </ProjectsPageWrapper >
    );
}
