"use client";

import { useState } from "react";
import { Project, ProjectType } from "@/components/flow/projects/data";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Button } from "@/shared/ui/primitives/button/button";
import { ExternalLink, Info } from "lucide-react";

/* ================= TYPES ================= */

type WorkType = ProjectType;

// Stage Mapping based on User Request
const STAGE_MAPPING: Record<WorkType, string[]> = {
    "design-only": ["01-KO (Kickoff)", "02-SD (Schematic)", "03-DD (Design Dev)", "04-ED (Engineering/Tender)", "05-HO (Handover)"],
    "design-build": ["01-KO (Kickoff)", "02-SD (Schematic)", "03-DD (Design Dev)", "04-CD (Const. Dwg)", "05-TN (Tender)", "06-CN (Construction)", "07-HO (Handover)"],
    "build-only": ["01-KO (Kickoff)", "02-ED (Engineering)", "03-PC (Pre-Const)", "04-CN (Construction)", "05-HO (Handover)"],
};

/* ================= COMPONENT ================= */

export default function ProjectInfoTab({ project }: { project: any }) {
    // Local state for dynamic preview
    const [selectedType, setSelectedType] = useState<ProjectType>(project.type);

    const activeStages = STAGE_MAPPING[selectedType as WorkType] || STAGE_MAPPING["design-build"];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* LEFTSIDE: FORM INPUTS */}
            <div className="space-y-6">

                {/* 0. Project Identity */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Project Identity</h3>
                    <div className="space-y-3">
                        <Input inputSize="sm" label="Project Name" defaultValue={project.name} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input inputSize="sm" label="Project No" defaultValue={project.projectNo} />
                            <Input inputSize="sm" label="Project Code" defaultValue={project.code} />
                        </div>
                        <p className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                            <Info size={12} />
                            Changes to identity will update the Project Header automatically.
                        </p>
                    </div>
                </section>

                <div className="h-px bg-neutral-100" />

                {/* 1. Location */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Location</h3>
                    <div className="space-y-3">
                        <Input inputSize="sm" label="Address (Jalan)" defaultValue={project.address} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input inputSize="sm" label="City" defaultValue={project.city} />
                            <Input inputSize="sm" label="Province" defaultValue={project.province} />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input inputSize="sm" label="Google Maps Link" defaultValue={project.mapsLink} />
                            </div>
                            {/* Fixed Button Size */}
                            <Button size="sm" variant="outline" className="mb-px w-9 px-0 justify-center" title="Open Map">
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-neutral-100" />

                {/* 2. Client */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Client</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input inputSize="sm" label="Company / Name" defaultValue={project.client} />
                        <Input inputSize="sm" label="Contact (Optional)" defaultValue={project.clientContact} />
                    </div>
                </section>

                <div className="h-px bg-neutral-100" />

                {/* 3. Specs (GFA, Stories) */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Technical Specs</h3>
                        <span className="text-[10px] text-brand-red font-medium cursor-pointer hover:underline">
                            Fetch from Setup
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input inputSize="sm" label="Land Area" defaultValue={project.landArea} />
                        <Input inputSize="sm" label="Building Area" defaultValue={project.buildingArea} />
                        <Input inputSize="sm" label="Stories (Fl)" type="number" defaultValue={String(project.floors)} />
                    </div>
                </section>

            </div>

            {/* RIGHTSIDE: SCOPE & STAGES */}
            <div className="space-y-8">

                {/* 4. Scope Definition */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Scope of Work</h3>

                    {/* Work Type */}
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-4">
                        <Select
                            selectSize="sm"
                            label="Contract Type"
                            options={[
                                { label: "Design", value: "design-only" },
                                { label: "Design-Build", value: "design-build" },
                                { label: "Build", value: "build-only" },
                            ]}
                            defaultValue={selectedType}
                            onChange={(val) => setSelectedType(val as ProjectType)}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                selectSize="sm"
                                label="Category"
                                options={[
                                    { label: "New Building", value: "new" },
                                    { label: "Renovation", value: "renovation" }
                                ]}
                                defaultValue={project.buildType}
                            />
                            {/* Multiselect simulation with checkboxes? Or just list */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-neutral-500">Disciplines</label>
                                <div className="flex flex-wrap gap-2">
                                    {(project.disciplines || []).map((d: string) => (
                                        <span key={d} className="px-2 py-1 bg-white border border-neutral-200 rounded text-xs text-neutral-600 capitalize">
                                            {d}
                                        </span>
                                    ))}
                                    <button className="px-2 py-1 border border-dashed border-neutral-300 rounded text-xs text-neutral-400 hover:text-neutral-600 hover:border-neutral-400">
                                        + Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Dynamic Stages Preview */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Applicable Stages</h3>
                    <p className="text-[11px] text-neutral-500">
                        Stages are automatically configured based on <b>Contract Type</b>.
                    </p>
                    <div className="rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
                        {activeStages.map((stageName, idx) => (
                            <div key={idx} className="flex items-center gap-3 px-4 py-2 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold text-neutral-500">
                                    {idx + 1}
                                </span>
                                <span className="text-xs font-medium text-neutral-700">
                                    {stageName}
                                </span>
                                {/* Active Indicator if matches current stage (mock) */}
                                {idx === 1 && (
                                    <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase">
                                        Current
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* SAVE ACTION */}
                <div className="pt-4 flex justify-end">
                    <Button className="bg-brand-red px-6 shadow-md text-xs">
                        Save Changes
                    </Button>
                </div>

            </div>

        </div>
    );
}
