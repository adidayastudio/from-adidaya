"use client";

import { useState, useEffect } from "react";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Button } from "@/shared/ui/primitives/button/button";
import { PROJECT_STAGES } from "@/shared/constants/project-stage";
import { ProjectStatus } from "@/shared/constants/project-status";
import { Project } from "./data";
import { X, Calendar, User } from "lucide-react";

interface NewProjectModalProps {
    open: boolean;
    projects: any[];
    onClose: () => void;
    onSubmit: (project: any) => void;
}

export default function NewProjectModal({
    open,
    projects,
    onClose,
    onSubmit,
}: NewProjectModalProps) {
    // FORM STATE
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [projectNo, setProjectNo] = useState(""); // Auto-generated
    const [stage, setStage] = useState("ko"); // Default: Kick-Off
    const [status, setStatus] = useState<ProjectStatus>("on-track");

    // Recommended Fields
    const [client, setClient] = useState("");
    const [city, setCity] = useState("");
    const [type, setType] = useState("design-build");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Derived: check code uniqueness
    const [codeError, setCodeError] = useState("");

    // 1. Auto-Generate Project No on Mount
    useEffect(() => {
        if (open) {
            // Find max project no (assuming format "001", "002")
            const maxNo = projects.reduce((max, p) => {
                const num = parseInt(p.projectNo, 10);
                return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            const nextNo = (maxNo + 1).toString().padStart(3, "0");
            setProjectNo(nextNo);
        }
    }, [open, projects]);

    // 2. Auto-Generate Code from Name
    useEffect(() => {
        if (!name) return;

        // Logic: Take first 3 letters, uppercase
        const cleanName = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
        let candidate = cleanName.slice(0, 3);

        if (candidate.length < 3) {
            candidate = candidate.padEnd(3, "X");
        }

        // Check collision (Simple collision handling: append suffix logic if needed, but for now just validation)
        if (projects.some(p => p.code === candidate)) {
            // Try fallback: 1st, 2nd, 4th char
            if (cleanName.length > 3) {
                candidate = cleanName[0] + cleanName[1] + cleanName[3];
            } else {
                candidate = candidate.slice(0, 2) + "2";
            }
        }

        setCode(candidate);
    }, [name, projects]);

    // Validate Code
    useEffect(() => {
        if (projects.some(p => p.code === code)) {
            setCodeError("Code already exists!");
        } else {
            setCodeError("");
        }
    }, [code, projects]);


    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !code || codeError || !city) return;

        onSubmit({
            name,
            code,
            projectNo,
            stage,
            status,
            client,
            city,
            type,
            startDate
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* BACKDROP */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            />

            {/* DRAWER */}
            <div className="relative h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900">New Project</h2>
                        <p className="text-xs text-neutral-500 mt-1">Create a new project workspace.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* SECTION: IDENTITY */}
                    <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-100 space-y-4">
                        <div className="flex gap-4">
                            <div className="w-1/3">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">
                                    No. (Auto)
                                </label>
                                <div className="text-sm font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-pill px-4 py-2.5 flex items-center h-[42px]">
                                    {projectNo}
                                </div>
                            </div>
                            <div className="w-2/3">
                                <Input
                                    label="Project Code (Auto)"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    required
                                    maxLength={3}
                                    className={codeError ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}
                                />
                                {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
                            </div>
                        </div>

                        <Input
                            label="Project Name"
                            placeholder="e.g. Precision Gym Jakarta"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    {/* SECTION: DETAILS */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                            Mandatory Details
                        </h3>

                        <div className="space-y-4">
                            <Input
                                label="City / Location"
                                placeholder="e.g. Jakarta South"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                            />

                            <Input
                                label="Client Name (Optional)"
                                placeholder="Enter client/company name"
                                value={client}
                                onChange={(e) => setClient(e.target.value)}
                                iconLeft={<User className="text-neutral-400 h-4 w-4" />}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Project Type"
                                    value={type}
                                    onChange={setType}
                                    options={[
                                        { label: "Design Only", value: "design" },
                                        { label: "Design & Build", value: "design-build" },
                                        { label: "Construction", value: "build" },
                                    ]}
                                />
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Initial Stage"
                                    value={stage}
                                    onChange={setStage}
                                    options={PROJECT_STAGES.map((s) => ({
                                        label: s.label,
                                        value: s.key,
                                    }))}
                                />
                                <Select
                                    label="Initial Status"
                                    value={status}
                                    onChange={(v) => setStatus(v as ProjectStatus)}
                                    options={[
                                        { label: "On Track", value: "on-track" },
                                        { label: "At Risk", value: "at-risk" },
                                        { label: "Delayed", value: "delayed" },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="border-t border-neutral-100 p-6 bg-neutral-50 flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        onClick={handleSubmit}
                        disabled={!name || !code || !!codeError || !projectNo || !city}
                        className="w-full"
                    >
                        Create Project
                    </Button>
                </div>
            </div>
        </div>
    );
}
