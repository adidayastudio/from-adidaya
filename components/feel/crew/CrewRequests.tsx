"use client";

import { useState, useMemo, useEffect } from "react";
import clsx from "clsx";
import { Plus, Search, ChevronDown, ChevronUp, Check, X, Clock, Download, ArrowUpDown, FileText, Upload, Users, Edit, Trash, Ban, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import {
    CREW_ROLE_LABELS,
    CREW_ROLE_OPTIONS,
    CrewRole,
    CrewRequest,
    RequestType,
    RequestStatus,
    fetchRequests,
    createRequest,
    fetchCrewMembers,
    updateRequestStatus,
    upsertDailyLog,
    updateRequest,
    deleteRequest,
    deleteDailyLogsForDate
} from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface CrewRequestsProps { role?: string; triggerOpen?: number; }

type FilterCard = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const getInitials = (n?: string) => { if (!n) return "??"; const w = n.trim().split(/\s+/); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : w[0].substring(0, 2).toUpperCase(); };
const formatNum = (n: number) => n.toLocaleString("id-ID");

const inputClass = "w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";
const FormInput = ({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={clsx(inputClass, type === "date" && "cursor-pointer relative z-10")}
                onClick={(e) => { if (type === 'date') (e.target as HTMLInputElement).showPicker?.() }}
            />
            {type === 'date' && <div className="absolute inset-0 z-0 bg-transparent pointer-events-none" />}
        </div>
    </div>
);

export function CrewRequests({ role, triggerOpen }: CrewRequestsProps) {
    const [requests, setRequests] = useState<CrewRequest[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [crew, setCrew] = useState<{ id: string; name: string; role: CrewRole; projectCode?: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCard, setActiveCard] = useState<FilterCard>("ALL");
    const [selectedType, setSelectedType] = useState<RequestType | "ALL">("ALL");
    const [selectedProject, setSelectedProject] = useState("ALL");
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [sortBy, setSortBy] = useState<"date" | "type" | "status">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [showDrawer, setShowDrawer] = useState(false);

    const [formType, setFormType] = useState<RequestType>("LEAVE");
    const [formCrew, setFormCrew] = useState("");
    const [formProject, setFormProject] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [formReason, setFormReason] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);

    const resetForm = () => { setFormType("LEAVE"); setFormCrew(""); setFormProject(""); setFormAmount(""); setFormStartDate(""); setFormEndDate(""); setFormReason(""); setEditingId(null); };

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;

            const [projs, members] = await Promise.all([
                fetchProjectsByWorkspace(wsId),
                fetchCrewMembers(wsId)
            ]);
            setProjects(projs.map((p: any) => ({ code: p.project_code, name: p.project_name })));
            setCrew(members.map(m => ({ id: m.id, name: m.name, role: m.role, projectCode: m.currentProjectCode })));

            loadRequests(wsId);
        };
        loadData();
    }, []);

    const loadRequests = async (wsId: string) => {
        const data = await fetchRequests(wsId);
        setRequests(data);
    };

    const handleApprove = async (req: CrewRequest) => {
        try {
            await updateRequestStatus(req.id, "APPROVED");
            if (req.type === "LEAVE") {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const parseDate = (dStr: string) => {
                        const parts = dStr.split("-").map(Number);
                        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    };

                    const start = parseDate(req.startDate);
                    const end = parseDate(req.endDate || req.startDate);

                    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        if (d > end) break;

                        try {
                            await deleteDailyLogsForDate(req.crewId, dateStr);
                            await upsertDailyLog({
                                workspaceId: wsId,
                                crewId: req.crewId,
                                projectCode: req.projectCode || "OFFICE",
                                date: dateStr,
                                status: "CUTI",
                                regularHours: 0,
                                ot1Hours: 0,
                                ot2Hours: 0,
                                ot3Hours: 0
                            });
                        } catch (logErr) { console.error(logErr); }
                    }
                }
            }
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) loadRequests(wsId);
            alert("Request approved and processed!");
        } catch (e: any) {
            console.error(e);
            alert(`Failed to approve: ${e.message || JSON.stringify(e)}`);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await updateRequestStatus(id, "REJECTED");
            const req = requests.find(r => r.id === id);
            if (req && req.type === "LEAVE") {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const startRaw = req.startDate;
                    const endRaw = req.endDate || req.startDate;
                    const start = new Date(startRaw);
                    const end = new Date(endRaw);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        await deleteDailyLogsForDate(req.crewId, d.toISOString().split('T')[0]);
                    }
                }
            }
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) loadRequests(wsId);
        } catch (e) { console.error(e); alert("Failed to reject"); }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this request?")) return;
        try {
            await updateRequestStatus(id, "CANCELED");
            const req = requests.find(r => r.id === id);
            if (req && req.type === "LEAVE") {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const startRaw = req.startDate;
                    const endRaw = req.endDate || req.startDate;
                    const start = new Date(startRaw);
                    const end = new Date(endRaw);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        await deleteDailyLogsForDate(req.crewId, d.toISOString().split('T')[0]);
                    }
                }
            }
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) loadRequests(wsId);
        } catch (e) { console.error(e); alert("Failed to cancel"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this request?")) return;
        try {
            await deleteRequest(id);
            const req = requests.find(r => r.id === id);
            if (req && req.type === "LEAVE") {
                const wsId = await fetchDefaultWorkspaceId();
                if (wsId) {
                    const start = new Date(req.startDate);
                    const end = req.endDate ? new Date(req.endDate) : start;
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        await deleteDailyLogsForDate(req.crewId, d.toISOString().split('T')[0]);
                    }
                }
            }
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) loadRequests(wsId);
        } catch (e: any) { console.error(e); alert("Failed to delete"); }
    };

    const handleEdit = (req: CrewRequest) => {
        setEditingId(req.id);
        setFormType(req.type);
        setFormCrew(req.crewId);
        setFormAmount(req.amount ? req.amount.toString() : "");
        setFormStartDate(req.startDate);
        setFormEndDate(req.endDate || "");
        setFormReason(req.reason);
        setShowDrawer(true);
    };

    const handleSubmit = async () => {
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId || !formCrew || !formType) return;
            if ((formType === "KASBON" || formType === "REIMBURSE") && !formAmount) { alert("Please enter amount"); return; }
            const finalStartDate = formStartDate || new Date().toISOString().split('T')[0];
            if (editingId) {
                await updateRequest(editingId, {
                    type: formType,
                    amount: formAmount ? parseFloat(formAmount) : undefined,
                    startDate: finalStartDate,
                    endDate: formEndDate || undefined,
                    reason: formReason,
                    status: "PENDING"
                });
            } else {
                await createRequest({
                    workspaceId: wsId,
                    crewId: formCrew,
                    type: formType,
                    startDate: finalStartDate,
                    endDate: formEndDate || undefined,
                    amount: formAmount ? parseFloat(formAmount) : undefined,
                    reason: formReason,
                    status: "PENDING"
                });
            }
            setShowDrawer(false);
            resetForm();
            loadRequests(wsId);
        } catch (e: any) { console.error(e); alert("Failed to save"); }
    };

    useEffect(() => { if (triggerOpen && triggerOpen > 0) { resetForm(); setShowDrawer(true); } }, [triggerOpen]);

    const stats = useMemo(() => ({ total: requests.length, pending: requests.filter(r => r.status === "PENDING").length, approved: requests.filter(r => r.status === "APPROVED").length, rejected: requests.filter(r => r.status === "REJECTED").length }), [requests]);

    const filtered = useMemo(() => {
        let d = requests;
        if (activeCard === "PENDING") d = d.filter(r => r.status === "PENDING");
        else if (activeCard === "APPROVED") d = d.filter(r => r.status === "APPROVED");
        else if (activeCard === "REJECTED") d = d.filter(r => r.status === "REJECTED");
        if (selectedType !== "ALL") d = d.filter(r => r.type === selectedType);
        if (selectedProject !== "ALL") d = d.filter(r => r.projectCode && selectedProject.includes(r.projectCode));
        if (searchQuery) { const q = searchQuery.toLowerCase(); d = d.filter(r => (r.crewName || "").toLowerCase().includes(q) || (r.reason || "").toLowerCase().includes(q)); }
        return [...d].sort((a, b) => { let cmp = 0; if (sortBy === "date") cmp = a.createdAt.localeCompare(b.createdAt); else if (sortBy === "type") cmp = a.type.localeCompare(b.type); else if (sortBy === "status") cmp = a.status.localeCompare(b.status); return sortOrder === "asc" ? cmp : -cmp; });
    }, [requests, searchQuery, activeCard, selectedType, selectedProject, sortBy, sortOrder]);

    const handleSort = (c: "date" | "type" | "status") => { if (sortBy === c) setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy(c); setSortOrder(c === "date" ? "desc" : "asc"); } };
    const SortIcon = ({ c }: { c: "date" | "type" | "status" }) => sortBy !== c ? <ArrowUpDown className="w-3 h-3 text-neutral-400" /> : sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    const getTypeBadge = (t: RequestType) => <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", t === "LEAVE" ? "bg-purple-100 text-purple-700" : t === "KASBON" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>{t === "LEAVE" ? "Leave" : t === "KASBON" ? "Kasbon" : "Reimburse"}</span>;
    const getStatusBadge = (s: RequestStatus) => s === "PENDING" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><Clock className="w-3 h-3" /> Pending</span> : s === "APPROVED" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><Check className="w-3 h-3" /> Approved</span> : s === "REJECTED" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"><X className="w-3 h-3" /> Rejected</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600"><Ban className="w-3 h-3" /> Canceled</span>;
    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short" });

    const handleExport = async () => {
        if (filtered.length === 0) return;
        setExporting(true);
        try {
            const currentMonthName = MONTHS[selectedMonth];
            const project = projects.find(p => p.code === selectedProject);
            const projectCode = project
                ? project.code.includes("-")
                    ? project.code.replace("-", " · ").toUpperCase()
                    : project.code.toUpperCase()
                : selectedProject === "ALL" ? "ALL" : selectedProject;

            const projectName = selectedProject === "ALL" ? "All Projects" : (project ? project.name : "Selected Project");
            const periodText = `Month of ${currentMonthName} ${new Date().getFullYear()}`;
            const generatedAt = new Date().toLocaleString("id-ID");

            const totalApproved = filtered.filter(r => r.status === "APPROVED").length;
            const totalPending = filtered.filter(r => r.status === "PENDING").length;
            const totalAmount = filtered.filter(r => r.status === "APPROVED" && r.amount).reduce((s, r) => s + (r.amount || 0), 0);

            const summaryCards = [
                { label: "Approved", value: totalApproved, format: "number" as const, color: "green" as const },
                { label: "Pending", value: totalPending, format: "number" as const, color: "amber" as const },
                { label: "Apprv. Amount", value: formatNum(totalAmount), format: "string" as const, color: "blue" as const },
            ];

            const columns = [
                { id: "crewName", label: "Name", align: "left" as const },
                { id: "type", label: "Type", align: "left" as const },
                { id: "details", label: "Details", align: "left" as const },
                { id: "status", label: "Status", align: "center" as const },
                { id: "date", label: "Requested", align: "right" as const },
            ];

            const rows = filtered.map(r => ({
                crewName: r.crewName || "Unknown",
                type: r.type,
                details: r.type === "LEAVE"
                    ? `${formatDate(r.startDate)} - ${r.endDate ? formatDate(r.endDate) : "?"}`
                    : `Amount: ${r.amount ? formatNum(r.amount) : "0"}`,
                status: r.status,
                date: new Date(r.createdAt).toLocaleDateString("id-ID")
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: { projectCode, projectName, documentName: "Requests Report", periodText, generatedAt },
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
            a.download = `Crew_Requests_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) { console.error(error); alert("Failed to export PDF."); } finally { setExporting(false); }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            <div className="space-y-4"><div className="flex flex-col gap-3"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-neutral-900">Requests</h1><p className="text-sm text-neutral-500 mt-1">Leave, Cash Advance, and Reimbursement.</p></div><Button variant="primary" className="!rounded-xl !py-2.5 !px-5 hidden sm:flex" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowDrawer(true); }}>Add Request</Button></div><Button variant="primary" className="!rounded-xl !py-2.5 !px-5 sm:hidden w-full justify-center" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowDrawer(true); }}>Add Request</Button></div><div className="border-b border-neutral-200" /></div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveCard("ALL")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "ALL" ? "bg-blue-600 border-blue-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "ALL" ? "text-blue-100" : "text-neutral-500")}>Total</div><div className={clsx("text-2xl font-bold", activeCard === "ALL" ? "text-white" : "text-blue-600")}>{stats.total}</div></button>
                <button onClick={() => setActiveCard("PENDING")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "PENDING" ? "bg-amber-500 border-amber-500" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "PENDING" ? "text-amber-100" : "text-neutral-500")}>Pending</div><div className={clsx("text-2xl font-bold", activeCard === "PENDING" ? "text-white" : "text-amber-600")}>{stats.pending}</div></button>
                <button onClick={() => setActiveCard("APPROVED")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "APPROVED" ? "bg-emerald-600 border-emerald-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "APPROVED" ? "text-emerald-100" : "text-neutral-500")}>Approved</div><div className={clsx("text-2xl font-bold", activeCard === "APPROVED" ? "text-white" : "text-emerald-600")}>{stats.approved}</div></button>
                <button onClick={() => setActiveCard("REJECTED")} className={clsx("p-4 rounded-xl border shadow-sm text-left transition-all", activeCard === "REJECTED" ? "bg-red-600 border-red-600" : "bg-white border-neutral-200")}><div className={clsx("text-sm mb-1", activeCard === "REJECTED" ? "text-red-100" : "text-neutral-500")}>Rejected</div><div className={clsx("text-2xl font-bold", activeCard === "REJECTED" ? "text-white" : "text-red-600")}>{stats.rejected}</div></button>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full bg-neutral-50/50 p-2 rounded-2xl border border-neutral-100">

                {/* 1. Filters Group */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full xl:w-auto">
                    {/* Search - Full width on mobile/tablet, auto on desktop */}
                    <div className="relative w-full lg:w-auto pointer-events-auto z-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full lg:w-64 pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,118,255,0.3)] transition-all"
                        />
                    </div>

                    {/* Month & Project - Row on mobile, but might wrap on small screens */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto pointer-events-auto z-10">
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                className="appearance-none w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white font-medium focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,118,255,0.3)] transition-all"
                            >
                                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                        </div>
                        <div className="flex-1 sm:flex-none sm:w-48">
                            <Select
                                value={selectedProject}
                                onChange={setSelectedProject}
                                options={[{ value: "ALL", label: "All Projects" }, ...projects.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))]}
                                placeholder="Project"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Actions Group */}
                <div className="flex items-center justify-between xl:justify-end gap-2 w-full xl:w-auto overflow-x-auto xl:overflow-visible no-scrollbar">
                    <div className="flex items-center bg-neutral-200/50 rounded-full p-1 flex-shrink-0">
                        {(["ALL", "LEAVE", "KASBON", "REIMBURSE"] as (RequestType | "ALL")[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setSelectedType(t)}
                                className={clsx(
                                    "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap",
                                    selectedType === t ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                {t === "ALL" ? "All" : t === "LEAVE" ? "Leave" : t === "KASBON" ? "Kasbon" : "Reimb"}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="secondary"
                        className="!rounded-full !py-1.5 !px-3 shadow-sm active:scale-95 transition-all flex-shrink-0"
                        icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handleExport}
                        disabled={exporting || filtered.length === 0}
                    >
                        {exporting ? "..." : "Export"}
                    </Button>
                </div>
            </div>

            {requests.length === 0 && <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center"><Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" /><h3 className="font-medium text-neutral-600 mb-2">No requests yet</h3><p className="text-sm text-neutral-400 mb-4">Submit leave, cash advance, or reimbursement requests.</p><Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowDrawer(true); }}>Add Request</Button></div>}

            {filtered.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Name</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden sm:table-cell">Project</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("type")}><div className="flex items-center gap-1">Type <SortIcon c="type" /></div></th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell">Details</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("status")}><div className="flex items-center justify-center gap-1">Status <SortIcon c="status" /></div></th>
                                    {(role && ["pm", "admin", "super_admin", "supervisor"].includes(role)) && <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase w-24">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-semibold flex-shrink-0">{getInitials(r.crewName)}</div>
                                                <div>
                                                    <div className="font-medium text-neutral-900">{r.crewName || "Unknown"}</div>
                                                    <div className="text-xs text-neutral-500">{r.crewRole ? (CREW_ROLE_LABELS[r.crewRole]?.en || r.crewRole) : "-"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell"><span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">{r.projectCode || "-"}</span></td>
                                        <td className="px-4 py-3">{getTypeBadge(r.type)}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {r.type === "LEAVE" && <span className="text-neutral-600 text-xs">{formatDate(r.startDate)} → {r.endDate ? formatDate(r.endDate) : "?"}</span>}
                                            {(r.type === "KASBON" || r.type === "REIMBURSE") && <span className="text-neutral-600 text-xs">{r.amount ? formatNum(r.amount) : "0"}</span>}
                                            {r.proofUrl && <a href={r.proofUrl} target="_blank" rel="noreferrer"><FileText className="w-3 h-3 text-blue-500 inline ml-2 hover:underline" /></a>}
                                        </td>
                                        <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {(role && ["pm", "admin", "super_admin", "supervisor"].includes(role)) && r.status === "PENDING" && (
                                                    <>
                                                        <button onClick={() => handleApprove(r)} className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleReject(r.id)} className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200" title="Reject"><X className="w-3.5 h-3.5" /></button>
                                                    </>
                                                )}
                                                {r.status === "PENDING" && (
                                                    <>
                                                        <button onClick={() => handleEdit(r)} className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleCancel(r.id)} className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200" title="Cancel"><Ban className="w-3.5 h-3.5" /></button>
                                                    </>
                                                )}
                                                <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200" title="Delete"><Trash className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-xl animate-in slide-in-from-right overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold text-neutral-900">New Request</h2>
                            <button onClick={() => setShowDrawer(false)} className="p-2 rounded-full hover:bg-neutral-100"><X className="w-5 h-5 text-neutral-500" /></button>
                        </div>
                        <div className="p-4 space-y-4 pb-24">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Request Type *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["LEAVE", "KASBON", "REIMBURSE"] as RequestType[]).map(t => <button key={t} onClick={() => setFormType(t)} className={clsx("py-3 px-4 rounded-xl border text-sm font-medium transition-all", formType === t ? (t === "LEAVE" ? "bg-purple-100 border-purple-300 text-purple-700" : t === "KASBON" ? "bg-red-100 border-red-300 text-red-700" : "bg-blue-100 border-blue-300 text-blue-700") : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300")}>{t === "LEAVE" ? "Leave" : t === "KASBON" ? "Cash Adv" : "Reimburse"}</button>)}
                                </div>
                            </div>
                            <Select label="Project *" value={formProject} onChange={v => { setFormProject(v); setFormCrew(""); }} options={projects.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))} placeholder="Select project" />
                            <Select label="Crew *" value={formCrew} onChange={setFormCrew} disabled={!formProject} options={crew.filter(c => {
                                if (!formProject || !c.projectCode) return true;
                                const p1 = formProject.toLowerCase();
                                const p2 = c.projectCode.toLowerCase();
                                return p1.includes(p2) || p2.includes(p1);
                            }).map(c => ({ value: c.id, label: `${c.name} (${CREW_ROLE_LABELS[c.role]?.en || c.role})` }))} placeholder={formProject ? "Select crew" : "Select project first"} />
                            {formType === "LEAVE" && <><FormInput label="Start Date *" type="date" value={formStartDate} onChange={setFormStartDate} /><FormInput label="End Date *" type="date" value={formEndDate} onChange={setFormEndDate} /></>}
                            {(formType === "KASBON" || formType === "REIMBURSE") && <FormInput label="Amount *" type="number" value={formAmount} onChange={setFormAmount} placeholder="e.g. 500000" />}
                            <div><label className="block text-sm font-medium text-neutral-700 mb-1.5">{formType === "REIMBURSE" ? "Description *" : "Reason *"}</label><textarea value={formReason} onChange={e => setFormReason(e.target.value)} className={inputClass} rows={3} placeholder={formType === "REIMBURSE" ? "Describe the expense..." : "Explain the reason..."} /></div>
                            {formType === "REIMBURSE" && <div><label className="block text-sm font-medium text-neutral-700 mb-1.5">Proof (Receipt/Invoice) *</label><div className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-neutral-300 cursor-pointer transition-colors"><Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2" /><p className="text-sm text-neutral-500">Click to upload</p><p className="text-xs text-neutral-400 mt-1">JPG, PNG, PDF up to 5MB</p></div></div>}
                        </div>
                        <div className="fixed bottom-0 right-0 w-full max-w-md p-4 border-t bg-white">
                            <button onClick={handleSubmit} className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">Submit Request</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
