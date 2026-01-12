"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Plus, PencilLine, Trash2, Filter } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { supabase } from "@/lib/supabaseClient";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";

type Resource = {
    id: string;
    workspace_id: string;
    name: string;
    category: 'material' | 'labor' | 'equipment';
    unit: string | null;
    price_default: number;
    source: string | null;
    description: string | null;
};

const CATEGORIES = [
    { id: 'all', label: 'All Resources' },
    { id: 'material', label: 'Material' },
    { id: 'labor', label: 'Labor (Upah)' },
    { id: 'equipment', label: 'Equipment' }
];

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState('all');

    // Modal State [Add/Edit]
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [formData, setFormData] = useState<Partial<Resource>>({
        category: 'material',
        price_default: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Loading Data ---
    const loadData = async () => {
        setIsLoading(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                const { data, error } = await supabase
                    .from('pricing_resources')
                    .select('*')
                    .eq('workspace_id', wsId)
                    .order('name', { ascending: true });

                if (error) throw error;
                setResources(data || []);
            }
        } catch (error) {
            console.error("Failed to load resources", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Filtering ---
    const filteredData = useMemo(() => {
        return resources.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            const matchesCategory = activeTab === 'all' || item.category === activeTab;
            return matchesSearch && matchesCategory;
        });
    }, [resources, searchQuery, activeTab]);

    // --- CRUD Operations ---

    // Open Modal for Create
    const openCreate = () => {
        setEditingResource(null);
        setFormData({
            category: activeTab === 'all' ? 'material' : activeTab as any,
            price_default: 0,
            unit: 'm3'
        });
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const openEdit = (res: Resource) => {
        setEditingResource(res);
        setFormData({ ...res });
        setIsModalOpen(true);
    };

    // Save (Insert/Update)
    const handleSave = async () => {
        if (!workspaceId) return;
        setIsSaving(true);
        try {
            const payload = {
                workspace_id: workspaceId,
                name: formData.name,
                category: formData.category,
                unit: formData.unit,
                price_default: formData.price_default || 0,
                source: formData.source,
                description: formData.description
            };

            if (editingResource) {
                // Update
                const { error } = await supabase
                    .from('pricing_resources')
                    .update(payload)
                    .eq('id', editingResource.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('pricing_resources')
                    .insert(payload);
                if (error) throw error;
            }

            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save resource");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Confirm
    const confirmDelete = (res: Resource) => {
        setResourceToDelete(res);
        setIsDeleteModalOpen(true);
    };

    // Execute Delete
    const handleDelete = async () => {
        if (!resourceToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('pricing_resources')
                .delete()
                .eq('id', resourceToDelete.id);
            if (error) throw error;

            setResources(prev => prev.filter(r => r.id !== resourceToDelete.id));
            setIsDeleteModalOpen(false);
            setResourceToDelete(null);
        } catch (error) {
            console.error("Delete failed", error);
            // Likely linked to AHSP
            alert("This resource cannot be deleted because it is used in an AHSP analysis.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Resource Library</h2>
                    <p className="text-sm text-neutral-500">
                        Manage base prices for Materials, Labor, and Equipment.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search resources..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        className="bg-brand-red hover:bg-red-700 text-white border-none"
                        onClick={openCreate}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add Resource
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-200 gap-6">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={clsx(
                            "pb-3 text-sm font-medium transition-colors relative",
                            activeTab === cat.id ? "text-brand-red" : "text-neutral-500 hover:text-neutral-700"
                        )}
                    >
                        {cat.label}
                        {activeTab === cat.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-neutral-500 text-xs uppercase w-64">Name</th>
                            <th className="px-4 py-3 font-semibold text-neutral-500 text-xs uppercase w-32">Category</th>
                            <th className="px-4 py-3 font-semibold text-neutral-500 text-xs uppercase text-right w-24">Unit</th>
                            <th className="px-6 py-3 font-semibold text-neutral-500 text-xs uppercase text-right w-40">Base Price (Rp)</th>
                            <th className="px-6 py-3 font-semibold text-neutral-500 text-xs uppercase">Source / Notes</th>
                            <th className="px-4 py-3 font-semibold text-neutral-500 text-xs uppercase text-center w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-neutral-400">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    Loading resources...
                                </td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-neutral-500">
                                    No resources found. Add your first item.
                                </td>
                            </tr>
                        ) : (
                            filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-neutral-50 group transition-colors">
                                    <td className="px-6 py-3 text-sm font-medium text-neutral-900">{item.name}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                                            item.category === 'material' && "bg-blue-100 text-blue-800",
                                            item.category === 'labor' && "bg-amber-100 text-amber-800",
                                            item.category === 'equipment' && "bg-purple-100 text-purple-800"
                                        )}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-neutral-600">{item.unit || "-"}</td>
                                    <td className="px-6 py-3 text-sm text-right font-mono text-neutral-900">
                                        {new Intl.NumberFormat('id-ID').format(item.price_default)}
                                    </td>
                                    <td className="px-6 py-3 text-xs text-neutral-500 truncate max-w-xs" title={item.description || ""}>
                                        {item.source || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition-colors"
                                            >
                                                <PencilLine className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(item)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD / EDIT MODAL */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-50 animate-in zoom-in-95 duration-200">
                        <Dialog.Title className="text-lg font-bold text-neutral-900 mb-4">
                            {editingResource ? "Edit Resource" : "Add Resource"}
                        </Dialog.Title>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                                <Input
                                    placeholder="e.g. Semen Portland, Mandor"
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                                    <div className="relative">
                                        <select
                                            className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                        >
                                            <option value="material">Material</option>
                                            <option value="labor">Labor</option>
                                            <option value="equipment">Equipment</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Unit</label>
                                    <Input
                                        placeholder="e.g. kg, m3, day"
                                        value={formData.unit || ""}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Base Price (Rp)</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.price_default}
                                    onChange={e => setFormData({ ...formData, price_default: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Source / Reference</label>
                                <Input
                                    placeholder="e.g. HSPK 2024, Vendor ABC"
                                    value={formData.source || ""}
                                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Optional notes..."
                                    value={formData.description || ""}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="text" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button className="bg-brand-red text-white hover:bg-red-700" onClick={handleSave} disabled={isSaving || !formData.name}>
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                        </div>

                        <Dialog.Close className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600">
                            <X className="w-4 h-4" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* DELETE CONFIRMATION MODAL */}
            <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-sm p-6 z-50 animate-in zoom-in-95 duration-200">
                        <Dialog.Title className="text-lg font-bold text-red-600 mb-2">Delete Resource?</Dialog.Title>
                        <Dialog.Description className="text-neutral-600 text-sm mb-6">
                            Are you sure you want to delete <strong>{resourceToDelete?.name}</strong>? This action cannot be undone.
                        </Dialog.Description>

                        <div className="flex justify-end gap-2">
                            <Button variant="text" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting ? "Deleting..." : "Yes, Delete it"}
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

        </div>
    );
}

// Icons Helpers (Need to import X if using it in Close)
import { X } from "lucide-react";
