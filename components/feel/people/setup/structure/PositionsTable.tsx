"use client";

import { useEffect, useState } from "react";
import { Plus, Archive as ArchiveIcon, Undo2, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { OrganizationPosition, OrganizationDepartment, EntityStatus } from "@/lib/types/organization";
import {
    fetchPositions,
    fetchDepartments,
    upsertPosition,
    deletePosition
} from "@/lib/api/organization";
import { SortableTable, Column } from "../components/SortableTable";

export default function PositionsTable() {
    const [positions, setPositions] = useState<OrganizationPosition[]>([]);
    const [departments, setDepartments] = useState<OrganizationDepartment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<OrganizationPosition | null>(null);
    const [posToDelete, setPosToDelete] = useState<OrganizationPosition | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<Partial<OrganizationPosition>>({
        code: "",
        name: "",
        department_id: "",
        category_code: 1,
        status: "Active" as EntityStatus
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [posData, deptData] = await Promise.all([
            fetchPositions(),
            fetchDepartments()
        ]);

        // Sort by Department Full Code (numeric 1, 2, 3...) then by Category Code
        const sortedPos = [...posData].sort((a, b) => {
            const numA = parseInt(a.department_full_code || "0");
            const numB = parseInt(b.department_full_code || "0");

            if (numA !== numB) return numA - numB;
            return (a.category_code || 0) - (b.category_code || 0);
        });

        setPositions(sortedPos);
        setDepartments(deptData);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingPosition(null);
        setFormData({
            code: "",
            name: "",
            department_id: departments[0]?.id || "",
            category_code: 1,
            status: "Active" as EntityStatus
        });
        setIsModalOpen(true);
    };

    const handleEdit = (pos: OrganizationPosition) => {
        setEditingPosition(pos);
        setFormData(pos);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (pos: OrganizationPosition) => {
        setPosToDelete(pos);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!posToDelete) return;
        await deletePosition(posToDelete.id);
        setIsDeleteModalOpen(false);
        setPosToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code || !formData.name || !formData.department_id) return;

        const payload: any = {
            code: formData.code,
            name: formData.name,
            department_id: formData.department_id,
            category_code: formData.category_code,
            status: formData.status
        };

        if (editingPosition) {
            payload.id = editingPosition.id;
        }

        setIsSaving(true);
        try {
            const result = await upsertPosition(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            } else {
                alert("Failed to save position. Check console.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const columns: Column<OrganizationPosition>[] = [
        {
            key: "code",
            header: "Position",
            sortable: true,
            render: (item) => (
                <div className="flex items-center gap-4">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-600 border border-neutral-200">
                        {item.category_code}
                    </span>
                    <div className="flex items-baseline gap-3">
                        <span className="font-mono font-bold text-neutral-900 tracking-tight whitespace-nowrap">
                            {item.code}
                        </span>
                        <span className="text-neutral-500 font-medium text-sm whitespace-nowrap">
                            {item.name}
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: "department_full_code",
            header: "Department",
            sortable: true,
            render: (item) => (
                <div className="flex flex-col">
                    <span className="text-neutral-700 font-normal italic text-sm leading-tight">
                        {item.department_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono tracking-wider">
                        {item.department_full_code || "N/A"}
                    </span>
                </div>
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

    // Mobile Card Component
    const MobileCard = ({ item }: { item: OrganizationPosition }) => {
        return (
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm transition-all hover:shadow-md flex items-center gap-5">
                {/* Left: Position Code Circle */}
                <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-neutral-700">{item.code}</span>
                </div>

                {/* Middle: Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono font-bold text-neutral-400 mb-0.5 tracking-wider uppercase">
                        {item.department_abbr} · {item.category_code}
                    </div>
                    <h4 className="font-semibold text-neutral-900 text-sm leading-snug truncate">
                        {item.name}
                    </h4>
                </div>

                {/* Right: Status & Actions */}
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
                <h2 className="text-lg font-bold text-neutral-900">Positions</h2>

                {/* Desktop Button */}
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                >
                    Add Position
                </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <SortableTable
                    data={positions}
                    columns={columns}
                    isLoading={isLoading}
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : positions.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No positions found</div>
                ) : (
                    positions.map(pos => (
                        <MobileCard key={pos.id} item={pos} />
                    ))
                )}
            </div>

            {/* Add/Edit Modal (Glassy) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50">
                            <h3 className="font-bold text-lg text-neutral-900">{editingPosition ? 'Edit Position' : 'Add Position'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Position Code</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all uppercase font-mono"
                                    placeholder="AR"
                                    value={formData.code || ""}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                    maxLength={2}
                                />
                                <p className="text-xs text-neutral-500">2-letter code (e.g. AR, WD)</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Name</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Architect"
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Department</label>
                                <select
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                    value={formData.department_id || ""}
                                    onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select Department</option>
                                    {departments.map(dept => {
                                        const abbr = dept.code.split('-')[1] || dept.code;
                                        return (
                                            <option key={dept.id} value={dept.id}>{dept.name} ({abbr})</option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Category Code (1-9)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="9"
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-mono"
                                    value={formData.category_code ?? 1}
                                    onChange={e => setFormData({ ...formData, category_code: parseInt(e.target.value) || 1 })}
                                    required
                                />
                                <p className="text-[10px] text-neutral-500">Used for System ID (Digit 3)</p>
                            </div>

                            {/* Status Selector */}
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
                                <Button type="button" variant="secondary" className="bg-white/50 hover:bg-white border-transparent shadow-sm backdrop-blur-md" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button
                                    type="submit"
                                    loading={isSaving}
                                    disabled={isSaving}
                                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 border-transparent min-w-[160px] relative overflow-hidden"
                                >
                                    <span className={isSaving ? "opacity-0" : "opacity-100"}>
                                        {editingPosition ? "Update Position" : "Save Changes"}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Glassy Danger) */}
            {isDeleteModalOpen && posToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-red-500/20">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900">Delete Position?</h3>
                                <p className="text-sm text-neutral-600 mt-2">
                                    Are you sure you want to delete <span className="font-bold text-neutral-900">{posToDelete.code}</span>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                                <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmDelete}>Delete</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
