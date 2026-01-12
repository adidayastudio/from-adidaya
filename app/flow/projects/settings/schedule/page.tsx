"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import { ArrowLeft, Save, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
    fetchProjectTypes, fetchStageTemplates, fetchScheduleTemplates, upsertScheduleTemplate,
    ProjectTypeTemplate, StageTemplate, fetchDefaultWorkspaceId
} from "@/lib/api/templates";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export default function SettingsSchedulePage() {
    const [projectTypes, setProjectTypes] = useState<ProjectTypeTemplate[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    const [stages, setStages] = useState<StageTemplate[]>([]);
    // Map stageCode -> duration
    const [durations, setDurations] = useState<Record<string, number>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadTypes();
    }, []);

    useEffect(() => {
        if (selectedTypeId) {
            loadScheduleData(selectedTypeId);
        }
    }, [selectedTypeId, workspaceId]);

    const loadTypes = async () => {
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const types = await fetchProjectTypes(wsId);
            setProjectTypes(types);
            if (types.length > 0) setSelectedTypeId(types[0].projectTypeId);
        } catch (error) {
            console.error("Failed to load project types", error);
        }
    };

    const loadScheduleData = async (typeId: string) => {
        setIsLoading(true);
        try {
            // Fetch stages to know what to display
            const stagesData = await fetchStageTemplates(workspaceId, typeId);
            setStages(stagesData);

            // Fetch existing schedule defaults
            const scheduleData = await fetchScheduleTemplates(workspaceId, typeId);
            const durationMap: Record<string, number> = {};

            // Initialize with existing or default to 30
            stagesData.forEach(s => {
                const found = scheduleData.find(sch => sch.stageCode === s.stageCode);
                durationMap[s.stageCode] = found ? found.defaultDurationDays : (s.weightDefault > 0 ? 30 : 0); // Smart default
            });

            setDurations(durationMap);
        } catch (error) {
            console.error("Failed to load schedule data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDurationChange = (stageCode: string, val: string) => {
        const num = parseInt(val) || 0;
        setDurations(prev => ({ ...prev, [stageCode]: num }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(durations).map(([code, days]) =>
                upsertScheduleTemplate(workspaceId, selectedTypeId, code, days)
            );
            await Promise.all(promises);
            // alert("Schedule defaults saved successfully!");
        } catch (error) {
            console.error("Failed to save schedule", error);
            alert("Failed to save. Check console.");
        } finally {
            setIsSaving(false);
        }
    };

    const totalDays = Object.values(durations).reduce((sum, d) => sum + d, 0);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Schedule Templates" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/flow/projects/settings">
                                <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Schedule Templates</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure default durations for {projectTypes.find(t => t.projectTypeId === selectedTypeId)?.name || "project"} stages.</p>
                            </div>
                        </div>
                        <Button
                            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>

                    {/* Type Selector */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5">
                        <div className="max-w-xs">
                            <Select
                                label="Project Type"
                                options={projectTypes.map(t => ({ label: t.name, value: t.projectTypeId }))}
                                value={selectedTypeId}
                                onChange={setSelectedTypeId}
                            />
                        </div>
                    </div>

                    {/* Duration Table */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden min-h-[300px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3 text-neutral-500">
                                <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
                                <p className="text-sm">Loading schedule templates...</p>
                            </div>
                        ) : stages.length === 0 ? (
                            <div className="p-10 text-center text-neutral-400">
                                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No stages found for this project type.</p>
                                <p className="text-xs mt-1">Go to Stages Flow settings to configure stages first.</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200">
                                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                        <div className="col-span-2">Code</div>
                                        <div className="col-span-5">Stage Name</div>
                                        <div className="col-span-3">Default Duration</div>
                                        <div className="col-span-2 text-right">Days</div>
                                    </div>
                                </div>
                                <div className="divide-y divide-neutral-100">
                                    {stages.map((stage) => (
                                        <div key={stage.stageCode} className="px-5 py-4 hover:bg-neutral-50 transition-colors">
                                            <div className="grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-2">
                                                    <span className="px-2 py-1 bg-neutral-100 rounded text-xs font-mono font-medium text-neutral-700">
                                                        {stage.displayCode}
                                                    </span>
                                                </div>
                                                <div className="col-span-5">
                                                    <div className="text-sm font-medium text-neutral-900">{stage.stageName}</div>
                                                    {stage.stageNameId && <div className="text-xs text-neutral-500">{stage.stageNameId}</div>}
                                                </div>
                                                <div className="col-span-3">
                                                    <Input
                                                        type="number"
                                                        value={durations[stage.stageCode]?.toString() || "0"}
                                                        onChange={(e) => handleDurationChange(stage.stageCode, e.target.value)}
                                                        className="max-w-[120px]"
                                                    />
                                                </div>
                                                <div className="col-span-2 text-right text-sm text-neutral-500">
                                                    days
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Total */}
                    <div className="flex justify-end">
                        <div className="px-4 py-2 bg-neutral-100 rounded-lg text-sm text-neutral-600">
                            Total Duration: <span className="font-semibold text-neutral-900">{totalDays} days</span>
                        </div>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
