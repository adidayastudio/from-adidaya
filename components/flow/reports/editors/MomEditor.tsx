"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Plus, Trash2, Globe } from "lucide-react";
import clsx from "clsx";

interface ProjectDropdownOption {
    id: string;
    name: string;
    location?: string;
    project_code: string;
    project_number?: string;
}

interface MomEditorProps {
    projects: ProjectDropdownOption[];
    currentProject: ProjectDropdownOption | null;
    selectedProjectId: string;
    setSelectedProjectId: (val: string) => void;
    locationOverride: string;
    setLocationOverride: (val: string) => void;
    paramProjectId: string | null;
    paramId: string | null;
    reportData: string | null;
    isSaving: boolean;
    setIsSaving: (val: boolean) => void;
    renderPageHeader: (code: string, docCode: string, title: string) => React.ReactNode;
    documentId: string;
    setDocumentId: (val: string) => void;
    revision: string;
    setRevision: (val: string) => void;
    reportDate: string;
    setReportDate: (val: string) => void;
    registerSaveHandler: (handler: () => string) => void;
    isPreviewOnly?: boolean;
    momActiveTab?: "setup" | "mom_discussion" | "mom_decisions" | "mom_actions" | "mom_prev_actions";
    setMomActiveTab?: (val: "setup" | "mom_discussion" | "mom_decisions" | "mom_actions" | "mom_prev_actions") => void;
    momLangMode?: "bilingual" | "id" | "en";
    setMomLangMode?: (val: "bilingual" | "id" | "en") => void;
}

const getPresenceColor = (presence?: string) => {
    const val = (presence || "").toLowerCase();
    if (val.includes("absen") || val.includes("absent")) return "text-rose-600 dark:text-rose-400";
    if (val.includes("diwakilkan") || val.includes("proxy") || val.includes("represented")) return "text-purple-600 dark:text-purple-400";
    return "text-emerald-600 dark:text-emerald-400";
};

const getStatusColor = (status?: string) => {
    const val = (status || "").toLowerCase();
    if (val.includes("progress")) return "text-blue-600 dark:text-blue-400";
    if (val.includes("closed")) return "text-emerald-600 dark:text-emerald-400";
    return "text-neutral-400 dark:text-neutral-500";
};

const getPriorityColor = (priority?: string) => {
    const val = (priority || "").toLowerCase();
    if (val.includes("urgent")) return "text-rose-600 dark:text-rose-400 font-extrabold";
    if (val.includes("high")) return "text-orange-500 dark:text-orange-400 font-bold";
    if (val.includes("medium")) return "text-blue-500 dark:text-blue-400 font-bold";
    return "text-neutral-400 dark:text-neutral-500 font-normal";
};

const getLangText = (mode: "bilingual" | "id" | "en", enStr: string, idStr: string) => {
    if (mode === "id") return idStr;
    if (mode === "en") return enStr;
    if (enStr === idStr) return enStr;
    return `${enStr} / ${idStr}`;
};

const getLangNode = getLangText;

