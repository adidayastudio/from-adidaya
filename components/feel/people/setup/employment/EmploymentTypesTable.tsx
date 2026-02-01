"use client";

import { useEffect, useState } from "react";
import { EmploymentType, OrganizationLevel } from "@/lib/types/organization";
import { fetchEmploymentTypes, upsertEmploymentType, deleteEmploymentType, updateEmploymentTypeOrder } from "@/lib/api/employment";
import { fetchLevels } from "@/lib/api/organization";
import { SortableTable, Column } from "../components/SortableTable";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Pencil, Trash2, Star, Plus, AlertTriangle, X, Loader2 } from "lucide-react";

const getRoman = (n: number) => {
    if (n === 0) return '0';
    const lookup: Record<number, string> = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
        6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
    };
    return lookup[n] || n.toString();
};

export default function EmploymentTypesTable({ isLocked }: { isLocked?: boolean }) {
    const [types, setTypes] = useState<EmploymentType[]>([]);
    const [levels, setLevels] = useState<OrganizationLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<EmploymentType | null>(null);
    const [typeToDelete, setTypeToDelete] = useState<EmploymentType | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<EmploymentType>>({
        name: "",
        min_level_code: 0,
        max_level_code: 5,
        is_default: false,
        status: "Active"
    });

    useEffect(() => {
        loadData();
    }, []);

    // Listen for Mobile FAB
    useEffect(() => {
        const handleFabAction = (e: CustomEvent) => {
            if (e.detail?.id === 'EMPLOYMENT_ADD') {
                handleAdd();
            }
        };

        window.addEventListener('fab-action', handleFabAction as EventListener);
        return () => window.removeEventListener('fab-action', handleFabAction as EventListener);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [typesData, levelsData] = await Promise.all([
            fetchEmploymentTypes(),
            fetchLevels()
        ]);
        setTypes(typesData);
        setLevels(levelsData);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingType(null);
        setFormData({ name: "", min_level_code: 0, max_level_code: 5, is_default: false, status: "Active" });
        setIsModalOpen(true);
    };

    const handleEdit = (item: EmploymentType) => {
        setEditingType(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: EmploymentType) => {
        setTypeToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!typeToDelete) return;
        await deleteEmploymentType(typeToDelete.id);
        setIsDeleteModalOpen(false);
        setTypeToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            const payload = { ...formData };
            if (editingType) {
                payload.id = editingType.id;
            } else {
                payload.order_index = types.length + 1;
            }

            const result = await upsertEmploymentType(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleReorder = async (newItems: EmploymentType[]) => {
        setTypes(newItems);
        const updatedItems = newItems.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
        await updateEmploymentTypeOrder(updatedItems);
    };

    // Prepare dropdown options
    const levelOptions = levels.map(l => ({
        label: `${l.roman_code} - ${l.name}`,
        value: l.level_code.toString()
    }));

    // If no levels loaded yet (e.g. initialization or empty), provide at least 0-5
    if (levelOptions.length === 0) {
        for (let i = 0; i <= 5; i++) {
            levelOptions.push({ label: getRoman(i), value: i.toString() });
        }
    }

    const columns: Column<EmploymentType>[] = [
        {
            key: "name",
            header: "Type Name",
            sortable: true,
            render: (item) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{item.name}</span>
                    {item.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
                            Default
                        </span>
                    )}
                </div>
            )
        },
        {
            key: "min_level_code",
            header: "Linked Level",
            render: (item) => (
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {getRoman(item.min_level_code ?? 0)}
                    </span>
                    <span className="text-neutral-400">-</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {getRoman(item.max_level_code ?? 5)}
                    </span>
                </div>
            )
        },
        {
            key: "status",
            header: "Status",
            width: "100px",
            render: (item) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.status === "Active"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                    }`}>
                    {item.status}
                </span>
            )
        },
        {
            key: "actions",
            header: "",
            width: "100px",
            render: (item) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="text"
                        size="sm"
                        icon={<Pencil className="w-4 h-4 text-neutral-500" />}
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        disabled={isLocked}
                    />
                    <Button
                        variant="text"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                        disabled={isLocked}
                    />
                </div>
            )
        }
    ];

    const MobileCard = ({ item }: { item: EmploymentType }) => (
        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-neutral-900 text-sm truncate">{item.name}</h4>
                    {item.is_default && <Star className="w-3 h-3 text-blue-500 fill-current" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded">Levels: {getRoman(item.min_level_code)} - {getRoman(item.max_level_code)}</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${item.status === "Active"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}>
                    {item.status}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="text"
                        size="sm"
                        iconOnly={<Pencil className="w-4 h-4 text-blue-600" />}
                        className="!p-1.5 h-8 w-8 hover:bg-blue-50 bg-blue-50/50 rounded-full"
                        onClick={() => handleEdit(item)}
                        disabled={isLocked}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Employment Types</h2>
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                    disabled={isLocked}
                >
                    Add Type
                </Button>
            </div>

            <div className="hidden md:block">
                <SortableTable
                    data={types}
                    columns={columns}
                    isLoading={isLoading}
                    onReorder={handleReorder}
                />
            </div>

            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : types.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No types found</div>
                ) : (
                    types.map(t => <MobileCard key={t.id} item={t} />)
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-black/5">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-neutral-900">{editingType ? 'Edit Type' : 'Add Type'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Type Name</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                    placeholder="e.g. Full-Time, Contract"
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Min Level</label>
                                    <Select
                                        variant="filled" // Matches the bg-neutral-50 feel of other inputs
                                        options={levelOptions}
                                        value={formData.min_level_code?.toString()}
                                        onChange={(val) => setFormData({ ...formData, min_level_code: parseInt(val) })}
                                        placeholder="Select Level"
                                        accentColor="blue"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Max Level</label>
                                    <Select
                                        variant="filled"
                                        options={levelOptions}
                                        value={formData.max_level_code?.toString()}
                                        onChange={(val) => setFormData({ ...formData, max_level_code: parseInt(val) })}
                                        placeholder="Select Level"
                                        accentColor="blue"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                                    checked={formData.is_default || false}
                                    onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                />
                                <label htmlFor="isDefault" className="text-sm font-medium text-neutral-700">Set as Default Employment Type</label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Status</label>
                                <div className="flex bg-neutral-100 p-1 rounded-xl">
                                    {["Active", "Archived"].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: status as any })}
                                            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${formData.status === status
                                                ? "bg-white text-neutral-900 shadow-sm"
                                                : "text-neutral-500 hover:text-neutral-700"
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button
                                    type="submit"
                                    loading={isSaving}
                                    disabled={isSaving || isLocked}
                                    className="bg-blue-600 text-white min-w-[140px]"
                                >
                                    {isLocked ? "Governance Locked" : editingType ? "Update Type" : "Save Type"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && typeToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Delete Employment Type?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to delete <span className="font-bold">{typeToDelete.name}</span>?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmDelete}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
