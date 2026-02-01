"use client";

import { useEffect, useState } from "react";
import { Plus, Archive as ArchiveIcon, Undo2, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { OrganizationDepartment, EntityStatus } from "@/lib/types/organization";
import {
    fetchDepartments,
    upsertDepartment,
    deleteDepartment,
    updateDepartmentOrder
} from "@/lib/api/organization";
import { SortableTable, Column } from "../components/SortableTable";

export default function DepartmentsTable({ isLocked }: { isLocked?: boolean }) {
    const [departments, setDepartments] = useState<OrganizationDepartment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<OrganizationDepartment | null>(null);
    const [deptToDelete, setDeptToDelete] = useState<OrganizationDepartment | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [codeNum, setCodeNum] = useState("");
    const [codeAlpha, setCodeAlpha] = useState("");

    const [formData, setFormData] = useState<Partial<OrganizationDepartment>>({
        code: "",
        name: "",
        status: "Active" as EntityStatus
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchDepartments();
        setDepartments(data);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingDepartment(null);
        setCodeNum("");
        setCodeAlpha("");
        setFormData({ code: "", name: "", status: "Active" as EntityStatus });
        setIsModalOpen(true);
    };

    const handleEdit = (dept: OrganizationDepartment) => {
        setEditingDepartment(dept);

        const fullCode = (dept.code || "").trim();
        // Regex to split by any non-alphanumeric or transitions
        // Handles "001 AID", "1-AID", "1 AID", "001AID"
        const parts = fullCode.match(/^(\d+)?[- ]?([a-zA-Z]+)?$/);

        let numVal = parts?.[1] || "";
        let alphaVal = parts?.[2] || "";

        // Strip leading zeros
        if (numVal && /^\d+$/.test(numVal)) {
            numVal = parseInt(numVal).toString();
        }

        setCodeNum(numVal.slice(0, 1)); // Enforce 1 digit
        setCodeAlpha(alphaVal.toUpperCase().slice(0, 3)); // Enforce 3 chars

        setFormData({
            ...dept,
            name: dept.name,
            status: dept.status as EntityStatus
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (dept: OrganizationDepartment) => {
        setDeptToDelete(dept);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deptToDelete) return;

        // Use hard delete since user asked for "delete" and "danger zone"
        // Also we have an archive option in edits if needed, but for now specific Delete Request
        await deleteDepartment(deptToDelete.id);
        setIsDeleteModalOpen(false);
        setDeptToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Enforce 1-AID format strictly
        const finalCode = `${codeNum}-${codeAlpha.toUpperCase().trim()}`;

        if (!codeNum || !codeAlpha || !formData.name) {
            console.error("Missing required fields:", { codeNum, codeAlpha, name: formData.name });
            return;
        }

        const payload: any = {
            name: formData.name,
            status: formData.status,
            code: finalCode
        };

        if (editingDepartment) {
            payload.id = editingDepartment.id;
        } else {
            payload.order_index = departments.length + 1;
        }

        console.log("Submitting department payload:", { id: editingDepartment?.id, ...payload });
        setIsSaving(true);
        try {
            const result = await upsertDepartment(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            } else {
                alert("Failed to save department. This is usually caused by a duplicate code or a database restriction. Please check the browser console (Inspect > Console) for the exact error message.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Columns for Desktop Table
    const columns: Column<OrganizationDepartment>[] = [
        {
            key: "code",
            header: "Code",
            width: "140px",
            sortable: true,
            render: (item) => {
                const code = item.code || "";
                const parts = code.split('-');
                const num = parts[0] || (code.match(/\d+/) || [""])[0].replace(/^0+/, '');
                const alpha = parts[1] || (code.match(/[a-zA-Z]+/) || [""])[0];

                return (
                    <div className="flex items-center gap-4">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-600 border border-neutral-200">
                            {num}
                        </span>
                        <span className="font-mono font-bold text-neutral-900 tracking-tight whitespace-nowrap">
                            {alpha}
                        </span>
                    </div>
                );
            }
        },
        {
            key: "name",
            header: "Department Name",
            sortable: true,
            render: (item) => <span className="font-medium text-neutral-900">{item.name}</span>
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

    // Mobile Card Component
    const MobileCard = ({ item }: { item: OrganizationDepartment }) => {
        const code = item.code || "";
        let displayCode = code;

        if (!code.includes('-')) {
            const digits = (code.match(/\d+/) || [""])[0];
            const letters = (code.match(/[a-zA-Z]+/) || [""])[0];
            if (digits && letters) {
                displayCode = `${parseInt(digits)}-${letters.toUpperCase()}`;
            }
        }

        const clusterCode = displayCode.split('-')[0] || displayCode;

        return (
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm transition-all hover:shadow-md flex items-center gap-4">
                {/* Left: Cluster Circle */}
                <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-neutral-700">{clusterCode}</span>
                </div>

                {/* Middle: Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono font-bold text-neutral-400 mb-0.5 tracking-wider uppercase">
                        {displayCode.split('-')[1] || displayCode}
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
                            disabled={isLocked}
                        />
                        <Button
                            variant="text"
                            size="sm"
                            iconOnly={<Trash2 className="w-4 h-4 text-red-600" />}
                            className="!p-1.5 h-8 w-8 hover:bg-red-50 bg-red-50/50 rounded-full"
                            onClick={() => handleDeleteClick(item)}
                            disabled={isLocked}
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
            {/* Header Row - Title & Button inline */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Departments</h2>

                {/* Desktop Button */}
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                    disabled={isLocked}
                >
                    Add Department
                </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <SortableTable
                    data={departments}
                    columns={columns}
                    isLoading={isLoading}
                // Removed onReorder to enable column sorting
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : departments.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No departments found</div>
                ) : (
                    departments.map(dept => (
                        <MobileCard key={dept.id} item={dept} />
                    ))
                )}
            </div>

            {/* Add/Edit Modal (Glassy) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50">
                            <h3 className="font-bold text-lg text-neutral-900">{editingDepartment ? 'Edit Department' : 'Add Department'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Department Code</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-16">
                                        <input
                                            className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-center font-mono"
                                            placeholder="1"
                                            value={codeNum}
                                            onChange={e => setCodeNum(e.target.value.replace(/[^0-9]/g, '').slice(0, 1))}
                                            required
                                        />
                                    </div>
                                    <span className="text-neutral-400 font-bold">-</span>
                                    <div className="flex-1">
                                        <input
                                            className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-mono uppercase"
                                            placeholder="AID"
                                            value={codeAlpha}
                                            onChange={e => setCodeAlpha(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase())}
                                            required
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-neutral-400 mt-1">Example: 1-AID, 2-SMP</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Name</label>
                                <input
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Architecture and Design"
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>



                            {/* Status Selector (Add & Edit) */}
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
                                    disabled={isSaving || isLocked}
                                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 border-transparent min-w-[160px] relative overflow-hidden"
                                >
                                    <span className={isSaving ? "opacity-0" : "opacity-100"}>
                                        {isLocked ? "Governance Locked" : editingDepartment ? "Update Department" : "Save Changes"}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Glassy Danger) */}
            {isDeleteModalOpen && deptToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-red-500/20">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900">Delete Department?</h3>
                                <p className="text-sm text-neutral-600 mt-2">
                                    Are you sure you want to delete <span className="font-bold text-neutral-900">{deptToDelete.code}</span>? This action cannot be undone.
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
