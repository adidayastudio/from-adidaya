"use client";

import { useState, useMemo, useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ProjectContext } from "@/components/flow/project-context";
import clsx from "clsx";
import { Plus, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Check, X, Clock, Download, ArrowUpDown, FileText, Upload, Users, Edit, Trash, Trash2, Ban, Loader2, FileCheck, TrendingUp } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";
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
import { supabase } from "@/lib/supabaseClient";
import { createNotification, fetchAdmins } from "@/lib/api/notifications";

interface CrewRequestsProps { role?: string; triggerOpen?: number; }

type FilterCard = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const getInitials = (n?: string) => { if (!n) return "??"; const w = n.trim().split(/\s+/); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : w[0].substring(0, 2).toUpperCase(); };
const formatNum = (n: number) => n.toLocaleString("id-ID");

type ViewMode = "weekly" | "monthly";

// ============================================
// DATE LOGIC HELPERS
// ============================================

const getWeeklyPeriod = (anchorDate: Date) => {
    // anchorDate should be a Sunday
    const start = new Date(anchorDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day); // Ensure Sunday
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Saturday
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const getMonthlyPeriod = (anchorDate: Date) => {
    // anchorDate is any date in the target month (e.g. 1st)
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth(); // 0-11

    const belongsToMonth = (sunday: Date, targetMonth: number, targetYear: number) => {
        let daysInMonth = 0;
        const d = new Date(sunday);
        for (let i = 0; i < 7; i++) {
            if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
                daysInMonth++;
            }
            d.setDate(d.getDate() + 1);
        }
        return daysInMonth >= 4;
    };

    const firstOfMonth = new Date(year, month, 1);
    let startWeek = new Date(firstOfMonth);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());

    if (!belongsToMonth(startWeek, month, year)) {
        startWeek.setDate(startWeek.getDate() + 7);
    }
    const start = new Date(startWeek);
    start.setHours(0, 0, 0, 0);

    let currentWeek = new Date(start);
    let lastValidSaturday = new Date(currentWeek);
    lastValidSaturday.setDate(lastValidSaturday.getDate() + 6);

    for (let i = 0; i < 6; i++) {
        const nextSunday = new Date(currentWeek);
        nextSunday.setDate(nextSunday.getDate() + 7);

        if (belongsToMonth(nextSunday, month, year)) {
            currentWeek = nextSunday;
            lastValidSaturday = new Date(currentWeek);
            lastValidSaturday.setDate(lastValidSaturday.getDate() + 6);
        } else {
            break;
        }
    }

    const end = lastValidSaturday;
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const inputClass = "w-full px-6 py-4 text-sm border border-black/5 dark:border-white/10 rounded-full bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";
const labelClass = "block text-sm font-bold text-neutral-500 mb-1.5 tracking-tight text-[11px]";
const FormInput = ({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
        <label className={labelClass}>{label}</label>
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
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Check project context
    const projectCtx = useContext(ProjectContext);
    const forceProjectCode = projectCtx?.project?.code || null;
    const forceProjectSuffix = forceProjectCode 
        ? (forceProjectCode.includes("-") ? forceProjectCode.split("-")[1] : forceProjectCode)
        : null;

    const [requests, setRequests] = useState<CrewRequest[]>([]);
    const [projects, setProjects] = useState<{ code: string; name: string }[]>([]);
    const [crew, setCrew] = useState<{ id: string; name: string; role: CrewRole; projectCode?: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [activeCard, setActiveCard] = useState<FilterCard>((searchParams.get("card") as FilterCard) || "ALL");
    const [selectedType, setSelectedType] = useState<RequestType | "ALL">((searchParams.get("type") as any) || "ALL");
    const [selectedProject, setSelectedProject] = useState(forceProjectSuffix || searchParams.get("project") || "ALL");

    // Sync FROM URL
    useEffect(() => {
        const search = searchParams.get("search");
        if (search !== null && search !== searchQuery) setSearchQuery(search);

        const card = searchParams.get("card") as FilterCard;
        if (card && card !== activeCard) setActiveCard(card);

        const project = forceProjectSuffix || searchParams.get("project") || "ALL";
        if (project !== selectedProject) setSelectedProject(project);

        const type = searchParams.get("type") as any;
        if (type && type !== selectedType) setSelectedType(type);
    }, [searchParams, forceProjectSuffix]);

    // Sync TO URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (searchQuery) params.set("search", searchQuery); else params.delete("search");
        if (activeCard && activeCard !== "ALL") params.set("card", activeCard); else params.delete("card");
        
        const activeProj = forceProjectSuffix || selectedProject;
        if (activeProj && activeProj !== "ALL") params.set("project", activeProj); else params.delete("project");
        if (selectedType !== "ALL") params.set("type", selectedType); else params.delete("type");

        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [searchQuery, activeCard, selectedProject, selectedType, forceProjectSuffix]);

    // Period Selection State
    const [anchorDate, setAnchorDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d;
    });
    const [viewMode, setViewMode] = useState<ViewMode>("weekly");

    const [sortBy, setSortBy] = useState<"date" | "type" | "status">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [showDrawer, setShowDrawer] = useState(false);
    const [viewingRequest, setViewingRequest] = useState<CrewRequest | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [isDesktop, setIsDesktop] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
        setPortalTarget(window.matchMedia("(min-width: 768px)").matches ? document.getElementById("crew-activity-portal-target") : null);
        
        const media = window.matchMedia("(min-width: 768px)");
        const listener = (e: MediaQueryListEvent) => {
            setIsDesktop(e.matches);
            setPortalTarget(e.matches ? document.getElementById("crew-activity-portal-target") : null);
        };
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, []);

    const [formType, setFormType] = useState<RequestType>("LEAVE");
    const [formCrew, setFormCrew] = useState("");
    const [formProject, setFormProject] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [formReason, setFormReason] = useState("");
    const [formProofUrl, setFormProofUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);

    const resetForm = () => { 
        setFormType("LEAVE"); 
        setFormCrew(""); 
        setFormProject(""); 
        setFormAmount(""); 
        setFormStartDate(""); 
        setFormEndDate(""); 
        setFormReason(""); 
        setFormProofUrl(""); 
        setEditingId(null); 
        setViewingRequest(null);
        setIsEditing(false);
    };

    const formatDateShort = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });

    // Derived period
    const period = useMemo(() => {
        if (viewMode === "weekly") return getWeeklyPeriod(anchorDate);
        return getMonthlyPeriod(anchorDate);
    }, [anchorDate, viewMode]);

    const handlePeriodChange = (dir: "prev" | "next") => {
        const n = new Date(anchorDate);
        if (viewMode === "weekly") {
            n.setDate(n.getDate() + (dir === "next" ? 7 : -7));
        } else {
            n.setDate(1);
            n.setMonth(n.getMonth() + (dir === "next" ? 1 : -1));
        }
        setAnchorDate(n);
    };

    // Deep-linking: Auto-open request if requestId is in URL
    useEffect(() => {
        const requestId = searchParams.get("requestId");
        if (requestId && requests.length > 0) {
            const found = requests.find(r => r.id === requestId);
            if (found) {
                // Wait a tiny bit for the component to be fully ready
                const timer = setTimeout(() => {
                    handleOpenRequest(found);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [searchParams, requests]);

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) return;

            const [projs, members] = await Promise.all([
                fetchProjectsByWorkspace(wsId),
                fetchCrewMembers(wsId)
            ]);
            setProjects(projs.map((p: any) => ({ code: p.project_number ? `${p.project_number}-${p.project_code}` : p.project_code, name: p.project_name })));
            setCrew(members.map(m => ({ id: m.id, name: m.name, role: m.role, projectCode: m.currentProjectCode })));

            loadRequests(wsId);
        };
        loadData();
    }, []);

    const isFetching = useRef(false);

    const loadRequests = async (wsId: string) => {
        if (isFetching.current) return;
        isFetching.current = true;
        try {
            const data = await fetchRequests(wsId);
            setRequests(data);
        } finally {
            isFetching.current = false;
        }
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
                    const parseDate = (dStr: string) => {
                        const parts = dStr.split("-").map(Number);
                        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    };
                    const start = parseDate(req.startDate);
                    const end = parseDate(req.endDate || req.startDate);
                    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        await deleteDailyLogsForDate(req.crewId, dateStr);
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
                    const parseDate = (dStr: string) => {
                        const parts = dStr.split("-").map(Number);
                        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    };
                    const start = parseDate(req.startDate);
                    const end = parseDate(req.endDate || req.startDate);
                    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        await deleteDailyLogsForDate(req.crewId, dateStr);
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
                    const parseDate = (dStr: string) => {
                        const parts = dStr.split("-").map(Number);
                        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    };
                    const start = parseDate(req.startDate);
                    const end = parseDate(req.endDate || req.startDate);
                    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        await deleteDailyLogsForDate(req.crewId, dateStr);
                    }
                }
            }
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) loadRequests(wsId);
        } catch (e: any) { console.error(e); alert("Failed to delete"); }
    };

    const handleOpenRequest = (req: CrewRequest) => {
        setViewingRequest(req);
        setIsEditing(false);
        setEditingId(null);
        setShowDrawer(true);
    };

    const handleEdit = (req: CrewRequest) => {
        setViewingRequest(req);
        setEditingId(req.id);
        setFormType(req.type);
        setFormCrew(req.crewId);
        setFormAmount(req.amount ? req.amount.toString() : "");
        setFormStartDate(req.startDate);
        setFormEndDate(req.endDate || "");
        setFormReason(req.reason);
        setFormProofUrl(req.proofUrl || "");
        setFormProject(req.projectCode || "");
        setIsEditing(true);
        setShowDrawer(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB.");
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `requests/${fileName}`;

            const { data, error } = await supabase.storage
                .from('crew-documents')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('crew-documents')
                .getPublicUrl(filePath);

            setFormProofUrl(publicUrl);
        } catch (err: any) {
            console.error("Upload error:", err);
            alert("Failed to upload document.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId || !formCrew || !formType) return;
            if ((formType === "KASBON" || formType === "REIMBURSE") && !formAmount) { alert("Please enter amount"); return; }
            const finalStartDate = formStartDate || new Date().toISOString().split('T')[0];
            const { data: { user } } = await supabase.auth.getUser();
            const selectedCrew = crew.find(c => c.id === formCrew);
            const crewName = selectedCrew?.name || "Unknown";

            if (editingId) {
                await updateRequest(editingId, {
                    projectCode: formProject || undefined,
                    type: formType,
                    amount: formAmount ? parseFloat(formAmount) : undefined,
                    startDate: finalStartDate,
                    endDate: formEndDate || undefined,
                    reason: formReason,
                    proofUrl: formProofUrl || undefined,
                    status: "PENDING",
                    createdBy: user?.id
                });
            } else {
                await createRequest({
                    workspaceId: wsId,
                    crewId: formCrew,
                    crewName: crewName,
                    projectCode: formProject || undefined,
                    type: formType,
                    startDate: finalStartDate,
                    endDate: formEndDate || undefined,
                    amount: formAmount ? parseFloat(formAmount) : undefined,
                    reason: formReason,
                    proofUrl: formProofUrl || undefined,
                    status: "PENDING",
                    createdBy: user?.id
                });
            }

            // Client-side notification to admins (fallback for DB trigger)
            try {
                const admins = await fetchAdmins();
                const typeLabel = formType === "LEAVE" ? "Leave" : formType === "KASBON" ? "Cash Advance" : "Reimbursement";
                const detailText = formType === "LEAVE" 
                    ? `${finalStartDate}${formEndDate && formEndDate !== finalStartDate ? ` to ${formEndDate}` : ""}`
                    : `Rp ${formAmount ? formatNum(parseFloat(formAmount)) : "0"}`;
                const action = editingId ? "updated" : "submitted";

                for (const adminId of admins) {
                    await createNotification({
                        user_id: adminId,
                        type: "info",
                        category: "crew",
                        title: `Crew Request • ${typeLabel}`,
                        description: `${crewName} ${action} ${typeLabel} for ${detailText}`,
                        link: `/feel/crew?tab=requests`,
                        metadata: { crewId: formCrew, type: formType }
                    });
                }
            } catch (notifErr) {
                console.warn("Notification delivery failed (non-blocking):", notifErr);
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
        if (selectedProject !== "ALL") d = d.filter(r => {
            if (!r.projectCode) return false;
            const rCode = r.projectCode.toLowerCase();
            const sCode = selectedProject.toLowerCase();
            return rCode === sCode || rCode.endsWith(`-${sCode}`) || sCode.endsWith(`-${rCode}`) || rCode.includes(sCode) || sCode.includes(rCode);
        });

        // Filter by Period
        d = d.filter(r => {
            const reqDate = new Date(r.createdAt);
            return reqDate >= period.start && reqDate <= period.end;
        });

        if (searchQuery) { const q = searchQuery.toLowerCase(); d = d.filter(r => (r.crewName || "").toLowerCase().includes(q) || (r.reason || "").toLowerCase().includes(q)); }
        return [...d].sort((a, b) => { let cmp = 0; if (sortBy === "date") cmp = a.createdAt.localeCompare(b.createdAt); else if (sortBy === "type") cmp = a.type.localeCompare(b.type); else if (sortBy === "status") cmp = a.status.localeCompare(b.status); return sortOrder === "asc" ? cmp : -cmp; });
    }, [requests, searchQuery, activeCard, selectedType, selectedProject, period, sortBy, sortOrder]);

    const handleSort = (c: "date" | "type" | "status") => { if (sortBy === c) setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy(c); setSortOrder(c === "date" ? "desc" : "asc"); } };
    const SortIcon = ({ c }: { c: "date" | "type" | "status" }) => sortBy !== c ? <ArrowUpDown className="w-3 h-3 text-neutral-400" /> : sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    const getTypeBadge = (t: RequestType) => <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", t === "LEAVE" ? "bg-purple-100 text-purple-700" : t === "KASBON" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")}>{t === "LEAVE" ? "Leave" : t === "KASBON" ? "Kasbon" : "Reimburse"}</span>;
    const getStatusBadge = (s: RequestStatus) => s === "PENDING" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><Clock className="w-3 h-3" /> Pending</span> : s === "APPROVED" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><Check className="w-3 h-3" /> Approved</span> : s === "REJECTED" ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700"><X className="w-3 h-3" /> Rejected</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600"><Ban className="w-3 h-3" /> Canceled</span>;
    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short" });

    const handleExport = async () => {
        if (filtered.length === 0) return;
        setExporting(true);
        try {
            const project = projects.find(p => p.code === selectedProject);
            const projectCode = project
                ? project.code.includes("-")
                    ? project.code.replace("-", " · ").toUpperCase()
                    : project.code.toUpperCase()
                : selectedProject === "ALL" ? "ALL" : selectedProject;

            const projectName = selectedProject === "ALL" ? "All Projects" : (project ? project.name : "Selected Project");

            const startStr = formatDateShort(period.start);
            const endStr = formatDateShort(period.end);
            const periodText = viewMode === "weekly"
                ? `Weekly Report (${startStr} – ${endStr})`
                : `Monthly Report (${startStr} – ${endStr})`;

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

    const renderDrawer = () => {
        if (!showDrawer) return null;

        const drawerContent = (
            <div className="w-full h-full border border-neutral-200/80 dark:border-neutral-800/80 rounded-[24px] shadow-xl flex flex-col overflow-hidden bg-white dark:bg-neutral-900">
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent md:px-5 md:pt-4 md:pb-3 md:bg-white md:dark:bg-neutral-900">
                    <div className="flex items-center justify-between mb-4 md:mb-0">
                        <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight md:text-sm md:font-extrabold">
                            {(viewingRequest && !isEditing) ? "Request Details" : (editingId ? "Edit Request" : "New Request")}
                        </h2>
                        <button
                            onClick={() => setShowDrawer(false)}
                            className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform md:w-7 md:h-7 md:bg-transparent md:border-none md:hover:bg-neutral-100 md:dark:hover:bg-neutral-800 md:text-neutral-400"
                        >
                            <X size={20} className="text-neutral-500 dark:text-neutral-400 md:w-4 md:h-4" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
                {(viewingRequest && !isEditing) ? (
                    <>
                        <div className="flex-1 overflow-y-auto scrollbar-hide px-8 md:px-5 md:py-4">
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-bold text-lg shadow-inner">
                                            {viewingRequest.crewInitials || viewingRequest.crewName?.substring(0, 2).toUpperCase() || "CR"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-neutral-900 dark:text-white text-base leading-snug">{viewingRequest.crewName}</h3>
                                            <p className="text-xs text-neutral-400 font-medium">{viewingRequest.crewRole ? CREW_ROLE_LABELS[viewingRequest.crewRole] : "Crew Member"}</p>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-4 py-1.5 rounded-full text-xs font-bold shadow-xs",
                                        viewingRequest.status === "APPROVED" && "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30",
                                        viewingRequest.status === "REJECTED" && "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30",
                                        viewingRequest.status === "PENDING" && "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/30",
                                        viewingRequest.status === "CANCELLED" && "bg-neutral-50 text-neutral-500 border border-neutral-200 dark:bg-neutral-900/30"
                                    )}>
                                        {viewingRequest.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Request Type" value={viewingRequest.type} accent />
                                    <DetailItem label="Project" value={viewingRequest.projectCode ? `[${formatProjectCode(viewingRequest.projectCode)}]` : "-"} />
                                    {viewingRequest.amount && (
                                        <DetailItem label="Amount Requested" value={`IDR ${Number(viewingRequest.amount).toLocaleString()}`} highlight />
                                    )}
                                    {viewingRequest.startDate && (
                                        <DetailItem 
                                            label="Period" 
                                            value={viewingRequest.endDate && viewingRequest.startDate !== viewingRequest.endDate 
                                                ? `${formatDateShort(new Date(viewingRequest.startDate))} - ${formatDateShort(new Date(viewingRequest.endDate))}`
                                                : formatDateShort(new Date(viewingRequest.startDate))
                                            } 
                                        />
                                    )}
                                </div>

                                {viewingRequest.reason && (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 rounded-2xl p-5 leading-relaxed">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">Reason / Notes</span>
                                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{viewingRequest.reason}</p>
                                    </div>
                                )}

                                {viewingRequest.proofUrl && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Attachment</span>
                                        <a 
                                            href={viewingRequest.proofUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 rounded-2xl hover:border-blue-300 dark:hover:border-blue-800 hover:bg-white transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                                    <FileText size={20} />
                                                </div>
                                                <span className="text-sm font-bold text-neutral-700">View Proof of Transaction</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-blue-500 transition-colors" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-none p-8 pt-4 bg-gradient-to-t from-white via-white to-transparent md:static md:p-5 md:bg-white md:dark:bg-neutral-900 flex-shrink-0">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleDelete(viewingRequest.id)}
                                        className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 active:scale-95 transition-all hover:bg-neutral-200 md:w-9 md:h-9 md:rounded-xl"
                                        title="Delete Permanently"
                                    >
                                        <Trash2 size={20} className="md:w-4 md:h-4" />
                                    </button>
                                    {viewingRequest.status === "PENDING" && (
                                        <button 
                                            onClick={() => handleCancel(viewingRequest.id)}
                                            className="w-12 h-12 flex items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200 active:scale-95 transition-all hover:bg-amber-100 md:w-9 md:h-9 md:rounded-xl"
                                            title="Cancel Request"
                                        >
                                            <Ban size={20} className="md:w-4 md:h-4" />
                                        </button>
                                    )}
                                    {viewingRequest.status === "PENDING" && (
                                        <button 
                                            onClick={() => handleEdit(viewingRequest)}
                                            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-bold text-sm active:scale-95 transition-all hover:bg-blue-100 md:h-9 md:rounded-xl md:text-[12.5px]"
                                        >
                                            <Edit className="w-4 h-4 md:w-3.5 md:h-3.5" /> Edit Request Details
                                        </button>
                                    )}
                                </div>

                                {(role && ["admin", "superadmin", "administrator", "supervisor"].includes(role)) && viewingRequest.status === "PENDING" && (
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <button 
                                            onClick={() => handleReject(viewingRequest.id)}
                                            className="py-4 rounded-full bg-red-500 text-white font-bold text-sm tracking-tight shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-600 md:py-2 md:h-9 md:rounded-xl md:text-[12.5px] md:shadow-none"
                                        >
                                            <X className="w-5 h-5 md:w-4 md:h-4" /> Reject
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(viewingRequest)}
                                            className="py-4 rounded-full bg-emerald-500 text-white font-bold text-sm tracking-tight shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-emerald-600 md:py-2 md:h-9 md:rounded-xl md:text-[12.5px] md:shadow-none"
                                        >
                                            <Check className="w-5 h-5 md:w-4 md:h-4" /> Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pb-10 md:px-5 md:py-4 md:pb-4">
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>Request Type *</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {(["LEAVE", "REIMBURSE", "KASBON"] as RequestType[]).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => {
                                                    setFormType(t);
                                                    if (t === "LEAVE") setFormAmount("");
                                                }}
                                                className={clsx(
                                                    "py-3 rounded-2xl text-xs font-bold border transition-all active:scale-[0.98]",
                                                    formType === t 
                                                        ? "bg-blue-600 text-white border-blue-600" 
                                                        : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50"
                                                )}
                                            >
                                                {t === "LEAVE" ? "Leave" : t === "REIMBURSE" ? "Reimburse" : "Kasbon"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Select 
                                    label="Crew Member *" 
                                    value={formCrew} 
                                    onChange={setFormCrew} 
                                    options={crewList.map(c => ({ value: c.id, label: c.name }))} 
                                    placeholder="Select crew member"
                                    accentColor="blue"
                                />

                                <Select 
                                    label="Project" 
                                    value={formProject} 
                                    onChange={setFormProject} 
                                    options={[
                                        { value: "", label: "No Project (Unassigned)" },
                                        ...projects.map(p => ({ value: p.code, label: `[${formatProjectCode(p.code)}] ${p.name}` }))
                                    ]} 
                                    placeholder="Select project code"
                                    accentColor="blue"
                                />

                                {formType !== "LEAVE" && (
                                    <div>
                                        <label className={labelClass}>Amount Requested (IDR) *</label>
                                        <input
                                            type="number"
                                            value={formAmount}
                                            onChange={e => setFormAmount(e.target.value)}
                                            placeholder="e.g. 150000"
                                            className={inputClass}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Start Date *</label>
                                        <input
                                            type="date"
                                            value={formStartDate}
                                            onChange={e => setFormStartDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>End Date *</label>
                                        <input
                                            type="date"
                                            value={formEndDate}
                                            onChange={e => setFormEndDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Reason / Notes *</label>
                                    <textarea
                                        value={formReason}
                                        onChange={e => setFormReason(e.target.value)}
                                        placeholder="Explain details of the request..."
                                        rows={4}
                                        className={clsx(inputClass, "resize-none py-3")}
                                    />
                                </div>

                                {formType !== "LEAVE" && (
                                    <div>
                                        <label className={labelClass}>Receipt / Proof of Payment</label>
                                        {formProofUrl ? (
                                            <div className="mt-2 flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 rounded-2xl">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 truncate">Receipt uploaded successfully</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormProofUrl("")}
                                                    className="text-xs text-red-500 font-bold hover:text-red-700 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-2">
                                                <input 
                                                    type="file" 
                                                    id="proof-upload" 
                                                    accept="image/*,application/pdf"
                                                    className="hidden" 
                                                    onChange={handleFileUpload}
                                                    disabled={uploading}
                                                />
                                                <label 
                                                    htmlFor="proof-upload"
                                                    className={clsx(
                                                        "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center group",
                                                        uploading 
                                                            ? "border-neutral-200 bg-neutral-50/50 pointer-events-none" 
                                                            : "border-neutral-200 hover:border-blue-400 dark:border-neutral-700 hover:bg-neutral-50/30"
                                                    )}
                                                >
                                                    {uploading ? (
                                                        <div className="py-2">
                                                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                                                            <p className="text-sm font-bold text-neutral-700">Uploading...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-10 h-10 mx-auto text-neutral-400 group-hover:text-blue-500 mb-3 transition-colors" strokeWidth={1.5} />
                                                            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Click to upload receipt</p>
                                                            <p className="text-xs text-neutral-400 mt-1 font-medium">JPG, PNG, PDF up to 5MB</p>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-none p-8 pt-4 bg-gradient-to-t from-white via-white to-transparent md:static md:p-5 md:bg-white md:dark:bg-neutral-900 flex-shrink-0">
                            <div className="flex gap-3">
                                {(viewingRequest && isEditing) ? (
                                    <>
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 h-16 rounded-full border border-neutral-200 bg-white text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-all active:scale-95 md:h-10 md:rounded-xl md:text-[13px]"
                                        >
                                            Cancel
                                        </button>
                                        <Button 
                                            variant="primary" 
                                            size="lg" 
                                            className="!bg-blue-600 hover:!bg-blue-700 !border-blue-600 !text-white flex-[2] rounded-full h-16 text-sm font-bold shadow-2xl shadow-blue-600/30 active:scale-95 transition-all md:h-10 md:rounded-xl md:text-[13px] md:shadow-none"
                                            onClick={handleSubmit}
                                        >
                                            Update Request
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        variant="primary" 
                                        size="lg" 
                                        fullWidth 
                                        className="!bg-blue-600 hover:!bg-blue-700 !border-blue-600 !text-white rounded-full h-16 text-sm font-bold shadow-2xl shadow-blue-600/30 active:scale-95 transition-all md:h-10 md:rounded-xl md:text-[13px] md:shadow-none"
                                        onClick={handleSubmit}
                                    >
                                        {editingId ? "Update Request" : "Submit Request"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );

        if (isDesktop && portalTarget) {
            return createPortal(drawerContent, portalTarget);
        }

        return (
            <div className="fixed inset-0 z-[100] isolate">
                <div className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" onClick={() => setShowDrawer(false)} />
                <div className="absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-500 rounded-[56px] bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px] flex flex-col overflow-hidden">
                    {drawerContent}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* HEADER REMOVED - Using Global PageHeader */}

            <SummaryCardsRow>
                <SummaryCard
                    icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-50"
                    label="Total Requests"
                    value={stats.total}
                    onClick={() => setActiveCard("ALL")}
                    isActive={activeCard === "ALL"}
                    activeBg="bg-blue-600"
                />
                <SummaryCard
                    icon={<Clock className="w-5 h-5 text-amber-600" />}
                    iconBg="bg-amber-50"
                    label="Pending"
                    value={stats.pending}
                    onClick={() => setActiveCard("PENDING")}
                    isActive={activeCard === "PENDING"}
                    activeBg="bg-amber-500"
                />
                <SummaryCard
                    icon={<Check className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-50"
                    label="Approved"
                    value={stats.approved}
                    onClick={() => setActiveCard("APPROVED")}
                    isActive={activeCard === "APPROVED"}
                    activeBg="bg-emerald-600"
                />
                <SummaryCard
                    icon={<X className="w-5 h-5 text-red-600" />}
                    iconBg="bg-red-50"
                    label="Rejected"
                    value={stats.rejected}
                    onClick={() => setActiveCard("REJECTED")}
                    isActive={activeCard === "REJECTED"}
                    activeBg="bg-red-600"
                />
            </SummaryCardsRow>

            {/* TOOLBAR */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full bg-neutral-100/50 p-2 rounded-full border border-neutral-200/50 backdrop-blur-sm">

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

                    {/* Period Selector & Project */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto pointer-events-auto z-10">
                        {/* Period Selection */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5 bg-white border border-neutral-200 rounded-full px-1 py-1 shadow-sm flex-shrink-0">
                                <button onClick={() => handlePeriodChange("prev")} className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                <span className="text-sm font-medium text-neutral-700 text-center select-none px-1 min-w-[120px] whitespace-nowrap">{formatDateShort(period.start)} - {formatDateShort(period.end)}</span>
                                <button onClick={() => handlePeriodChange("next")} className="p-1.5 rounded-full hover:bg-neutral-50 text-neutral-500"><ChevronRight className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex items-center bg-neutral-200/50 rounded-full p-1">
                                <button onClick={() => setViewMode("weekly")} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full transition-colors", viewMode === "weekly" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}>W</button>
                                <button onClick={() => setViewMode("monthly")} className={clsx("px-3 py-1.5 text-xs font-medium rounded-full transition-colors", viewMode === "monthly" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}>M</button>
                            </div>
                        </div>

                        {/* Project Select */}
                        {!forceProjectSuffix && (
                            <div className="flex-1 sm:flex-none sm:w-48">
                                <Select
                                    value={selectedProject}
                                    onChange={setSelectedProject}
                                    options={[{ value: "ALL", label: "All Projects" }, ...projects.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }))]}
                                    placeholder="Project"
                                />
                            </div>
                        )}
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

            {!loading && filtered.length === 0 && (
                <div className="bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 p-16 text-center shadow-sm animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FileCheck className="w-8 h-8 text-neutral-300" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 tracking-tight">No Requests Found</h3>
                    <p className="text-sm text-neutral-500 mb-8 max-w-[280px] mx-auto leading-relaxed font-medium">
                        There are no requests matching your filters or for the selected period.
                    </p>
                    <div className="flex justify-center">
                        <Button 
                            variant="primary" 
                            className="!bg-blue-600 hover:!bg-blue-700 !border-blue-600 !text-white rounded-full px-8 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                            icon={<Plus className="w-4 h-4" />} 
                            onClick={() => { resetForm(); setShowDrawer(true); }}
                        >
                            Submit New Request
                        </Button>
                    </div>
                </div>
            )}

            {/* CONTENT (TABLE & CARDS) */}
            {filtered.length > 0 && (
                <div className="space-y-4">
                    {/* MOBILE CARDS */}
                    <div className="lg:hidden space-y-3">
                        {filtered.map((r) => (
                            <div
                                key={r.id}
                                onClick={() => handleOpenRequest(r)}
                                className="bg-white/50 backdrop-blur-md rounded-3xl border border-white/40 p-5 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:bg-white/80"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-semibold shadow-sm">
                                            {getInitials(r.crewName)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-neutral-900">{r.crewName || "Unknown"}</div>
                                            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                                                {r.crewRole ? (CREW_ROLE_LABELS[r.crewRole]?.en || r.crewRole) : "-"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(r.status)}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 py-3 border-y border-black/[0.03]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getTypeBadge(r.type)}
                                            <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded font-bold text-neutral-600">{r.projectCode || "OFFICE"}</span>
                                        </div>
                                        <div className="text-right">
                                            {r.type === "LEAVE" ? (
                                                <div className="text-xs font-bold text-neutral-700">
                                                    {formatDate(r.startDate)} → {r.endDate ? formatDate(r.endDate) : "?"}
                                                </div>
                                            ) : (
                                                <div className="text-sm font-black text-blue-600 tracking-tight">
                                                    Rp {r.amount ? formatNum(r.amount) : "0"}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {(r.reason || r.proofUrl) && (
                                        <div className="flex items-center justify-between gap-3">
                                            {r.reason && <p className="text-[11px] text-neutral-500 italic line-clamp-1 flex-1">"{r.reason}"</p>}
                                            {r.proofUrl && (
                                                <a href={r.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline italic shrink-0">
                                                    <FileText className="w-3 h-3" />
                                                    View Proof
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-[10px] font-bold text-neutral-400 italic">
                                        Requested: {new Date(r.createdAt).toLocaleDateString("id-ID")}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {(role && ["admin", "superadmin", "administrator", "supervisor"].includes(role)) && r.status === "PENDING" && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); handleApprove(r); }} className="p-2.5 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleReject(r.id); }} className="p-2.5 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-90 transition-all">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {r.status === "PENDING" && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} className="p-2.5 rounded-full bg-blue-50 text-blue-600 active:scale-90 transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleCancel(r.id); }} className="p-2.5 rounded-full bg-amber-50 text-amber-600 active:scale-90 transition-all">
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-2.5 rounded-full bg-neutral-100 text-neutral-500 active:scale-90 transition-all">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
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
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase">Name</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden sm:table-cell">Project</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("type")}><div className="flex items-center gap-1">Type <SortIcon c="type" /></div></th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase hidden md:table-cell">Details</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-600 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort("status")}><div className="flex items-center justify-center gap-1">Status <SortIcon c="status" /></div></th>
                                        {(role && ["pm", "admin", "superadmin", "administrator", "supervisor"].includes(role)) && <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase w-24">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filtered.map(r => (
                                        <tr 
                                            key={r.id} 
                                            onClick={() => handleOpenRequest(r)}
                                            className="hover:bg-neutral-50 transition-colors cursor-pointer group"
                                        >
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
                                                <div className="max-w-xs">
                                                    {r.type === "LEAVE" ? (
                                                        <div className="text-neutral-900 font-medium text-xs">{formatDate(r.startDate)} → {r.endDate ? formatDate(r.endDate) : "?"}</div>
                                                    ) : (
                                                        <div className="text-blue-600 font-bold text-sm">Rp {r.amount ? formatNum(r.amount) : "0"}</div>
                                                    )}
                                                    {r.reason && <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5" title={r.reason}>{r.reason}</p>}
                                                    {r.proofUrl && (
                                                        <a 
                                                            href={r.proofUrl} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline mt-1 font-bold italic"
                                                        >
                                                            <FileText className="w-3 h-3" />
                                                            View Proof
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {(role && ["admin", "superadmin", "administrator", "supervisor"].includes(role)) && r.status === "PENDING" && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleApprove(r); }} className="p-1.5 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleReject(r.id); }} className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200" title="Reject"><X className="w-3.5 h-3.5" /></button>
                                                        </>
                                                    )}
                                                    {r.status === "PENDING" && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleCancel(r.id); }} className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200" title="Cancel"><Ban className="w-3.5 h-3.5" /></button>
                                                        </>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200" title="Delete"><Trash className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {renderDrawer()}
        </div>
    );
}
