"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { OrganizationLevel, EntityStatus } from "@/lib/types/organization";
import {
    fetchLevels,
    upsertLevel,
    deleteLevel,
    updateLevelOrder
} from "@/lib/api/organization";
import { SortableTable, Column } from "../components/SortableTable";

// Helper outside component
const getRoman = (n: number) => {
    if (n === 0) return '0';
    const lookup: Record<number, string> = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
        6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
        11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV', 16: 'XVI'
    };
    return lookup[n] || n.toString();
};

export default function LevelsTable() {
    const [levels, setLevels] = useState<OrganizationLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<OrganizationLevel | null>(null);
    const [levelToDelete, setLevelToDelete] = useState<OrganizationLevel | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<OrganizationLevel>>({
        code: "",
        name: "",
        level_code: 0,
        roman_code: "",
        status: "Active" as EntityStatus
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchLevels();
        setLevels(data);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingLevel(null);
        setFormData({ code: "", name: "", level_code: 0, roman_code: "", status: "Active" });
        setIsModalOpen(true);
    };

    const handleEdit = (lvl: OrganizationLevel) => {
        setEditingLevel(lvl);
        setFormData(lvl);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (lvl: OrganizationLevel) => {
        setLevelToDelete(lvl);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!levelToDelete) return;
        await deleteLevel(levelToDelete.id);
        setIsDeleteModalOpen(false);
        setLevelToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        const payload: any = {
            code: formData.code,
            name: formData.name,
            level_code: formData.level_code,
            roman_code: formData.roman_code || getRoman(formData.level_code || 0),
            status: formData.status
        };

        if (editingLevel) {
            payload.id = editingLevel.id;
        } else {
            payload.order_index = levels.length + 1;
        }

        setIsSaving(true);
        try {
            const result = await upsertLevel(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            } else {
                alert("Failed to save level. Check console.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleReorder = async (newItems: OrganizationLevel[]) => {
        setLevels(newItems);
        const updatedItems = newItems.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
        await updateLevelOrder(updatedItems);
    };

    const columns: Column<OrganizationLevel>[] = [
        {
            key: "code",
            header: "Level",
            sortable: true,
            render: (item) => {
                const index = levels.findIndex(l => l.id === item.id);
                const displayIndex = index !== -1 ? index : (item.order_index || 0);

                return (
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-600 border border-neutral-200">
                            {getRoman(displayIndex)}
                        </div>
                        <span className="font-mono font-bold text-neutral-900 tracking-tight whitespace-nowrap">
                            {item.code}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "name",
            header: "Level Name",
            sortable: true,
            render: (item) => (
                <span className="text-neutral-500 font-medium text-sm">
                    {item.name}
                </span>
            )
        },
        {
            key: "status",
            header: "Status",
            width: "100px",
            sortable: true,
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
                    />
                    <Button
                        variant="text"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                    />
                </div>
            )
        }
    ];

    const MobileCard = ({ item }: { item: OrganizationLevel }) => {
        const index = levels.findIndex(l => l.id === item.id);
        const displayIndex = index !== -1 ? index : (item.order_index || 0);

        return (
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-neutral-700">{getRoman(displayIndex)}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono font-bold text-neutral-400 mb-0.5 tracking-wider uppercase">
                        {item.code} · {displayIndex}
                    </div>
                    <h4 className="font-semibold text-neutral-900 text-sm leading-snug truncate">
                        {item.name}
                    </h4>
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
                        />
                        <Button
                            variant="text"
                            size="sm"
                            iconOnly={<Trash2 className="w-4 h-4 text-red-600" />}
                            className="!p-1.5 h-8 w-8 hover:bg-red-50 bg-red-50/50 rounded-full"
                            onClick={() => handleDeleteClick(item)}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Listen for Mobile FAB actions
    useEffect(() => {
        const handleFabAction = (e: CustomEvent) => {
            if (e.detail?.id === 'STRUCTURE_ADD') {
                handleAdd();
            }
        };
        window.addEventListener('fab-action', handleFabAction as EventListener);
        return () => window.removeEventListener('fab-action', handleFabAction as EventListener);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Levels</h2>
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                >
                    Add Level
                </Button>
            </div>

            <div className="hidden md:block">
                <SortableTable
                    data={levels}
                    columns={columns}
                    isLoading={isLoading}
                    onReorder={handleReorder}
                />
            </div>

            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : levels.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No levels found</div>
                ) : (
                    levels.map(lvl => (
                        <MobileCard key={lvl.id} item={lvl} />
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-black/5">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50">
                            <h3 className="font-bold text-lg text-neutral-900">{editingLevel ? 'Edit Level' : 'Add Level'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Level Code (e.g. IN, JR)</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-mono"
                                    placeholder="IN"
                                    value={formData.code || ""}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Level Name</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                    placeholder="Internship/Freelance"
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Base Val (0-10)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="16"
                                        className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-mono"
                                        value={formData.level_code ?? 0}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 0;
                                            setFormData({
                                                ...formData,
                                                level_code: val,
                                                roman_code: getRoman(val)
                                            });
                                        }}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Default Roman</label>
                                    <input
                                        className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-serif"
                                        value={formData.roman_code || ""}
                                        onChange={e => setFormData({ ...formData, roman_code: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Status</label>
                                <div className="flex bg-neutral-100 p-1 rounded-xl">
                                    {["Active", "Inactive", "Archived"].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: status as EntityStatus })}
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
                                    disabled={isSaving}
                                    className="bg-blue-600 text-white min-w-[140px]"
                                >
                                    {editingLevel ? "Update Level" : "Save Level"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && levelToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Delete Level?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to delete <span className="font-bold">{levelToDelete.code}</span>?
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