export function MomEditor({
    projects,
    currentProject,
    selectedProjectId,
    setSelectedProjectId,
    locationOverride,
    setLocationOverride,
    paramProjectId,
    paramId,
    reportData,
    isSaving,
    setIsSaving,
    renderPageHeader,
    documentId,
    setDocumentId,
    revision,
    setRevision,
    reportDate,
    setReportDate,
    registerSaveHandler,
    isPreviewOnly = false,
    momActiveTab: propMomActiveTab,
    setMomActiveTab: propSetMomActiveTab,
    momLangMode: propMomLangMode,
    setMomLangMode: propSetMomLangMode
}: MomEditorProps) {
    
    // States
    const [localActiveTab, setLocalActiveTab] = useState<"setup" | "mom_discussion" | "mom_decisions" | "mom_actions" | "mom_prev_actions">("setup");
    const [localLangMode, setLocalLangMode] = useState<"bilingual" | "id" | "en">("bilingual");

    const momActiveTab = propMomActiveTab !== undefined ? propMomActiveTab : localActiveTab;
    const setMomActiveTab = propSetMomActiveTab !== undefined ? propSetMomActiveTab : setLocalActiveTab;
    const momLangMode = propMomLangMode !== undefined ? propMomLangMode : localLangMode;
    const setMomLangMode = propSetMomLangMode !== undefined ? propSetMomLangMode : setLocalLangMode;
    const [momDetails, setMomDetails] = useState<{
        agenda: string; date: string; location: string; meetingType: string;
        startTime: string; endTime: string;
    }>({
        agenda: "",
        date: reportDate,
        location: locationOverride || "",
        meetingType: "",
        startTime: "",
        endTime: ""
    });
    
    const [momParticipants, setMomParticipants] = useState<{
        name: string; company: string; position: string; presence: string;
    }[]>([
        { name: "", company: "", position: "", presence: "Hadir / Present" }
    ]);
    
    const [momDiscussions, setMomDiscussions] = useState<{
        topic: string; discussion: string; reference: string; concern: string;
    }[]>([
        { topic: "", discussion: "", reference: "", concern: "" }
    ]);
    
    const [momDecisions, setMomDecisions] = useState<{
        decision: string; direction: string; authority: string;
    }[]>([
        { decision: "", direction: "", authority: "" }
    ]);
    
    const [momActions, setMomActions] = useState<{
        action: string; pic: string; dueDate: string; priority: string; status: string;
    }[]>([
        { action: "", pic: "", dueDate: "", priority: "Medium", status: "Open" }
    ]);
    
    const [momPrevActions, setMomPrevActions] = useState<{
        previousItem: string; currentStatus: string; carryOver: string; closure: string;
    }[]>([
        { previousItem: "", currentStatus: "", carryOver: "Tidak", closure: "Closed" }
    ]);

    const [momApprovals, setMomApprovals] = useState<{
        type: "disusun" | "dicek" | "mengetahui" | "disetujui"; name: string; role: string;
    }[]>([
        { type: "disusun", name: "", role: "Notulis / Project Secretary" },
        { type: "dicek", name: "", role: "Lead Engineer / MK" },
        { type: "disetujui", name: "", role: "Project Manager" }
    ]);

    // Track date prop alignment
    useEffect(() => {
        if (reportDate !== momDetails.date) {
            setMomDetails(prev => ({ ...prev, date: reportDate }));
        }
    }, [reportDate]);

    useEffect(() => {
        if (locationOverride !== momDetails.location) {
            setMomDetails(prev => ({ ...prev, location: locationOverride }));
        }
    }, [locationOverride]);

    // Restore loaded data
    useEffect(() => {
        if (reportData) {
            try {
                const parsed = JSON.parse(reportData);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    if (parsed.momLangMode) setMomLangMode(parsed.momLangMode);
                    if (parsed.momDetails) {
                        setMomDetails(parsed.momDetails);
                        if (parsed.momDetails.date) setReportDate(parsed.momDetails.date);
                        if (parsed.momDetails.location) setLocationOverride(parsed.momDetails.location);
                    }
                    if (parsed.momParticipants && Array.isArray(parsed.momParticipants)) setMomParticipants(parsed.momParticipants);
                    if (parsed.momDiscussions && Array.isArray(parsed.momDiscussions)) setMomDiscussions(parsed.momDiscussions);
                    if (parsed.momDecisions && Array.isArray(parsed.momDecisions)) setMomDecisions(parsed.momDecisions);
                    if (parsed.momActions && Array.isArray(parsed.momActions)) setMomActions(parsed.momActions);
                    if (parsed.momPrevActions && Array.isArray(parsed.momPrevActions)) setMomPrevActions(parsed.momPrevActions);
                    if (parsed.momApprovals && Array.isArray(parsed.momApprovals)) setMomApprovals(parsed.momApprovals);
                }
            } catch (e) {
                console.error("Error parsing loaded MOM report content:", e);
            }
        }
    }, [reportData, setReportDate, setLocationOverride]);

    // Register compile hook for handleSave
    useEffect(() => {
        registerSaveHandler(() => {
            return JSON.stringify({
                momLangMode,
                momDetails,
                momParticipants,
                momDiscussions,
                momDecisions,
                momActions,
                momPrevActions,
                momApprovals
            });
        });
    }, [
        momLangMode,
        momDetails,
        momParticipants,
        momDiscussions,
        momDecisions,
        momActions,
        momPrevActions,
        momApprovals,
        registerSaveHandler
    ]);

    // For rendering preview-only screen
    if (isPreviewOnly) {
        return renderPreview();
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">


            {/* FORM VIEWPORTS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {momActiveTab === "setup" && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                            <span className="text-xs font-black text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wider">1. Meeting Details & Participants / Detail Rapat & Peserta</span>
                            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">MOM-SETUP</span>
                        </div>
                        <Select label="Proyek / Project *" value={selectedProjectId} onChange={(val) => { setSelectedProjectId(val); if (!paramId) { const proj = projects.find(p => p.id === val); if (proj?.location) setLocationOverride(proj.location); } }} options={[{ value: "", label: "-- Pilih Proyek / Select Project --" }, ...projects.map(p => ({ value: p.id, label: p.project_code ? `[${p.project_code}] ${p.name}` : p.name }))]} disabled={!!paramProjectId} required />
                        <Input label="Agenda Rapat / Agenda" value={momDetails.agenda} onChange={(e) => setMomDetails({ ...momDetails, agenda: e.target.value })} placeholder="Rapat koordinasi mingguan progres" />
                        
                        <div className="grid grid-cols-3 gap-3">
                            <Input label="Tanggal / Date" type="date" value={momDetails.date} onChange={(e) => { setMomDetails({ ...momDetails, date: e.target.value }); setReportDate(e.target.value); }} />
                            <Input label="Jam Mulai / Start Time" type="time" value={momDetails.startTime || ""} onChange={(e) => setMomDetails({ ...momDetails, startTime: e.target.value })} />
                            <Input label="Jam Selesai / End Time" type="time" value={momDetails.endTime || ""} onChange={(e) => setMomDetails({ ...momDetails, endTime: e.target.value })} />
                        </div>
                        {momDetails.startTime && momDetails.endTime && momDetails.startTime > momDetails.endTime && (
                            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-0.5 px-1 animate-in fade-in duration-200">
                                ⚠️ Jam selesai tidak boleh mendahului jam mulai / End time cannot be earlier than start time
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Location/Platform / Lokasi/Platform" value={momDetails.location} onChange={(e) => { setMomDetails({ ...momDetails, location: e.target.value }); setLocationOverride(e.target.value); }} placeholder="Tulis lokasi atau platform rapat..." />
                            <Input label="Jenis Rapat / Meeting Type" value={momDetails.meetingType} onChange={(e) => setMomDetails({ ...momDetails, meetingType: e.target.value })} placeholder="Weekly Progress" />
                        </div>

                        {/* List Peserta */}
                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3.5">
                            <span className="text-xs font-black text-neutral-850 dark:text-neutral-200 uppercase tracking-wider block">Daftar Peserta Rapat ({momParticipants.length})</span>
                            {momParticipants.map((p, idx) => (
                                <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-fuchsia-600 uppercase">Peserta #{idx + 1}</span>
                                        {momParticipants.length > 1 && (
                                            <button type="button" onClick={() => setMomParticipants(momParticipants.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600 p-0.5">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <Input label="Nama Lengkap" value={p.name} onChange={(e) => setMomParticipants(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} placeholder="Ir. Ahmad Subagyo" />
                                        <Input label="Company/Institution / Perusahaan/Instansi" value={p.company} onChange={(e) => setMomParticipants(prev => prev.map((it, i) => i === idx ? { ...it, company: e.target.value } : it))} placeholder="PT Adidaya Studio" />
                                        <Input label="Position/Role / Jabatan/Peran" value={p.position} onChange={(e) => setMomParticipants(prev => prev.map((it, i) => i === idx ? { ...it, position: e.target.value } : it))} placeholder="Project Manager" />
                                        <Select label="Kehadiran" value={p.presence} onChange={(val) => setMomParticipants(prev => prev.map((it, i) => i === idx ? { ...it, presence: val } : it))} options={[{ value: "Hadir / Present", label: "Hadir / Present" }, { value: "Absen / Absent", label: "Absen / Absent" }, { value: "Diwakilkan / Proxy", label: "Diwakilkan / Proxy" }]} />
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setMomParticipants([...momParticipants, { name: "", company: "", position: "", presence: "Hadir / Present" }])}
                                className="w-full py-2 text-xs font-bold text-fuchsia-600 bg-fuchsia-50/80 dark:bg-fuchsia-950/20 rounded-xl border border-fuchsia-200/60 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                                <Plus className="w-3.5 h-3.5" /> Tambah Peserta / Add Participant
                            </button>
                        </div>

                        {/* Signatures */}
                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                            <span className="text-xs font-black text-neutral-850 dark:text-neutral-200 uppercase tracking-wider block">Verifikasi & Tanda Tangan Laporan (TTD)</span>
                            <div className="grid grid-cols-3 gap-3">
                                {momApprovals.map((app, idx) => (
                                    <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-2 relative">
                                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                                            <span className="text-[9px] font-black uppercase text-neutral-400">{app.type}</span>
                                            {momApprovals.length > 1 && (
                                                <button type="button" onClick={() => setMomApprovals(momApprovals.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <Input label="Nama Terang TTD" value={app.name} onChange={(e) => setMomApprovals(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} placeholder="Tulis Nama Lengkap..." />
                                        <Input label="Peran / Jabatan TTD" value={app.role} onChange={(e) => setMomApprovals(prev => prev.map((it, i) => i === idx ? { ...it, role: e.target.value } : it))} placeholder="Notulis / PM / MK..." />
                                    </div>
                                ))}
                            </div>
                            {momApprovals.length < 4 && (
                                <button type="button" onClick={() => {
                                    const typeOrder = ["disusun", "dicek", "mengetahui", "disetujui"] as const;
                                    const usedTypes = momApprovals.map(a => a.type);
                                    const nextType = typeOrder.find(t => !usedTypes.includes(t)) || "mengetahui";
                                    setMomApprovals([...momApprovals, { type: nextType as any, name: "", role: "" }]);
                                }} className="text-[11px] font-bold text-fuchsia-600 hover:underline flex items-center gap-1 cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" /> Tambah TTD
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {momActiveTab === "mom_discussion" && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-fuchsia-600 uppercase tracking-wider">2. Agenda Discussion / Pembahasan Agenda ({momDiscussions.length})</span></div>
                        {momDiscussions.map((disc, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-fuchsia-600 uppercase">Topic #{idx + 1}</span>{momDiscussions.length > 1 && (<button type="button" onClick={() => setMomDiscussions(momDiscussions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                <Input label="Topic / Topik Bahasan" value={disc.topic} onChange={(e) => setMomDiscussions(prev => prev.map((it, i) => i === idx ? { ...it, topic: e.target.value } : it))} placeholder="Perubahan spesifikasi beton" />
                                <Input label="Discussion Detail / Uraian Pembahasan" value={disc.discussion} onChange={(e) => setMomDiscussions(prev => prev.map((it, i) => i === idx ? { ...it, discussion: e.target.value } : it))} placeholder="Disetujui penggunaan K-500 dengan admixture retarder" />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Reference / Acuan / Lampiran Gambar" value={disc.reference} onChange={(e) => setMomDiscussions(prev => prev.map((it, i) => i === idx ? { ...it, reference: e.target.value } : it))} placeholder="RFI-CIV-042 & Drawing ST-03" />
                                    <Input label="Concern/Issue / Isu Utama" value={disc.concern} onChange={(e) => setMomDiscussions(prev => prev.map((it, i) => i === idx ? { ...it, concern: e.target.value } : it))} placeholder="Potensi kenaikan biaya unit beton" />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setMomDiscussions([...momDiscussions, { topic: "", discussion: "", reference: "", concern: "" }])} className="w-full py-2.5 text-xs font-bold text-fuchsia-600 flex items-center justify-center gap-1.5 bg-fuchsia-50/80 rounded-xl border border-fuchsia-200/60 hover:bg-fuchsia-100 transition-colors cursor-pointer"><Plus className="w-4 h-4" /> Tambah Pembahasan / Add Discussion</button>
                    </div>
                )}

                {momActiveTab === "mom_decisions" && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-fuchsia-600 uppercase tracking-wider">3. Decisions / Keputusan Rapat ({momDecisions.length})</span></div>
                        {momDecisions.map((dec, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-fuchsia-600 uppercase">Keputusan #{idx + 1}</span>{momDecisions.length > 1 && (<button type="button" onClick={() => setMomDecisions(momDecisions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                <Input label="Keputusan Rapat" value={dec.decision} onChange={(e) => setMomDecisions(prev => prev.map((it, i) => i === idx ? { ...it, decision: e.target.value } : it))} placeholder="Menyetujui revisi beton K-500" />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Arah Disetujui / Tindak Lanjut" value={dec.direction} onChange={(e) => setMomDecisions(prev => prev.map((it, i) => i === idx ? { ...it, direction: e.target.value } : it))} placeholder="Terbitkan Variation Order (VO-003)" />
                                    <Input label="Otoritas Pengambil Keputusan" value={dec.authority} onChange={(e) => setMomDecisions(prev => prev.map((it, i) => i === idx ? { ...it, authority: e.target.value } : it))} placeholder="Owner / Client Representative" />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setMomDecisions([...momDecisions, { decision: "", direction: "", authority: "" }])} className="w-full py-2.5 text-xs font-bold text-fuchsia-600 flex items-center justify-center gap-1.5 bg-fuchsia-50/80 rounded-xl border border-fuchsia-200/60 hover:bg-fuchsia-100 transition-colors cursor-pointer"><Plus className="w-4 h-4" /> Tambah Keputusan / Add Decision</button>
                    </div>
                )}

                {momActiveTab === "mom_actions" && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-fuchsia-600 uppercase tracking-wider">4. Action Items ({momActions.length})</span></div>
                        {momActions.map((act, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-fuchsia-600 uppercase">Action Item #{idx + 1}</span>{momActions.length > 1 && (<button type="button" onClick={() => setMomActions(momActions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                <Input label="Action Item Detail" value={act.action} onChange={(e) => setMomActions(prev => prev.map((it, i) => i === idx ? { ...it, action: e.target.value } : it))} placeholder="Submit Shop Drawing Revised" />
                                <div className="grid grid-cols-4 gap-2">
                                    <Input label="PIC" value={act.pic} onChange={(e) => setMomActions(prev => prev.map((it, i) => i === idx ? { ...it, pic: e.target.value } : it))} placeholder="Ir. Hendra" />
                                    <Input label="Due Date" type="date" value={act.dueDate} onChange={(e) => setMomActions(prev => prev.map((it, i) => i === idx ? { ...it, dueDate: e.target.value } : it))} />
                                    <Select label="Priority" value={act.priority} onChange={(val) => setMomActions(prev => prev.map((it, i) => i === idx ? { ...it, priority: val } : it))} options={[{ value: "Low", label: "Low" }, { value: "Medium", label: "Medium" }, { value: "High", label: "High" }, { value: "Urgent", label: "Urgent" }]} />
                                    <Select label="Status" value={act.status} onChange={(val) => setMomActions(prev => prev.map((it, i) => i === idx ? { ...it, status: val } : it))} options={[{ value: "Open", label: "Open" }, { value: "In Progress", label: "In Progress" }, { value: "Closed", label: "Closed" }]} />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setMomActions([...momActions, { action: "", pic: "", dueDate: "", priority: "Medium", status: "Open" }])} className="w-full py-2.5 text-xs font-bold text-fuchsia-600 flex items-center justify-center gap-1.5 bg-fuchsia-50/80 rounded-xl border border-fuchsia-200/60 hover:bg-fuchsia-100 transition-colors cursor-pointer"><Plus className="w-4 h-4" /> Tambah Action Item / Add Action</button>
                    </div>
                )}

                {momActiveTab === "mom_prev_actions" && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2"><span className="text-xs font-black text-fuchsia-600 uppercase tracking-wider">5. Previous Actions Review / Tinjauan Action Item Rapat Lalu ({momPrevActions.length})</span></div>
                        {momPrevActions.map((pa, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold text-fuchsia-600 uppercase">Previous Item #{idx + 1}</span>{momPrevActions.length > 1 && (<button type="button" onClick={() => setMomPrevActions(momPrevActions.filter((_, i) => i !== idx))} className="p-1 text-neutral-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>)}</div>
                                <Input label="Catatan Action Item Rapat Lalu" value={pa.previousItem} onChange={(e) => setMomPrevActions(prev => prev.map((it, i) => i === idx ? { ...it, previousItem: e.target.value } : it))} placeholder="Pembersihan lahan area tumpuan" />
                                <div className="grid grid-cols-3 gap-2">
                                    <Input label="Status Kemajuan" value={pa.currentStatus} onChange={(e) => setMomPrevActions(prev => prev.map((it, i) => i === idx ? { ...it, currentStatus: e.target.value } : it))} placeholder="Selesai 100% / Masih terhambat" />
                                    <Select label="Carry Over ke Rapat Ini?" value={pa.carryOver} onChange={(val) => setMomPrevActions(prev => prev.map((it, i) => i === idx ? { ...it, carryOver: val } : it))} options={[{ value: "Tidak", label: "Tidak / No" }, { value: "Ya", label: "Ya / Yes" }]} />
                                    <Select label="Closure Status" value={pa.closure} onChange={(val) => setMomPrevActions(prev => prev.map((it, i) => i === idx ? { ...it, closure: val } : it))} options={[{ value: "Closed", label: "Closed" }, { value: "Open", label: "Open" }]} />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setMomPrevActions([...momPrevActions, { previousItem: "", currentStatus: "", carryOver: "Tidak", closure: "Closed" }])} className="w-full py-2.5 text-xs font-bold text-fuchsia-600 flex items-center justify-center gap-1.5 bg-fuchsia-50/80 rounded-xl border border-fuchsia-200/60 hover:bg-fuchsia-100 transition-colors cursor-pointer"><Plus className="w-4 h-4" /> Tambah Review Rapat Lalu / Add Previous Review</button>
                    </div>
                )}
            </div>


        </div>
    );

    // Render printable preview sheet
    function renderPreview() {
        return (
            <div className="flex flex-col gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
                <div className="weekly-page-break bg-white text-neutral-900 shadow-xl w-full p-8 flex flex-col justify-between border border-neutral-300" style={{ minHeight: "920px", boxSizing: "border-box" }}>
                    <div className="flex flex-col gap-4">
                        {renderPageHeader("MOM", documentId || "MOM-01-01", getLangText(momLangMode, "MINUTES OF MEETING REPORT", "LAPORAN RISALAH RAPAT"))}
                         <div className="grid grid-cols-5 border border-neutral-300 rounded text-center">
                             {[
                                 { label: getLangNode(momLangMode, "Project", "Proyek"), value: currentProject?.project_code || "PROYEK" },
                                 { 
                                     label: getLangNode(momLangMode, "Date", "Tanggal Rapat"), 
                                     value: (() => {
                                         if (!momDetails.date) return "—";
                                         let val = momDetails.date;
                                         if (momDetails.startTime || momDetails.endTime) {
                                             val += "\n";
                                             if (momDetails.startTime && momDetails.endTime) {
                                                 val += `${momDetails.startTime} - ${momDetails.endTime}`;
                                             } else {
                                                 val += momDetails.startTime || momDetails.endTime;
                                             }
                                             val += " WIB";
                                         }
                                         return val;
                                     })() 
                                 },
                                 { label: getLangNode(momLangMode, "Meeting Type", "Tipe Rapat"), value: momDetails.meetingType || "—" },
                                 { label: getLangNode(momLangMode, "Participants", "Peserta Rapat"), value: momParticipants.length },
                                 { label: getLangNode(momLangMode, "Action Items", "Tindak Lanjut"), value: momActions.length },
                             ].map((c, i) => (
                                 <div key={i} className="border-r border-neutral-300 last:border-r-0">
                                     <div className="text-[5.5px] font-bold text-neutral-500 bg-neutral-50 border-b border-neutral-200 py-1 px-1 flex flex-col justify-center items-center h-7">{c.label}</div>
                                     <div className="text-[7px] font-bold text-neutral-800 py-1 px-1 whitespace-pre-line break-words leading-tight">{c.value}</div>
                                 </div>
                             ))}
                         </div>

                         {/* Section 1: Meeting Details & Attendance */}
                         <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm">
                             1. {getLangText(momLangMode, "MEETING DETAILS & ATTENDANCE REGISTER", "DETAIL RAPAT & DAFTAR HADIR PESERTA")}
                         </div>
                         <div className="border border-neutral-300 rounded p-2 text-[6.5px] bg-neutral-50/50 space-y-1">
                             <div><span className="font-bold text-neutral-500">{getLangNode(momLangMode, "Agenda", "Agenda")}:</span> <span className="font-bold text-neutral-900">{momDetails.agenda || "—"}</span></div>
                             <div><span className="font-bold text-neutral-500">{getLangNode(momLangMode, "Location/Platform", "Lokasi/Platform")}:</span> <span className="font-bold text-neutral-900">{momDetails.location || "—"}</span></div>
                         </div>
                         
                         <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                             <thead>
                                 <tr className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700">
                                     <th className="py-1 px-1.5 border-r border-neutral-300">{getLangNode(momLangMode, "Participant Name", "Nama Peserta")}</th>
                                     <th className="py-1 px-1.5 border-r border-neutral-300">{getLangNode(momLangMode, "Company/Institution", "Perusahaan/Instansi")}</th>
                                     <th className="py-1 px-1.5 border-r border-neutral-300">{getLangNode(momLangMode, "Position/Role", "Jabatan/Peran")}</th>
                                     <th className="py-1 px-1.5 text-center font-bold">{getLangNode(momLangMode, "Attendance", "Kehadiran")}</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {momParticipants.map((p, i) => (
                                     <tr key={i} className="border-b border-neutral-200">
                                         <td className="py-1 px-1.5 border-r border-neutral-300 font-bold">{p.name || "—"}</td>
                                         <td className="py-1 px-1.5 border-r border-neutral-300">{p.company || "—"}</td>
                                         <td className="py-1 px-1.5 border-r border-neutral-300">{p.position || "—"}</td>
                                         <td className={"py-1 px-1.5 text-center font-bold " + getPresenceColor(p.presence || "Hadir")}>{p.presence || "Hadir"}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         {/* Section 2: Discussion Details */}
                         <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                             <span>2. {getLangNode(momLangMode, "Agenda Discussion & Main Issues", "Pembahasan Agenda & Kendala Utama")}</span>
                             <span className="font-mono text-[6.5px] text-neutral-400">Topics / <span className="italic text-neutral-500">Topik</span>: {momDiscussions.length}</span>
                         </div>
                         <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                             <thead>
                                 <tr className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700">
                                     <th className="py-1 px-2 border-r border-neutral-300">{getLangNode(momLangMode, "Topic", "Topik")}</th>
                                     <th className="py-1 px-2 border-r border-neutral-300">{getLangNode(momLangMode, "Discussion Detail", "Detail Pembahasan")}</th>
                                     <th className="py-1 px-1.5 border-r border-neutral-300">{getLangNode(momLangMode, "Reference", "Referensi")}</th>
                                     <th className="py-1 px-1.5 font-bold">{getLangNode(momLangMode, "Concern/Issue", "Isu Utama")}</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {momDiscussions.map((d, i) => (
                                     <tr key={i} className="border-b border-neutral-200">
                                         <td className="py-1 px-2 border-r border-neutral-300 font-bold">{d.topic || "—"}</td>
                                         <td className="py-1 px-2 border-r border-neutral-300 font-semibold text-neutral-800">{d.discussion || "—"}</td>
                                         <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{d.reference || "—"}</td>
                                         <td className="py-1 px-1.5 text-rose-600 font-bold">{d.concern || "—"}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         {/* Section 3: Decisions */}
                         <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                             <span>3. {getLangNode(momLangMode, "Decisions & Approved Directions", "Keputusan & Arah Yang Disetujui")}</span>
                             <span className="font-mono text-[6.5px] text-neutral-400">Decisions / <span className="italic text-neutral-500">Keputusan</span>: {momDecisions.length}</span>
                         </div>
                         <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                             <thead>
                                 <tr className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700">
                                     <th className="py-1 px-2 border-r border-neutral-300">{getLangNode(momLangMode, "Meeting Decision", "Keputusan Rapat")}</th>
                                     <th className="py-1 px-2 border-r border-neutral-300">{getLangNode(momLangMode, "Approved Direction", "Arah Disetujui")}</th>
                                     <th className="py-1 px-1.5 font-bold">{getLangNode(momLangMode, "Authority", "Otoritas")}</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {momDecisions.map((dec, i) => (
                                     <tr key={i} className="border-b border-neutral-200">
                                         <td className="py-1 px-2 border-r border-neutral-300 font-bold">{dec.decision || "—"}</td>
                                         <td className="py-1 px-2 border-r border-neutral-300 text-fuchsia-750 font-semibold">{dec.direction || "—"}</td>
                                         <td className="py-1 px-1.5 font-mono">{dec.authority || "—"}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         {/* Section 4: Action Items */}
                         <div className="bg-neutral-900 text-white font-extrabold text-[8px] py-1 px-2 uppercase tracking-wider rounded-t-sm flex justify-between">
                             <span>4. {getLangNode(momLangMode, "Action Items Register & PIC", "Daftar Tindak Lanjut & Penanggung Jawab")}</span>
                             <span className="font-mono text-[6.5px] text-neutral-400">Items / <span className="italic text-neutral-500">Tindak Lanjut</span>: {momActions.length}</span>
                         </div>
                         <table className="w-full text-left border border-neutral-300 text-[6.5px]">
                             <thead>
                                 <tr className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700">
                                     <th className="py-1 px-2 border-r border-neutral-300">{getLangNode(momLangMode, "Action Item", "Tindak Lanjut")}</th>
                                     <th className="py-1 px-1.5 border-r border-neutral-300">{getLangNode(momLangMode, "PIC", "PIC")}</th>
                                     <th className="py-1 px-1.5 border-r border-neutral-300">{getLangNode(momLangMode, "Due Date", "Due Date")}</th>
                                     <th className="py-1 px-1 border-r border-neutral-300 text-center">{getLangNode(momLangMode, "Priority", "Prioritas")}</th>
                                     <th className="py-1 px-1.5 text-center font-bold">{getLangNode(momLangMode, "Status", "Status")}</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {momActions.map((act, i) => (
                                     <tr key={i} className="border-b border-neutral-200">
                                         <td className="py-1 px-2 border-r border-neutral-300 font-bold">{act.action || "—"}</td>
                                         <td className="py-1 px-1.5 border-r border-neutral-300 font-semibold text-fuchsia-700">{act.pic || "—"}</td>
                                         <td className="py-1 px-1.5 border-r border-neutral-300 font-mono">{act.dueDate || "—"}</td>
                                         <td className={"py-1 px-1 border-r border-neutral-300 text-center " + getPriorityColor(act.priority || "Medium")}>{act.priority || "Medium"}</td>
                                         <td className={"py-1 px-1.5 text-center font-bold " + getStatusColor(act.status || "Open")}>{act.status || "Open"}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         {/* Signatures / Approvals */}
                         <div className={clsx("grid gap-4 border border-neutral-300 rounded p-4 bg-neutral-50/20 text-center mt-2 divide-x divide-neutral-300", momApprovals.length === 1 ? "grid-cols-1" : momApprovals.length === 2 ? "grid-cols-2" : momApprovals.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                             {momApprovals.map((app, idx) => {
                                 const approvalLabels: Record<string, { en: string; id: string }> = {
                                     disusun: { en: "Prepared By", id: "Disusun Oleh" },
                                     dicek: { en: "Checked By", id: "Dicek Oleh" },
                                     mengetahui: { en: "Acknowledged By", id: "Mengetahui" },
                                     disetujui: { en: "Approved By", id: "Disetujui Oleh" }
                                 };
                                 const lbl = approvalLabels[app.type] || { en: "Approved By", id: "Disetujui Oleh" };
                                 return (
                                     <div key={idx} className={clsx("flex flex-col justify-between h-20", idx > 0 && "pl-3")}>
                                         <div>
                                             <div className="text-[5.5px] font-bold text-neutral-400 uppercase">
                                                 {getLangNode(momLangMode, lbl.en, lbl.id)}
                                             </div>
                                             <div className="text-[7px] font-bold text-neutral-600 mt-0.5">{app.role || "—"}</div>
                                         </div>
                                         <div><div className="text-[8.5px] font-black text-neutral-900 underline truncate">{app.name || "( .................... )"}</div></div>
                                     </div>
                                 );
                             })}
                         </div>
                    </div>
                    <div className="border-t border-neutral-200 pt-2 text-[6px] text-neutral-400 flex justify-between font-mono">
                        <span>ADIDAYA STUDIO — MINUTES OF MEETING (MOM)</span>
                        <span>{documentId || "MOM-01-01"}</span>
                    </div>
                </div>
            </div>
        );
    }
}
