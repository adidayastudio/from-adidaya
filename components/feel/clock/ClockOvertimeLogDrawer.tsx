"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/shared/ui/overlays/Drawer";
import { DrawerHeader } from "@/shared/ui/overlays/DrawerHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Calendar, Clock, Info, Camera, Briefcase, Building2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { differenceInHours, startOfToday } from "date-fns";
import { submitOvertimeLog, OvertimeLog } from "@/lib/api/clock";
import useUserProfile from "@/hooks/useUserProfile";
import { fetchProjectsByWorkspace } from "@/lib/api/projects";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

interface ClockOvertimeLogDrawerProps {
    open: boolean;
    onClose: () => void;
    editData?: OvertimeLog;
    readOnly?: boolean;
}

interface ProjectOption {
    id: string;
    label: string;
    type: "internal" | "client";
    icon: React.ReactNode;
}

export function ClockOvertimeLogDrawer({ open, onClose, editData, readOnly }: ClockOvertimeLogDrawerProps) {
    const { profile } = useUserProfile();
    // FORM STATE
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [projectId, setProjectId] = useState<string>("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // PROJECT STATE
    const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    // FETCH PROJECTS
    useEffect(() => {
        const loadProjects = async () => {
            setLoadingProjects(true);
            try {
                const wsId = await fetchDefaultWorkspaceId();
                const staticProjects: ProjectOption[] = [
                    { id: "ady_ops", label: "Adidaya Ops (ADY)", type: "internal", icon: <Building2 className="w-4 h-4" /> }
                ];

                if (wsId) {
                    const projectsData = await fetchProjectsByWorkspace(wsId);
                    const dynamicProjects: ProjectOption[] = projectsData.map(p => ({
                        id: p.id,
                        label: p.projectName,
                        type: "client",
                        icon: <Briefcase className="w-4 h-4" />
                    }));
                    setProjectOptions([...staticProjects, ...dynamicProjects]);
                } else {
                    setProjectOptions(staticProjects);
                }
            } catch (e) {
                console.error("Failed to load projects", e);
            } finally {
                setLoadingProjects(false);
            }
        };

        if (open) {
            loadProjects();
        }
    }, [open]);

    // RESET STATE ON OPEN
    useEffect(() => {
        if (open) {
            if (editData) {
                setDate(editData.date || "");
                // Show approved time if available and readOnly (view mode), else original request
                const sTime = (readOnly && (editData as any).approvedStartTime) ? (editData as any).approvedStartTime : (editData.startTime || "");
                const eTime = (readOnly && (editData as any).approvedEndTime) ? (editData as any).approvedEndTime : (editData.endTime || "");

                setStartTime(sTime);
                setEndTime(eTime);
                setProjectId(editData.projectId || "");
                setDescription(editData.description || "");
                // Note: File handling not fully supported for edit yet
            } else {
                setDate("");
                setStartTime("");
                setEndTime("");
                setProjectId("");
                setDescription("");
                setFile(null);
            }
            setIsSubmitting(false);
        }
    }, [open, editData, readOnly]);

    // CALCULATIONS & VALIDATIONS
    const duration = (() => {
        if (!startTime || !endTime) return null;
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        let diff = (endH * 60 + endM) - (startH * 60 + startM);
        if (diff < 0) diff += 24 * 60; // Handle past midnight roughly
        if (diff <= 0) return null;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h}h ${m}m`;
    })();

    const isLateSubmission = (() => {
        if (!date) return false;
        const logDate = new Date(date);
        const today = startOfToday();
        return differenceInHours(today, logDate) > 48; // Alert if > 2 days ago
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        setIsSubmitting(true);
        try {
            await submitOvertimeLog({
                userId: profile.id,
                date,
                startTime,
                endTime,
                description,
                projectId
            });
            onClose();
        } catch (err) {
            console.error("Error submitting overtime:", err);
            alert("Failed to submit log");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer open={open} onClose={onClose} size="md">
            <div className="flex flex-col h-full bg-neutral-50/30">
                <DrawerHeader title={readOnly ? "Overtime Details" : "Log Overtime"} onClose={onClose} />

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* OVERTIME WARNING IF LATE */}
                    {isLateSubmission && !readOnly && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 animate-in fade-in">
                            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-orange-800 text-sm">Late Submission</h4>
                                <p className="text-sm text-orange-700 mt-1">
                                    You are logging overtime from more than 2 days ago. Please ensure your manager is aware of this delay.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Date of Overtime</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="date"
                                required
                                value={date}
                                disabled={readOnly}
                                onChange={(e) => setDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
                            />
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-neutral-700">Start Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    type="time"
                                    required
                                    value={startTime}
                                    disabled={readOnly}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-neutral-700">End Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    type="time"
                                    required
                                    value={endTime}
                                    disabled={readOnly}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary bg-white disabled:bg-neutral-100 disabled:text-neutral-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* DURATION CARD */}
                    {duration && (
                        <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex justify-between items-center shadow-sm border border-emerald-100 animate-in zoom-in-95">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-emerald-600" />
                                <span>Total Overtime Duration</span>
                            </div>
                            <span className="text-lg font-bold tracking-tight">{duration}</span>
                        </div>
                    )}

                    {/* Project / Task Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-700">Project / Task Category</label>
                        <div className="grid grid-cols-1 gap-2">
                            {loadingProjects ? (
                                <div className="p-4 text-center text-sm text-neutral-500">Loading projects...</div>
                            ) : (
                                projectOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        disabled={readOnly}
                                        onClick={() => setProjectId(option.id)}
                                        className={clsx(
                                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                            projectId === option.id
                                                ? "bg-white border-action-primary ring-1 ring-action-primary shadow-sm text-action-primary"
                                                : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700",
                                            readOnly && "pointer-events-none opacity-80 bg-neutral-50"
                                        )}
                                    >
                                        <div className={clsx("p-2 rounded-lg", projectId === option.id ? "bg-blue-50" : "bg-neutral-100")}>
                                            {option.icon}
                                        </div>
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700">Description of Work</label>
                        <textarea
                            required
                            value={description}
                            disabled={readOnly}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe what you worked on..."
                            className="w-full p-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-action-primary focus:ring-1 focus:ring-action-primary min-h-[100px] resize-none disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                    </div>

                    {/* Photo Proof (Optional) */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-neutral-700 flex justify-between">
                            <span>Photo Proof <span className="text-neutral-400 font-normal">(Optional)</span></span>
                        </label>
                        <div className={clsx("border border-dashed border-neutral-300 rounded-lg p-4 flex items-center justify-between bg-white transition-colors relative group", !readOnly && "hover:bg-neutral-50 cursor-pointer")}>
                            {!readOnly && (
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    accept="image/*"
                                />
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Camera className="w-5 h-5 text-neutral-500" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-neutral-700">{file ? file.name : (readOnly ? "No photo attached" : "Upload Photo")}</p>
                                    {!file && !readOnly && <p className="text-xs text-neutral-400">Tap to capture or select</p>}
                                </div>
                            </div>
                            {file && !readOnly && <Button variant="secondary" size="sm" className="!bg-transparent !border-none text-rose-500 hover:text-rose-600 hover:!bg-rose-50 z-10 shadow-none" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</Button>}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold">Policy Reminder</p>
                            <p className="mt-1 text-blue-700/80">
                                Global Policy: Unlogged overtime after 48h may require manual approval from HR.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-neutral-200 bg-white flex items-center justify-end gap-3 rounded-b-xl z-20 sticky bottom-0 -mx-6 -mb-6">
                        <Button variant="secondary" onClick={onClose} disabled={isSubmitting} type="button" className="!rounded-full px-6">{readOnly ? "Close" : "Cancel"}</Button>
                        {!readOnly && (
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                className="!rounded-full px-8"
                                disabled={!date || !startTime || !endTime || !projectId || !description}
                            >
                                Submit Log
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Drawer>
    );
}
