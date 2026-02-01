"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import { ArrowLeft, Plus, ChevronRight, ChevronDown, FileText, Save, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchProjectTypes, fetchWbsTemplate, saveWbsTemplate, fetchDefaultWorkspaceId, ProjectTypeTemplate } from "@/lib/api/templates";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

interface WbsNode {
    code: string;
    nameEn: string;
    nameId?: string;
    children?: WbsNode[];
}

// Recursive WBS Item Component
function WBSItem({ item, level = 0, onEdit, onDelete, onAddChild }: {
    item: WbsNode;
    level?: number;
    onEdit: (item: WbsNode) => void;
    onDelete: () => void;
    onAddChild: () => void;
}) {
    const [expanded, setExpanded] = useState(level < 1); // Expand top level by default
    const hasChildren = item.children && item.children.length > 0;

    return (
        <div>
            <div
                className={`flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 transition-colors group ${level === 0 ? "bg-neutral-50/50" : ""}`}
                style={{ paddingLeft: `${level * 24 + 16}px` }}
            >
                <div
                    className="cursor-pointer p-1 hover:bg-neutral-200 rounded"
                    onClick={() => hasChildren && setExpanded(!expanded)}
                >
                    {hasChildren ? (
                        expanded ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />
                    ) : (
                        <FileText className="w-4 h-4 text-neutral-300" />
                    )}
                </div>

                <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 min-w-[3ch] text-center">
                    {item.code}
                </span>

                <div className="flex-1 flex flex-col justify-center">
                    <span className={`text-sm ${level === 0 ? "font-semibold text-neutral-900" : "text-neutral-700"}`}>
                        {item.nameEn}
                    </span>
                    {item.nameId && (
                        <span className="text-xs text-neutral-400 italic">
                            {item.nameId}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-neutral-400 hover:text-blue-600" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onAddChild} className="p-1.5 rounded-lg hover:bg-green-50 text-neutral-400 hover:text-green-600" title="Add Child">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {expanded && hasChildren && (
                <div className="border-l border-neutral-100 ml-4">
                    {item.children!.map((child, idx) => (
                        <WBSItem
                            key={child.code + idx}
                            item={child}
                            level={level + 1}
                            onEdit={() => onEdit(child)} // Identify logic needs to be better in real app
                            onDelete={() => { }} // Placeholder: Need a way to identify path to delete
                            onAddChild={() => { }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Edit Modal
function EditNodeModal({
    isOpen,
    node,
    onClose,
    onSave
}: {
    isOpen: boolean;
    node: WbsNode | null; // null = adding new
    onClose: () => void;
    onSave: (node: WbsNode) => void
}) {
    const [code, setCode] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [nameId, setNameId] = useState("");

    useEffect(() => {
        if (node) {
            setCode(node.code);
            setNameEn(node.nameEn);
            setNameId(node.nameId || "");
        } else {
            setCode("");
            setNameEn("");
            setNameId("");
        }
    }, [node, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">{node ? "Edit Item" : "Add Item"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. A.1" />
                    <Input label="Name (EN)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Foundation" />
                    <Input label="Name (ID)" value={nameId} onChange={(e) => setNameId(e.target.value)} placeholder="e.g. Fondasi" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => {
                        onSave({ code, nameEn, nameId: nameId || undefined, children: node?.children || [] });
                        onClose();
                    }} className="bg-brand-red text-white">Save</Button>
                </div>
            </div>
        </div>
    );
}


export default function SettingsWBSPage() {
    const [projectTypes, setProjectTypes] = useState<ProjectTypeTemplate[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    // WBS Data
    const [wbsData, setWbsData] = useState<WbsNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingNodePath, setEditingNodePath] = useState<number[] | null>(null); // Array of indices to locate node
    const [targetNode, setTargetNode] = useState<WbsNode | null>(null);

    useEffect(() => {
        loadTypes();
    }, []);

    useEffect(() => {
        if (selectedTypeId) {
            loadWbs(selectedTypeId);
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
            console.error("Failed to load types:", error);
        }
    };

    const loadWbs = async (typeId: string) => {
        setIsLoading(true);
        try {
            const template = await fetchWbsTemplate(workspaceId, typeId);
            if (template && template.wbsStructure) {
                setWbsData(template.wbsStructure as WbsNode[]);
            } else {
                setWbsData([]);
            }
        } catch (error) {
            console.error("Failed to load WBS:", error);
            setWbsData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBackend = async () => {
        if (!selectedTypeId) return;
        setIsSaving(true);
        try {
            await saveWbsTemplate(workspaceId, selectedTypeId, wbsData);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper: Find node reference and update it (Immutably)
    // This requires a deep clone or careful path traversal.
    // Simplified approach: Serialize/Deserialize for deep clone or use comprehensive recusrion
    const updateTree = (prevData: WbsNode[], path: number[], action: 'update' | 'add-child' | 'delete', payload?: WbsNode): WbsNode[] => {
        const newData = JSON.parse(JSON.stringify(prevData)); // Deep clone
        let current = newData;
        let target = null;

        // Traverse to parent of target or target itself
        for (let i = 0; i < path.length; i++) {
            if (i === path.length - 1) {
                // Last index
                if (action === 'delete') {
                    current.splice(path[i], 1);
                    return newData;
                }
                target = current[path[i]];
            } else {
                current = current[path[i]].children;
            }
        }

        if (action === 'update' && target && payload) {
            target.code = payload.code;
            target.nameEn = payload.nameEn;
            target.nameId = payload.nameId;
        } else if (action === 'add-child' && target && payload) {
            if (!target.children) target.children = [];
            target.children.push(payload);
        }

        return newData;
    };

    const handleNodeAction = (path: number[], action: 'edit' | 'add-child' | 'delete') => {
        // Get the node at path
        let current = wbsData;
        let node = null;
        for (let idx of path) {
            node = current[idx];
            current = node.children || [];
        }

        if (action === 'delete') {
            if (confirm("Are you sure you want to delete this item and all its children?")) {
                setWbsData(prev => updateTree(prev, path, 'delete'));
            }
        } else if (action === 'edit') {
            setTargetNode(node);
            setEditingNodePath(path);
            setShowModal(true);
        } else if (action === 'add-child') {
            setTargetNode(null); // Adding new
            setEditingNodePath(path); // Parent path
            setShowModal(true);
        }
    };

    const handleModalSave = (nodeData: WbsNode) => {
        if (targetNode) {
            // Edit existing
            if (editingNodePath) {
                setWbsData(prev => updateTree(prev, editingNodePath, 'update', nodeData));
            }
        } else {
            // Add new child
            if (editingNodePath) {
                // Adding child to existing node (editingNodePath is parent)
                setWbsData(prev => updateTree(prev, editingNodePath, 'add-child', nodeData));
            } else {
                // Add root node
                setWbsData(prev => [...prev, nodeData]);
            }
        }
        setShowModal(false);
    };

    // Recursive render helper
    const renderTree = (nodes: WbsNode[], path: number[] = []) => {
        return nodes.map((node, idx) => (
            <div key={node.code + idx}>
                <WBSItem
                    item={node}
                    level={path.length}
                    onEdit={() => handleNodeAction([...path, idx], 'edit')}
                    onDelete={() => handleNodeAction([...path, idx], 'delete')}
                    onAddChild={() => handleNodeAction([...path, idx], 'add-child')}
                />
                {node.children && node.children.length > 0 && (
                    <div className="border-l border-neutral-100 ml-4">
                        {renderTree(node.children, [...path, idx])}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "WBS Templates" }]} />
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
                                <h1 className="text-2xl font-bold text-neutral-900">WBS Templates</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure default Work Breakdown Structure templates.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setTargetNode(null); setEditingNodePath(null); setShowModal(true); }} className="!rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
                                Add Root
                            </Button>
                            <Button
                                icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                onClick={handleSaveBackend}
                                className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white"
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-neutral-200 p-5">
                        <div className="max-w-xs">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Project Type</label>
                            <select
                                className="w-full p-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={selectedTypeId}
                                onChange={(e) => setSelectedTypeId(e.target.value)}
                            >
                                {projectTypes.map(t => (
                                    <option key={t.id} value={t.projectTypeId}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* WBS Tree */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden min-h-[400px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-20">
                                <GlobalLoading />
                            </div>
                        ) : wbsData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-60 text-neutral-400">
                                <FileText className="w-10 h-10 mb-2 opacity-50" />
                                <p>No WBS template found for this project type.</p>
                                <Button className="mt-4" variant="secondary" onClick={() => { setTargetNode(null); setEditingNodePath(null); setShowModal(true); }}>Create First Item</Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100 py-2">
                                {/* Custom recursive render to handle flat path logic correctly from root */}
                                {renderTree(wbsData)}
                            </div>
                        )}
                    </div>

                    {/* Info Note */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                        <strong>Note:</strong> WBS templates are applied when creating new projects. Per-project WBS can be customized in Setup → WBS.
                    </div>
                </div>
            </PageWrapper>

            <EditNodeModal
                isOpen={showModal}
                node={targetNode}
                onClose={() => setShowModal(false)}
                onSave={handleModalSave}
            />
        </div>
    );
}
