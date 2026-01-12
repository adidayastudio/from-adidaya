"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, X, Check, Building2, PenTool, Hammer, Loader2 } from "lucide-react";
import Link from "next/link";
import {
    fetchProjectTypes,
    fetchStageTemplates,
    updateProjectType,
    bulkUpdateStageTemplates,
    ProjectTypeTemplate,
    StageTemplate
} from "@/lib/api/templates";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

const ICONS: Record<string, React.FC<{ className?: string }>> = {
    Building2,
    PenTool,
    Hammer,
};

// Add Stage Modal
function AddStageModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (stage: Partial<StageTemplate>) => void }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [nameId, setNameId] = useState("");
    const [weight, setWeight] = useState("10");

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!code.trim() || !name.trim()) return;
        onAdd({
            stageCode: code.toUpperCase(),
            displayCode: `0X-${code.toUpperCase()}`,
            stageName: name,
            stageNameId: nameId || undefined,
            weightDefault: parseFloat(weight) || 10,
            isActive: true,
        });
        setCode("");
        setName("");
        setNameId("");
        setWeight("10");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Stage</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            label="Code"
                            placeholder="XX"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 2))}
                            className="uppercase"
                        />
                        <div className="col-span-2">
                            <Input
                                label="Stage Name (EN)"
                                placeholder="e.g. Schematic Design"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                    <Input
                        label="Stage Name (ID)"
                        placeholder="e.g. Desain Skematik"
                        value={nameId}
                        onChange={(e) => setNameId(e.target.value)}
                    />
                    <Input
                        label="Default Weight (%)"
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        icon={<Check className="w-4 h-4" />}
                        onClick={handleSubmit}
                        className="bg-brand-red hover:bg-brand-red-hover text-white"
                    >
                        Add Stage
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function TypeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectTypeIdParam = params.typeId as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data State
    const [currentType, setCurrentType] = useState<ProjectTypeTemplate | null>(null);
    const [stages, setStages] = useState<StageTemplate[]>([]);

    // Form State (for optimistic updates)
    const [typeName, setTypeName] = useState("");
    const [typeDescription, setTypeDescription] = useState("");

    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [projectTypeIdParam]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Project Types to find the current one
            const types = await fetchProjectTypes(WORKSPACE_ID);
            const found = types.find(t => t.projectTypeId === projectTypeIdParam);

            if (found) {
                setCurrentType(found);
                setTypeName(found.name);
                setTypeDescription(found.description || "");
            }

            // 2. Fetch Stages
            const stageData = await fetchStageTemplates(WORKSPACE_ID, projectTypeIdParam);
            setStages(stageData);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentType) return;
        setIsSaving(true);
        try {
            // 1. Update Type Info
            await updateProjectType(currentType.projectTypeId, WORKSPACE_ID, {
                name: typeName,
                description: typeDescription
            });

            // 2. Update Stages (Bulk)
            // Re-assign positions based on current array order
            const orderedStages = stages.map((s, idx) => ({
                ...s,
                position: idx + 1,
                displayCode: `${String(idx + 1).padStart(2, "0")}-${s.stageCode}`
            }));

            await bulkUpdateStageTemplates(WORKSPACE_ID, currentType.projectTypeId, orderedStages);

            // Reload to get fresh data
            await loadData();
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddStage = (newStagePartial: Partial<StageTemplate>) => {
        if (!currentType) return;

        const position = stages.length + 1;
        // Create a temporary stage object
        const newStage: StageTemplate = {
            id: `temp-${Date.now()}`, // temp ID
            workspaceId: WORKSPACE_ID,
            projectTypeId: currentType.projectTypeId,
            stageCode: newStagePartial.stageCode || "XX",
            stageName: newStagePartial.stageName || "",
            stageNameId: newStagePartial.stageNameId,
            displayCode: `${String(position).padStart(2, "0")}-${newStagePartial.stageCode}`,
            position: position,
            weightDefault: newStagePartial.weightDefault || 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setStages([...stages, newStage]);
    };

    const handleDeleteStage = (idx: number) => {
        const updated = stages.filter((_, i) => i !== idx);
        setStages(updated);
    };

    const handleWeightChange = (idx: number, val: string) => {
        const newStages = [...stages];
        newStages[idx].weightDefault = parseFloat(val) || 0;
        setStages(newStages);
    };

    // Calculate total weight
    const totalWeight = stages.reduce((sum, s) => sum + s.weightDefault, 0);
    const Icon = currentType ? (ICONS[currentType.icon || "Building2"] || Building2) : Building2;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (!currentType) {
        return (
            <div className="min-h-screen bg-neutral-50 p-6">
                <div className="text-center py-12">
                    <h2 className="text-xl font-bold text-neutral-900">Project Type Not Found</h2>
                    <Link href="/flow/projects/settings/types">
                        <Button className="mt-4" variant="secondary">Back to List</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Project Types", href: "/flow/projects/settings/types" },
                { label: currentType.name }
            ]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/flow/projects/settings/types">
                                <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                    Back
                                </Button>
                            </Link>
                            <div className={`w-12 h-12 rounded-xl ${currentType.color || "bg-neutral-500"} flex items-center justify-center text-white`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">{typeName || currentType.name}</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure type details and stages</p>
                            </div>
                        </div>
                        <Button
                            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            onClick={handleSave}
                            disabled={isSaving}
                            className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>

                    {/* Type Info */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Type Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input
                                label="Type Name"
                                value={typeName}
                                onChange={(e) => setTypeName(e.target.value)}
                            />
                            <Input
                                label="Description"
                                value={typeDescription}
                                onChange={(e) => setTypeDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Stages Configuration */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">Stage Configuration</h2>
                                <p className="text-xs text-neutral-500 mt-1">Drag to reorder stages (Implementation pending)</p>
                            </div>
                            <Button
                                variant="secondary"
                                icon={<Plus className="w-4 h-4" />}
                                onClick={() => setShowAddModal(true)}
                            >
                                Add Stage
                            </Button>
                        </div>

                        {/* Table Header */}
                        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
                            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                <div className="col-span-1">#</div>
                                <div className="col-span-2">Code</div>
                                <div className="col-span-3">Name (EN)</div>
                                <div className="col-span-3">Name (ID)</div>
                                <div className="col-span-2">Weight</div>
                                <div className="col-span-1"></div>
                            </div>
                        </div>

                        {/* Stage Rows */}
                        <div className="divide-y divide-neutral-100">
                            {stages.map((stage, idx) => (
                                <div key={stage.id} className="px-6 py-3 hover:bg-neutral-50 transition-colors group">
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-1 flex items-center gap-2">
                                            <GripVertical className="w-4 h-4 text-neutral-300 cursor-grab" />
                                            <span className="text-sm text-neutral-500">{idx + 1}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="px-2 py-1 bg-neutral-100 rounded text-xs font-mono font-medium text-neutral-700">
                                                {stage.stageCode}
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-sm text-neutral-900">{stage.stageName}</div>
                                        <div className="col-span-3 text-sm text-neutral-500">{stage.stageNameId || "-"}</div>
                                        <div className="col-span-2">
                                            <Input
                                                type="number"
                                                value={stage.weightDefault}
                                                onChange={(e) => handleWeightChange(idx, e.target.value)}
                                                className="max-w-[80px] text-sm"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDeleteStage(idx)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-500 hover:text-red-500"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {stages.length === 0 && (
                                <div className="px-6 py-8 text-center text-sm text-neutral-500">
                                    No stages defined yet. Click "Add Stage" to start.
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200">
                            <div className="flex justify-end text-sm">
                                Total Weight: <span className={`font-semibold ml-2 ${Math.abs(totalWeight - 100) > 0.01 ? "text-red-600" : "text-green-600"}`}>{totalWeight.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Warning if weight !== 100 */}
                    {Math.abs(totalWeight - 100) > 0.01 && (
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-sm text-yellow-800">
                            <strong>Warning:</strong> Total weight should equal 100%. Current total: {totalWeight.toFixed(2)}%
                        </div>
                    )}
                </div>
            </PageWrapper>

            {/* Add Stage Modal */}
            <AddStageModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddStage}
            />
        </div>
    );
}
