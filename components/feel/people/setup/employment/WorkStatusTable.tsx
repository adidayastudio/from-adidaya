"use client";

import { useEffect, useState } from "react";
import { WorkStatus } from "@/lib/types/organization";
import { fetchWorkStatuses, upsertWorkStatus, deleteWorkStatus, updateWorkStatusOrder } from "@/lib/api/employment";
import { SortableTable, Column } from "../components/SortableTable";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Pencil, Trash2, Plus, AlertTriangle, X, Palette } from "lucide-react";

// Curated "nice" colors (Tailwind 500/600 shades that look good on UI)
const PRESET_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#84CC16', // Lime
    '#6B7280', // Gray
];

export default function WorkStatusTable() {
    const [statuses, setStatuses] = useState<WorkStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<WorkStatus | null>(null);
    const [statusToDelete, setStatusToDelete] = useState<WorkStatus | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<WorkStatus>>({
        name: "",
        color: "#3B82F6",
        visibility: "Public",
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
        const data = await fetchWorkStatuses();
        setStatuses(data);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingStatus(null);
        setFormData({ name: "", color: "#3B82F6", visibility: "Public", status: "Active" });
        setIsModalOpen(true);
    };

    const handleEdit = (item: WorkStatus) => {
        setEditingStatus(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: WorkStatus) => {
        setStatusToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!statusToDelete) return;
        await deleteWorkStatus(statusToDelete.id);
        setIsDeleteModalOpen(false);
        setStatusToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            const payload = { ...formData };
            if (editingStatus) {
                payload.id = editingStatus.id;
            } else {
                payload.order_index = statuses.length + 1;
            }

            const result = await upsertWorkStatus(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleReorder = async (newItems: WorkStatus[]) => {
        setStatuses(newItems);
        const updatedItems = newItems.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
        await updateWorkStatusOrder(updatedItems);
    };

    const columns: Column<WorkStatus>[] = [
        {
            key: "name",
            header: "Status Name",
            sortable: true,
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                    <span className="font-medium text-neutral-900">{item.name}</span>
                </div>
            )
        },
        {
            key: "visibility",
            header: "Visibility",
            render: (item) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${item.visibility === 'Public' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                    item.visibility === 'Team Only' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}>
                    {item.visibility}
                </span>
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

    const MobileCard = ({ item }: { item: WorkStatus }) => (
        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></div>
                    <h4 className="font-semibold text-neutral-900 text-sm truncate">{item.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${item.visibility === 'Public' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                        item.visibility === 'Team Only' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-neutral-100 text-neutral-600 border-neutral-200'
                        }`}>
                        {item.visibility}
                    </span>
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
                    />
                </div>
            </div>
        </div>
    );

    const visibilityOptions = [
        { label: "Public (Visible to everyone)", value: "Public" },
        { label: "Team Only (Visible to managers & team)", value: "Team Only" },
        { label: "Private (Hidden from directory)", value: "Private" }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Work Status</h2>
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                >
                    Add Status
                </Button>
            </div>

            <div className="hidden md:block">
                <SortableTable
                    data={statuses}
                    columns={columns}
                    isLoading={isLoading}
                    onReorder={handleReorder}
                />
            </div>

            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : statuses.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No statuses found</div>
                ) : (
                    statuses.map(s => <MobileCard key={s.id} item={s} />)
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-black/5">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-neutral-900">{editingStatus ? 'Edit Status' : 'Add Status'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Status Name</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                    placeholder="e.g. Active, On Leave"
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Color Indicator</label>
                                <div className="flex gap-3 flex-wrap items-center">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-9 h-9 rounded-full transition-all hover:scale-110 shadow-sm ${formData.color === color ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110' : 'ring-1 ring-black/5 hover:ring-black/10'}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}

                                    <div className="relative w-9 h-9 rounded-full overflow-hidden transition-all hover:scale-110 ring-1 ring-black/10 cursor-pointer bg-neutral-100 flex items-center justify-center group">
                                        <Palette className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700" />
                                        <input
                                            type="color"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            value={formData.color}
                                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Visibility</label>
                                <Select
                                    variant="filled"
                                    options={visibilityOptions}
                                    value={formData.visibility}
                                    onChange={(val) => setFormData({ ...formData, visibility: val as any })}
                                    placeholder="Select Visibility"
                                    accentColor="blue"
                                />
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
                                    disabled={isSaving}
                                    className="bg-blue-600 text-white min-w-[140px]"
                                >
                                    {editingStatus ? "Update Status" : "Save Status"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && statusToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Delete Status?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to delete <span className="font-bold">{statusToDelete.name}</span>?
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
