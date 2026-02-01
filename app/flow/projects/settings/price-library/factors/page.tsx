
"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, Search, Plus, Check, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";

type LocationFactor = {
    id: string;
    code: string | null;
    province: string;
    city: string | null;
    regional_factor: number;
    difficulty_factor: number;
};

// Common Provinces in Indonesia for Dropdown
const PROVINCES = [
    "Aceh", "Bali", "Banten", "Bengkulu", "DI Yogyakarta", "DKI Jakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur",
    "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara",
    "Kep. Bangka Belitung", "Kep. Riau", "Lampung", "Maluku", "Maluku Utara",
    "NTB", "NTT", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Pegunungan", "Papua Selatan", "Papua Tengah",
    "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara", "Sulawesi Utara",
    "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara"
];

export default function FactorsPage() {
    const [factors, setFactors] = useState<LocationFactor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Filter & Sort
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof LocationFactor; direction: 'asc' | 'desc' } | null>({ key: 'province', direction: 'asc' });

    // Grouping & Expansion
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Inline Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<LocationFactor>>({});

    // Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLocation, setNewLocation] = useState<Partial<LocationFactor>>({
        province: PROVINCES[0],
        regional_factor: 1.0,
        difficulty_factor: 1.0
    });
    const [isAdding, setIsAdding] = useState(false);

    // Delete State
    const [itemToDelete, setItemToDelete] = useState<LocationFactor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                const { data, error } = await supabase
                    .from('location_factors')
                    .select('*')
                    .eq('workspace_id', wsId);

                if (error) throw error;
                const loadedFactors = data || [];
                setFactors(loadedFactors);

                // Auto-expand all groups initially or just first few?
                // Let's expand all if query matches, otherwise collapse
            }
        } catch (error) {
            console.error("Failed to load factors", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Processing Data (Grouping & Sorting) ---

    const handleSort = (key: keyof LocationFactor) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleGroup = (provinceName: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(provinceName)) {
            newSet.delete(provinceName);
        } else {
            newSet.add(provinceName);
        }
        setExpandedGroups(newSet);
    };

    const processedData = useMemo(() => {
        // 1. Filter
        const query = searchQuery.toLowerCase();
        let filtered = factors.filter(f => {
            return (
                (f.code?.toLowerCase().includes(query) ?? false) ||
                f.province.toLowerCase().includes(query) ||
                (f.city?.toLowerCase().includes(query) ?? false)
            );
        });

        // 2. Group by Province
        const groups: Record<string, { parent: LocationFactor | null, children: LocationFactor[] }> = {};

        filtered.forEach(item => {
            if (!groups[item.province]) {
                groups[item.province] = { parent: null, children: [] };
            }
            if (!item.city) {
                // It's a parent (Province default)
                // If duplicates exist, first one wins as parent, others become children?
                // Let's assume unique constraint on workspace+province+city(null) handles this.
                groups[item.province].parent = item;
            } else {
                groups[item.province].children.push(item);
            }
        });

        // 3. Convert to Array and Sort Groups
        let groupList = Object.entries(groups).map(([provName, group]) => ({
            provinceName: provName,
            parent: group.parent,
            children: group.children
        }));

        // Sort Groups (by Province Name or Sort Key if applicable)
        groupList.sort((a, b) => {
            // Apply Sort if key is 'province' or 'code', otherwise default province alphabetical
            if (sortConfig?.key === 'province' || !sortConfig) {
                const dir = sortConfig?.direction === 'desc' ? -1 : 1;
                return a.provinceName.localeCompare(b.provinceName) * dir;
            }
            if (sortConfig?.key === 'code') {
                const dir = sortConfig?.direction === 'desc' ? -1 : 1;
                const aCode = a.parent?.code || "";
                const bCode = b.parent?.code || "";
                return aCode.localeCompare(bCode) * dir;
            }
            // For numeric sorts (RF/DF), sorting groups is ambiguous.
            // We usually sort by the Parent's value.
            if (sortConfig) {
                const dir = sortConfig.direction === 'desc' ? -1 : 1;
                const aVal = (a.parent as any)?.[sortConfig.key] || 0;
                const bVal = (b.parent as any)?.[sortConfig.key] || 0;
                if (aVal < bVal) return -1 * dir;
                if (aVal > bVal) return 1 * dir;
            }
            return 0;
        });

        // 4. Sort Children within Groups (always by City usually, or active sort)
        groupList.forEach(group => {
            group.children.sort((a, b) => {
                if (sortConfig?.key === 'city' || !sortConfig) {
                    const dir = sortConfig?.direction === 'desc' ? -1 : 1;
                    return (a.city || "").localeCompare(b.city || "") * dir;
                }
                // Other sorts on children
                if (sortConfig) {
                    const dir = sortConfig.direction === 'desc' ? -1 : 1;
                    const aVal = (a as any)[sortConfig.key] || 0;
                    const bVal = (b as any)[sortConfig.key] || 0;
                    if (aVal < bVal) return -1 * dir;
                    if (aVal > bVal) return 1 * dir;
                }
                return 0;
            });
        });

        return groupList;
    }, [factors, searchQuery, sortConfig]);

    // Auto-expand if searching
    useEffect(() => {
        if (searchQuery) {
            const allProvinces = new Set(processedData.map(g => g.provinceName));
            setExpandedGroups(allProvinces);
        }
    }, [searchQuery, processedData.length]); // Rough dependency

    // --- Inline Editing ---

    const startEdit = (factor: LocationFactor) => {
        setEditingId(factor.id);
        const copy = { ...factor };
        // If editing a child, we forbid changing province (group) to keep UI simple?
        // User said "nama provinsi dan kota ttep bisa diedit".
        // We will allow it.
        setEditValues(copy);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };

    const saveEdit = async () => {
        if (!editingId || !workspaceId) return;

        try {
            // Optimistic Update
            setFactors(prev => prev.map(f => f.id === editingId ? { ...f, ...editValues } as LocationFactor : f));
            setEditingId(null);

            const { error } = await supabase
                .from('location_factors')
                .update({
                    code: editValues.code,
                    province: editValues.province, // Allow rename
                    city: editValues.city,         // Allow rename
                    regional_factor: editValues.regional_factor,
                    difficulty_factor: editValues.difficulty_factor
                })
                .eq('id', editingId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to save edit", error);
            alert("Failed to save changes");
            loadData(); // Revert on error
        }
    };

    // --- Add Location ---

    const handleAddLocation = async () => {
        if (!workspaceId) return;
        setIsAdding(true);
        try {
            const { data, error } = await supabase
                .from('location_factors')
                .insert({
                    workspace_id: workspaceId,
                    code: newLocation.code,
                    province: newLocation.province,
                    city: newLocation.city || null,
                    regional_factor: newLocation.regional_factor || 1.0,
                    difficulty_factor: newLocation.difficulty_factor || 1.0
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setFactors(prev => [...prev, data]);
                setIsAddModalOpen(false);
                setNewLocation({ province: PROVINCES[0], regional_factor: 1.0, difficulty_factor: 1.0 });
                // Auto expand the group we just added to
                setExpandedGroups(prev => new Set(prev).add(data.province));
            }
        } catch (error) {
            console.error("Failed to add location", error);
            alert("Failed to add location");
        } finally {
            setIsAdding(false);
        }
    };


    // --- Delete Location ---

    const handleDelete = async () => {
        if (!itemToDelete || !workspaceId) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('location_factors')
                .delete()
                .eq('id', itemToDelete.id);

            if (error) throw error;

            setFactors(prev => prev.filter(f => f.id !== itemToDelete.id));
            setItemToDelete(null);
        } catch (error) {
            console.error("Failed to delete location", error);
            alert("Failed to delete location");
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Location Factors</h2>
                    <p className="text-sm text-neutral-500">
                        Adjust Regional Cost Factors (RF) and Difficulty Factors (DF).
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search location..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="primary"
                        className="bg-brand-red hover:bg-red-700 text-white border-none"
                        onClick={() => setIsAddModalOpen(true)}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add Location
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <SortableHeader label="Code" sortKey="code" currentSort={sortConfig} onSort={handleSort} className="w-24 pl-6" />
                            <SortableHeader label="Province / City" sortKey="province" currentSort={sortConfig} onSort={handleSort} className="w-64" />
                            <th className="px-4 py-3 font-semibold text-neutral-500 text-xs uppercase text-right w-32">Regional (RF)</th>
                            <th className="px-4 py-3 font-semibold text-neutral-500 text-xs uppercase text-right w-32">Difficulty (DF)</th>
                            <th className="px-6 py-3 font-semibold text-neutral-500 text-xs uppercase text-right w-24">Effective</th>
                            <th className="px-4 py-3 font-semibold text-neutral-500 text-xs uppercase text-center w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6}>
                                    <div className="py-20 text-center">
                                        <GlobalLoading />
                                    </div>
                                </td>
                            </tr>
                        ) : processedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-neutral-500">
                                    No locations found matching your search.
                                </td>
                            </tr>
                        ) : (
                            processedData.map((group) => {
                                const isExpanded = expandedGroups.has(group.provinceName) || !!searchQuery;

                                // Render Group Parent Row (if distinct) OR just Group Header?
                                // User wants "Province" as parent.
                                // Note: group.parent is the LocationFactor row where city is NULL.
                                // If it exists, we render it as the group header row.
                                // If it DOESN'T exist (impossible with our seed, but possible with edits), we render a virtual row?
                                // Let's simplify: We render the group.parent row. If group.parent is null, we might need a placeholder or just skip.

                                const parentRow = group.parent;
                                // If no parent row exists for this province (e.g. all have cities), we should probably create a dummy visual header?
                                // But for now let's assume parent exists or we skip.

                                const rowsToRender = [];
                                if (parentRow) rowsToRender.push({ ...parentRow, isParent: true });
                                if (isExpanded) {
                                    group.children.forEach(child => rowsToRender.push({ ...child, isParent: false }));
                                }

                                return rowsToRender.map(item => {
                                    const isEditing = editingId === item.id;
                                    const effective = (isEditing
                                        ? (editValues.regional_factor || 0) * (editValues.difficulty_factor || 0)
                                        : item.regional_factor * item.difficulty_factor
                                    ).toFixed(2);

                                    // Row Background: Parent is slightly darker/distinct?
                                    const rowBg = (item as any).isParent ? 'bg-neutral-50/50 hover:bg-neutral-100' : 'hover:bg-neutral-50';
                                    const editBg = isEditing ? 'bg-blue-50/50' : '';

                                    return (
                                        <tr key={item.id} className={`${rowBg} ${editBg} group transition-colors`}>

                                            {/* CODE */}
                                            <td className="px-6 py-3 font-mono text-xs font-medium text-neutral-500">
                                                {isEditing ? (
                                                    <Input
                                                        value={editValues.code || ""}
                                                        onChange={e => setEditValues({ ...editValues, code: e.target.value })}
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                        className="h-8 text-xs font-mono uppercase"
                                                        placeholder="---"
                                                    />
                                                ) : (
                                                    item.code || "-"
                                                )}
                                            </td>

                                            {/* PROVINCE / CITY Tree Column */}
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    {(item as any).isParent && (
                                                        <button
                                                            onClick={() => toggleGroup(group.provinceName)}
                                                            className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        </button>
                                                    )}

                                                    {isEditing ? (
                                                        (item as any).isParent ? (
                                                            // Parent: Edit Province Name
                                                            <Input
                                                                value={editValues.province || ""}
                                                                onChange={e => setEditValues({ ...editValues, province: e.target.value })}
                                                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                                className="h-8 text-sm font-semibold"
                                                            />
                                                        ) : (
                                                            // Child: Edit City Name (Indented)
                                                            <div className="pl-6 w-full">
                                                                <Input
                                                                    value={editValues.city || ""}
                                                                    onChange={e => setEditValues({ ...editValues, city: e.target.value })}
                                                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                        )
                                                    ) : (
                                                        (item as any).isParent ? (
                                                            <span
                                                                className="font-semibold text-neutral-900 cursor-pointer"
                                                                onClick={() => toggleGroup(group.provinceName)}
                                                            >
                                                                {item.province}
                                                            </span>
                                                        ) : (
                                                            <span className="pl-8 text-neutral-600">
                                                                {item.city}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </td>

                                            {/* RF */}
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={editValues.regional_factor}
                                                        onChange={(e) => setEditValues({ ...editValues, regional_factor: parseFloat(e.target.value) })}
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                        className="h-8 w-20 text-right font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-sm text-neutral-600">{item.regional_factor.toFixed(2)}</span>
                                                )}
                                            </td>

                                            {/* DF */}
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={editValues.difficulty_factor}
                                                        onChange={(e) => setEditValues({ ...editValues, difficulty_factor: parseFloat(e.target.value) })}
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                        className="h-8 w-20 text-right font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-sm text-neutral-600">{item.difficulty_factor.toFixed(2)}</span>
                                                )}
                                            </td>

                                            {/* EFFECTIVE */}
                                            <td className="px-6 py-3 text-right tabular-nums font-bold text-neutral-900 text-sm">
                                                {effective}x
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={saveEdit} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Save">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={cancelEdit} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Cancel">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <PencilLine className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {!isEditing && (
                                                    <button
                                                        onClick={() => setItemToDelete(item)}
                                                        className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                });
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-2">
                <span>ℹ️</span>
                <p>
                    <strong>RF (Regional Factor)</strong>: Multiplier for material/labor cost differences in this region.<br />
                    <strong>DF (Difficulty Factor)</strong>: Multiplier for site difficulty or logistics challenges.
                </p>
            </div>

            {/* ADD LOCATION MODAL */}
            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-50 animate-in zoom-in-95 duration-200">
                        <Dialog.Title className="text-lg font-bold text-neutral-900 mb-4">Add New Location</Dialog.Title>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Code (Optional)</label>
                                <Input
                                    placeholder="e.g. BND"
                                    value={newLocation.code || ""}
                                    onChange={e => setNewLocation({ ...newLocation, code: e.target.value.toUpperCase() })}
                                />
                                <p className="text-xs text-neutral-500 mt-1">Usually 2-3 letters (2 for Province, 3 for City)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Province</label>
                                <div className="space-y-2">
                                    <select
                                        className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newLocation.province}
                                        onChange={e => setNewLocation({ ...newLocation, province: e.target.value })}
                                    >
                                        {PROVINCES.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                        <option value="__NEW__">+ New Province</option>
                                    </select>
                                    {newLocation.province === "__NEW__" && (
                                        <Input
                                            placeholder="Enter new province name..."
                                            value={newLocation.province === "__NEW__" ? "" : newLocation.province}
                                            onChange={e => setNewLocation({ ...newLocation, province: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">City (Optional)</label>
                                <Input
                                    placeholder="Enter city name (leave empty for province default)"
                                    value={newLocation.city || ""}
                                    onChange={e => setNewLocation({ ...newLocation, city: e.target.value })}
                                />
                                <p className="text-xs text-neutral-500 mt-1">Leave empty to set the province's base factor.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Regional Factor</label>
                                    <Input
                                        type="number" step="0.01"
                                        value={newLocation.regional_factor}
                                        onChange={e => setNewLocation({ ...newLocation, regional_factor: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Difficulty Factor</label>
                                    <Input
                                        type="number" step="0.01"
                                        value={newLocation.difficulty_factor}
                                        onChange={e => setNewLocation({ ...newLocation, difficulty_factor: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="text" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button className="bg-brand-red text-white hover:bg-red-700" onClick={handleAddLocation} disabled={isAdding}>
                                {isAdding ? "Saving..." : "Save Location"}
                            </Button>
                        </div>

                        <Dialog.Close className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600">
                            <X className="w-4 h-4" />
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* DELETE CONFIRMATION MODAL */}
            <Dialog.Root open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-sm p-6 z-50 animate-in zoom-in-95 duration-200">
                        <Dialog.Title className="text-lg font-bold text-red-600 mb-2">ARE U SERIOUS?</Dialog.Title>
                        <Dialog.Description className="text-neutral-600 text-sm mb-6">
                            THIS IS UNDONEABLE. Are you sure you want to delete <strong>{itemToDelete?.city || itemToDelete?.province}</strong>?
                        </Dialog.Description>

                        <div className="flex justify-end gap-2">
                            <Button variant="text" onClick={() => setItemToDelete(null)}>Cancel</Button>
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

function SortableHeader({ label, sortKey, currentSort, onSort, className }: {
    label: string,
    sortKey: keyof LocationFactor,
    currentSort: { key: keyof LocationFactor, direction: 'asc' | 'desc' } | null,
    onSort: (k: keyof LocationFactor) => void,
    className?: string
}) {
    return (
        <th
            className={`px-4 py-3 font-semibold text-neutral-500 text-xs uppercase cursor-pointer hover:bg-neutral-100 transition-colors select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1.5">
                {label}
                {currentSort?.key === sortKey ? (
                    currentSort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-red" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-red" />
                ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300" />
                )}
            </div>
        </th>
    );
}
