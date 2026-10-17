"use client";

import React, { useState, useEffect } from "react";
import { ProjectReport, ReportStatus } from "@/types/project";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { ModalRoot, ModalHeader, ModalFooter } from "@/shared/ui/modal";
import { Loader2, Plus, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import clsx from "clsx";

interface ReportFormProps {
    projectId?: string;
    initialData?: ProjectReport;
    defaultType?: "daily" | "weekly" | "monthly";
    onClose: (shouldRefresh: boolean) => void;
}

interface ProjectDropdownOption {
    id: string;
    name: string;
}

export default function ReportForm({ projectId: propProjectId, initialData, defaultType = "daily", onClose }: ReportFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [projects, setProjects] = useState<ProjectDropdownOption[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    // Form State
    const [selectedProjectId, setSelectedProjectId] = useState(initialData?.projectId || propProjectId || "");
    const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">(initialData?.reportType || defaultType);
    const [title, setTitle] = useState(initialData?.title || "");
    const [reportDate, setReportDate] = useState(initialData?.reportDate || new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState(initialData?.progress?.toString() || "0");
    const [status, setStatus] = useState<ReportStatus>(initialData?.status || "on-track");
    
    // Generic Content State (used for Weekly & Monthly, or Legacy Daily)
    const [content, setContent] = useState(initialData?.content || "");

    // --- DAILY TEMPLATE STATES ---
    const [activeTab, setActiveTab] = useState<"general" | "workItems" | "personnel" | "weather">("general");

    const [dayNumber, setDayNumber] = useState("");
    const [totalDays, setTotalDays] = useState("");
    const [remainingDays, setRemainingDays] = useState("");
    const [workPackage, setWorkPackage] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [revision, setRevision] = useState("00");

    // Dynamic Work Items
    const [workItems, setWorkItems] = useState<{ description: string; position: string; volume: string }[]>([
        { description: "", position: "", volume: "" }
    ]);

    // Personnel
    const [pmCount, setPmCount] = useState("");
    const [smCount, setSmCount] = useState("");
    const [supervisorCount, setSupervisorCount] = useState("");
    const [mandorCount, setMandorCount] = useState("");
    const [tukangCount, setTukangCount] = useState("");
    const [pekerjaCount, setPekerjaCount] = useState("");
    const [operatorCount, setOperatorCount] = useState("");

    // Work Hours (Shift hours)
    const [shift1Hours, setShift1Hours] = useState("");
    const [shift2Hours, setShift2Hours] = useState("");
    const [shift3Hours, setShift3Hours] = useState("");

    // Weather
    const [weatherPagi, setWeatherPagi] = useState("");
    const [weatherSiang, setWeatherSiang] = useState("");
    const [weatherSore, setWeatherSore] = useState("");
    const [weatherMalam, setWeatherMalam] = useState("");

    // Signatures and Notes
    const [approvedBy, setApprovedBy] = useState("");
    const [preparedBy, setPreparedBy] = useState("");
    const [notes, setNotes] = useState("");

    // Fetch projects list
    useEffect(() => {
        if (!propProjectId && !initialData?.projectId) {
            const fetchProjectsList = async () => {
                setLoadingProjects(true);
                try {
                    const { data, error } = await supabase
                        .from("projects")
                        .select("id, project_name")
                        .order("project_name");

                    if (error) throw error;
                    setProjects((data || []).map(p => ({
                        id: p.id,
                        name: p.project_name
                    })));
                } catch (err) {
                    console.error("Failed to load projects list:", err);
                } finally {
                    setLoadingProjects(false);
                }
            };
            fetchProjectsList();
        }
    }, [propProjectId, initialData]);

    // Parse initialData if it holds template JSON structure
    useEffect(() => {
        if (initialData?.content && reportType === "daily") {
            try {
                const parsed = JSON.parse(initialData.content);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    setDayNumber(parsed.dayNumber?.toString() || "");
                    setTotalDays(parsed.totalDays?.toString() || "");
                    setRemainingDays(parsed.remainingDays?.toString() || "");
                    setWorkPackage(parsed.workPackage || "");
                    setDocumentId(parsed.documentId || "");
                    setRevision(parsed.revision || "00");
                    setWorkItems(parsed.workItems || [{ description: "", position: "", volume: "" }]);
                    
                    const p = parsed.personnel || {};
                    setPmCount(p.projectManager?.toString() || "");
                    setSmCount(p.siteManager?.toString() || "");
                    setSupervisorCount(p.supervisor?.toString() || "");
                    setMandorCount(p.mandor?.toString() || "");
                    setTukangCount(p.tukang?.toString() || "");
                    setPekerjaCount(p.pekerja?.toString() || "");
                    setOperatorCount(p.operator?.toString() || "");

                    const wh = parsed.workHours || {};
                    setShift1Hours(wh.shift1?.toString() || "");
                    setShift2Hours(wh.shift2?.toString() || "");
                    setShift3Hours(wh.shift3?.toString() || "");

                    const w = parsed.weather || {};
                    setWeatherPagi(w.pagi || "");
                    setWeatherSiang(w.siang || "");
                    setWeatherSore(w.sore || "");
                    setWeatherMalam(w.malam || "");

                    setApprovedBy(parsed.approvedBy || "");
                    setPreparedBy(parsed.preparedBy || "");
                    setNotes(parsed.notes || "");
                } else {
                    setContent(initialData.content);
                }
            } catch (e) {
                // Not JSON - fallback to legacy text
                setContent(initialData.content);
            }
        }
    }, [initialData, reportType]);

    // Work Item Helpers
    const handleAddWorkItem = () => {
        setWorkItems([...workItems, { description: "", position: "", volume: "" }]);
    };

    const handleRemoveWorkItem = (index: number) => {
        if (workItems.length === 1) {
            setWorkItems([{ description: "", position: "", volume: "" }]);
            return;
        }
        setWorkItems(workItems.filter((_, i) => i !== index));
    };

    const handleWorkItemChange = (index: number, key: keyof typeof workItems[0], val: string) => {
        const copy = [...workItems];
        copy[index][key] = val;
        setWorkItems(copy);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId) {
            alert("Please select a project.");
            return;
        }

        setIsLoading(true);

        try {
            // Aggregate values for native columns to maintain dashboard compatibility
            let computedManpower: number | null = null;
            let summaryWeather: string | null = null;
            let finalContent = content;

            if (reportType === "daily") {
                // Compute total manpower
                const pm = parseInt(pmCount) || 0;
                const sm = parseInt(smCount) || 0;
                const sv = parseInt(supervisorCount) || 0;
                const md = parseInt(mandorCount) || 0;
                const tk = parseInt(tukangCount) || 0;
                const pk = parseInt(pekerjaCount) || 0;
                const op = parseInt(operatorCount) || 0;
                computedManpower = pm + sm + sv + md + tk + pk + op;

                // Pick representative weather
                summaryWeather = weatherSiang || weatherPagi || weatherSore || "Cerah";

                // Serialize template state
                const templateData = {
                    dayNumber: dayNumber ? parseInt(dayNumber) : null,
                    totalDays: totalDays ? parseInt(totalDays) : null,
                    remainingDays: remainingDays ? parseInt(remainingDays) : null,
                    workPackage,
                    documentId,
                    revision,
                    workItems,
                    personnel: {
                        projectManager: pm,
                        siteManager: sm,
                        supervisor: sv,
                        mandor: md,
                        tukang: tk,
                        pekerja: pk,
                        operator: op
                    },
                    workHours: {
                        shift1: shift1Hours ? parseFloat(shift1Hours) : 0,
                        shift2: shift2Hours ? parseFloat(shift2Hours) : 0,
                        shift3: shift3Hours ? parseFloat(shift3Hours) : 0
                    },
                    weather: {
                        pagi: weatherPagi,
                        siang: weatherSiang,
                        sore: weatherSore,
                        malam: weatherMalam
                    },
                    notes,
                    approvedBy,
                    preparedBy
                };
                finalContent = JSON.stringify(templateData);
            }

            const payload = {
                project_id: selectedProjectId,
                report_type: reportType,
                title,
                report_date: reportDate,
                progress: parseFloat(progress) || 0,
                status,
                manpower_count: reportType === "daily" ? computedManpower : null,
                weather_condition: reportType === "daily" ? summaryWeather : null,
                content: finalContent || null,
                updated_at: new Date().toISOString(),
            };

            const { data: { user } } = await supabase.auth.getUser();

            if (!initialData) {
                // Insert new report
                const { error } = await supabase.from("project_reports").insert({
                    ...payload,
                    created_by: user?.id
                });
                if (error) throw error;
            } else {
                // Update existing report
                const { error } = await supabase.from("project_reports").update(payload).eq("id", initialData.id);
                if (error) throw error;
            }

            onClose(true);
        } catch (error) {
            console.error("Error saving report:", error);
            alert("Failed to save report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const weatherOptions = [
        { value: "", label: "-- Select Weather --" },
        { value: "cerah", label: "Cerah" },
        { value: "berawan", label: "Berawan" },
        { value: "hujan", label: "Hujan" }
    ];

    return (
        <ModalRoot open={true} onOpenChange={(open) => !open && onClose(false)}>
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-neutral-200 dark:border-neutral-800">
                <ModalHeader
                    title={initialData ? "Edit Report" : `New ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
                    subtitle="Document work progress, conditions, and activities."
                    onClose={() => onClose(false)}
                />

                {/* Sub tabs inside modal specifically for structured Daily report */}
                {reportType === "daily" && (
                    <div className="flex border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 px-6 overflow-x-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab("general")}
                            className={clsx(
                                "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all",
                                activeTab === "general"
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
                            )}
                        >
                            Info Umum
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("workItems")}
                            className={clsx(
                                "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all",
                                activeTab === "workItems"
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
                            )}
                        >
                            Uraian Pekerjaan ({workItems.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("personnel")}
                            className={clsx(
                                "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all",
                                activeTab === "personnel"
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
                            )}
                        >
                            Tenaga Kerja & Shift
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("weather")}
                            className={clsx(
                                "px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all",
                                activeTab === "weather"
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
                            )}
                        >
                            Cuaca & Tanda Tangan
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* WEEKLY AND MONTHLY GENERAL FORM (NON-DAILY) */}
                    {reportType !== "daily" && (
                        <div className="space-y-5">
                            {!(propProjectId || initialData?.projectId) ? (
                                <Select
                                    label="Project *"
                                    value={selectedProjectId}
                                    onChange={(val) => setSelectedProjectId(val)}
                                    options={[
                                        { value: "", label: "-- Select Project --" },
                                        ...projects.map(p => ({ value: p.id, label: p.name }))
                                    ]}
                                    disabled={loadingProjects}
                                    required
                                />
                            ) : (
                                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Project context</span>
                                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Active Locked Project</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {!initialData ? (
                                    <Select
                                        label="Report Type *"
                                        value={reportType}
                                        onChange={(val) => setReportType(val as any)}
                                        options={[
                                            { value: "daily", label: "Daily (Harian)" },
                                            { value: "weekly", label: "Weekly (Mingguan)" },
                                            { value: "monthly", label: "Monthly (Bulanan)" },
                                        ]}
                                        required
                                    />
                                ) : (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Report type</span>
                                        <span className="text-sm font-semibold capitalize text-neutral-700 dark:text-neutral-300">{reportType} Report</span>
                                    </div>
                                )}

                                <Input
                                    label="Date *"
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    required
                                />
                            </div>

                            <Input
                                label="Report Title *"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Weekly Summary Report"
                                required
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Select
                                    label="Status *"
                                    value={status}
                                    onChange={(val) => setStatus(val as ReportStatus)}
                                    options={[
                                        { value: "on-track", label: "On Track" },
                                        { value: "delayed", label: "Delayed" },
                                        { value: "critical", label: "Critical" },
                                        { value: "completed", label: "Completed" },
                                    ]}
                                />
                                <Input
                                    label="Progress Estimate (%) *"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                                    Content Description
                                </label>
                                <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden min-h-[200px]">
                                    <RichTextEditor value={content} onChange={setContent} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DAILY STRUCTURED FORM WITH TABS */}
                    {reportType === "daily" && (
                        <div className="space-y-5">
                            
                            {/* TAB 1: INFO UMUM */}
                            {activeTab === "general" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    {!(propProjectId || initialData?.projectId) ? (
                                        <Select
                                            label="Project *"
                                            value={selectedProjectId}
                                            onChange={(val) => setSelectedProjectId(val)}
                                            options={[
                                                { value: "", label: "-- Select Project --" },
                                                ...projects.map(p => ({ value: p.id, label: p.name }))
                                            ]}
                                            disabled={loadingProjects}
                                            required
                                        />
                                    ) : (
                                        <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Project context</span>
                                            <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Active Locked Project</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {!initialData ? (
                                            <Select
                                                label="Report Type *"
                                                value={reportType}
                                                onChange={(val) => setReportType(val as any)}
                                                options={[
                                                    { value: "daily", label: "Daily (Harian)" },
                                                    { value: "weekly", label: "Weekly (Mingguan)" },
                                                    { value: "monthly", label: "Monthly (Bulanan)" },
                                                ]}
                                                required
                                            />
                                        ) : (
                                            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Report type</span>
                                                <span className="text-sm font-semibold capitalize text-neutral-700 dark:text-neutral-300">{reportType} Report</span>
                                            </div>
                                        )}

                                        <Input
                                            label="Report Date *"
                                            type="date"
                                            value={reportDate}
                                            onChange={(e) => setReportDate(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <Input
                                        label="Report Title *"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Laporan Harian - LHS-00-01"
                                        required
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Select
                                            label="Status *"
                                            value={status}
                                            onChange={(val) => setStatus(val as ReportStatus)}
                                            options={[
                                                { value: "on-track", label: "On Track" },
                                                { value: "delayed", label: "Delayed" },
                                                { value: "critical", label: "Critical" },
                                                { value: "completed", label: "Completed" },
                                            ]}
                                        />
                                        <Input
                                            label="Physical Progress (%) *"
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={progress}
                                            onChange={(e) => setProgress(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 grid grid-cols-3 gap-4">
                                        <Input
                                            label="Hari Ke-"
                                            type="number"
                                            value={dayNumber}
                                            onChange={(e) => setDayNumber(e.target.value)}
                                            placeholder="e.g. 1"
                                        />
                                        <Input
                                            label="Total Hari"
                                            type="number"
                                            value={totalDays}
                                            onChange={(e) => setTotalDays(e.target.value)}
                                            placeholder="e.g. 150"
                                        />
                                        <Input
                                            label="Sisa Hari"
                                            type="number"
                                            value={remainingDays}
                                            onChange={(e) => setRemainingDays(e.target.value)}
                                            placeholder="e.g. 149"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <Input
                                                label="Tahap/Paket Pekerjaan"
                                                value={workPackage}
                                                onChange={(e) => setWorkPackage(e.target.value)}
                                                placeholder="e.g. STRUKTUR - PEKERJAAN PERSIAPAN"
                                            />
                                        </div>
                                        <Input
                                            label="Doc ID / Code"
                                            value={documentId}
                                            onChange={(e) => setDocumentId(e.target.value)}
                                            placeholder="e.g. LHS-00-01"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <Input
                                            label="Revision (REV)"
                                            value={revision}
                                            onChange={(e) => setRevision(e.target.value)}
                                            placeholder="e.g. 00"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: URAIAN PEKERJAAN */}
                            {activeTab === "workItems" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Daftar Uraian Pekerjaan</span>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            icon={<Plus className="w-3.5 h-3.5" />}
                                            onClick={handleAddWorkItem}
                                        >
                                            Add Work Item
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {workItems.map((item, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-end gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl border border-neutral-100 dark:border-neutral-800"
                                            >
                                                <div className="text-xs font-bold text-neutral-400 self-center pl-1 w-6">{idx + 1}.</div>
                                                
                                                <div className="flex-1">
                                                    <Input
                                                        label="Uraian Pekerjaan"
                                                        value={item.description}
                                                        onChange={(e) => handleWorkItemChange(idx, "description", e.target.value)}
                                                        placeholder="e.g. Pekerjaan pondasi bored pile"
                                                    />
                                                </div>
                                                <div className="w-28">
                                                    <Input
                                                        label="Posisi / As"
                                                        value={item.position}
                                                        onChange={(e) => handleWorkItemChange(idx, "position", e.target.value)}
                                                        placeholder="e.g. As A-C/1-3"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Input
                                                        label="Volume"
                                                        value={item.volume}
                                                        onChange={(e) => handleWorkItemChange(idx, "volume", e.target.value)}
                                                        placeholder="e.g. 15 m3"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveWorkItem(idx)}
                                                    className="p-2.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 mb-0.5 transition-colors"
                                                    title="Remove Row"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: TENAGA KERJA & SHIFT */}
                            {activeTab === "personnel" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div>
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Jumlah Personel (Tenaga Kerja)</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <Input
                                                label="Project Manager"
                                                type="number"
                                                value={pmCount}
                                                onChange={(e) => setPmCount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <Input
                                                label="Site Manager"
                                                type="number"
                                                value={smCount}
                                                onChange={(e) => setSmCount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <Input
                                                label="Supervisor"
                                                type="number"
                                                value={supervisorCount}
                                                onChange={(e) => setSupervisorCount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <Input
                                                label="Mandor"
                                                type="number"
                                                value={mandorCount}
                                                onChange={(e) => setMandorCount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <Input
                                                label="Tukang"
                                                type="number"
                                                value={tukangCount}
                                                onChange={(e) => setTukangCount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <Input
                                                label="Pekerja"
                                                type="number"
                                                value={pekerjaCount}
                                                onChange={(e) => setPekerjaCount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <Input
                                                label="Operator"
                                                type="number"
                                                value={operatorCount}
                                                onChange={(e) => setOperatorCount(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Waktu Kerja (Shift & Jam Kerja)</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <Input
                                                label="Shift 1 (08.00-17.00) - Jam"
                                                type="number"
                                                value={shift1Hours}
                                                onChange={(e) => setShift1Hours(e.target.value)}
                                                placeholder="e.g. 8"
                                            />
                                            <Input
                                                label="Shift 2 (19.00-00.00) - Jam"
                                                type="number"
                                                value={shift2Hours}
                                                onChange={(e) => setShift2Hours(e.target.value)}
                                                placeholder="e.g. 5"
                                            />
                                            <Input
                                                label="Shift 3 (00.00-05.00) - Jam"
                                                type="number"
                                                value={shift3Hours}
                                                onChange={(e) => setShift3Hours(e.target.value)}
                                                placeholder="e.g. 5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: CUACA, CATATAN & TANDA TANGAN */}
                            {activeTab === "weather" && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div>
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Kondisi Cuaca Hari Ini</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <Select
                                                label="Pagi"
                                                value={weatherPagi}
                                                onChange={setWeatherPagi}
                                                options={weatherOptions}
                                            />
                                            <Select
                                                label="Siang"
                                                value={weatherSiang}
                                                onChange={setWeatherSiang}
                                                options={weatherOptions}
                                            />
                                            <Select
                                                label="Sore"
                                                value={weatherSore}
                                                onChange={setWeatherSore}
                                                options={weatherOptions}
                                            />
                                            <Select
                                                label="Malam"
                                                value={weatherMalam}
                                                onChange={setWeatherMalam}
                                                options={weatherOptions}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                        <Input
                                            label="Disusun oleh (Arsitek/Pengawas)"
                                            value={preparedBy}
                                            onChange={(e) => setPreparedBy(e.target.value)}
                                            placeholder="e.g. Adi Nur Khamim"
                                        />
                                        <Input
                                            label="Disetujui oleh (Project Manager)"
                                            value={approvedBy}
                                            onChange={(e) => setApprovedBy(e.target.value)}
                                            placeholder="e.g. Erwin Firdaus"
                                        />
                                    </div>

                                    <div className="space-y-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                        <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                                            Catatan / Rekomendasi
                                        </label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/[0.08] focus:border-orange-500/20 transition-all resize-y"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Tulis catatan, kendala, atau rekomendasi di sini..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>

                <ModalFooter className="border-t border-neutral-100 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-900/30">
                    <div className="flex justify-between items-center w-full">
                        {reportType === "daily" && (
                            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-2">
                                Tab: {activeTab === "general" ? "Info Umum" : activeTab === "workItems" ? "Uraian Kerja" : activeTab === "personnel" ? "Tenaga & Shift" : "Cuaca & Ttd"}
                            </div>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <Button variant="ghost" onClick={() => onClose(false)}>Cancel</Button>
                            <Button onClick={handleSubmit as any} disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Report
                            </Button>
                        </div>
                    </div>
                </ModalFooter>
            </div>
        </ModalRoot>
    );
}
