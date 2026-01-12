"use client";

import { useState, useEffect } from "react";
import Page from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { ArrowLeft, Plus, Pencil, Trash2, Building2, PenTool, Hammer, X, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { fetchProjectTypes, createProjectType, deleteProjectType, fetchDefaultWorkspaceId, ProjectTypeTemplate } from "@/lib/api/templates";

// Fallback if no workspace found
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

const ICONS: Record<string, React.FC<{ className?: string }>> = {
    Building2,
    PenTool,
    Hammer,
};

const COLOR_OPTIONS = [
    { label: "Blue", value: "bg-blue-500" },
    { label: "Purple", value: "bg-purple-500" },
    { label: "Orange", value: "bg-orange-500" },
    { label: "Green", value: "bg-green-500" },
    { label: "Red", value: "bg-red-500" },
    { label: "Teal", value: "bg-teal-500" },
];

// Add Modal Component
function AddTypeModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (type: any) => void }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("bg-blue-500");
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            const projectTypeId = name.toLowerCase().replace(/\s+/g, "-");
            await onAdd({ projectTypeId, name, description, icon: "Building2", color });
            setName("");
            setDescription("");
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">Add Project Type</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    <Input
                        label="Type Name"
                        placeholder="e.g. Interior Design"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        label="Description"
                        placeholder="Brief description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setColor(opt.value)}
                                    className={`w-8 h-8 rounded-full ${opt.value} ${color === opt.value ? "ring-2 ring-offset-2 ring-red-500" : ""}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="bg-brand-red hover:bg-brand-red-hover text-white"
                    >
                        {isSaving ? "Adding..." : "Add Type"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Delete Confirmation Modal
function DeleteModal({ isOpen, typeName, onClose, onConfirm }: { isOpen: boolean; typeName: string; onClose: () => void; onConfirm: () => void }) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                <h2 className="text-lg font-bold text-neutral-900 mb-2">Delete Project Type</h2>
                <p className="text-sm text-neutral-600 mb-6">
                    Are you sure you want to delete <strong>{typeName}</strong>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        icon={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600 text-white"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function TypeCard({ type, onEdit, onDelete }: { type: ProjectTypeTemplate; onEdit: () => void; onDelete: () => void }) {
    const Icon = ICONS[type.icon || "Building2"] || Building2;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-red-200 hover:shadow-sm transition-all group">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${type.color} flex items-center justify-center text-white`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900">{type.name}</h3>
                    <p className="text-sm text-neutral-500 mt-1">{type.description}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/flow/projects/settings/types/${type.projectTypeId}`}>
                        <button className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500" title="Edit">
                            <Pencil className="w-4 h-4" />
                        </button>
                    </Link>
                    <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-neutral-500 hover:text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SettingsTypesPage() {
    const [types, setTypes] = useState<ProjectTypeTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ProjectTypeTemplate | null>(null);
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    // Load types from database
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // First try to detect the real workspace ID
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const data = await fetchProjectTypes(wsId);
            setTypes(data);
        } catch (error) {
            console.error("Failed to load project types:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddType = async (newType: any) => {
        try {
            await createProjectType(workspaceId, {
                projectTypeId: newType.projectTypeId,
                name: newType.name,
                description: newType.description,
                icon: newType.icon,
                color: newType.color,
                isActive: true,
            });
            await loadData();
        } catch (error) {
            console.error("Failed to add project type:", error);
        }
    };

    const handleDeleteType = async () => {
        if (deleteTarget) {
            try {
                await deleteProjectType(deleteTarget.projectTypeId, workspaceId);
                await loadData();
                setDeleteTarget(null);
            } catch (error) {
                console.error("Failed to delete project type:", error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Project Types" }]} />
            <Page sidebar={<ProjectsSidebar />}>
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
                                <h1 className="text-2xl font-bold text-neutral-900">Project Types</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure available project types and their stage templates.</p>
                            </div>
                        </div>
                        <Button
                            icon={<Plus className="w-4 h-4" />}
                            className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white"
                            onClick={() => setShowAddModal(true)}
                        >
                            Add Type
                        </Button>
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                        </div>
                    ) : (
                        <>
                            {/* Type Cards */}
                            <div className="grid gap-4">
                                {types.map((type) => (
                                    <TypeCard
                                        key={type.id}
                                        type={type}
                                        onEdit={() => { }}
                                        onDelete={() => setDeleteTarget(type)}
                                    />
                                ))}
                            </div>

                            {/* Info Note */}
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                                <strong>Note:</strong> Project types determine which stages are available. Click the edit icon to configure stages.
                            </div>
                        </>
                    )}
                </div>
            </Page>

            {/* Modals */}
            <AddTypeModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddType}
            />
            <DeleteModal
                isOpen={!!deleteTarget}
                typeName={deleteTarget?.name || ""}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteType}
            />
        </div>
    );
}
