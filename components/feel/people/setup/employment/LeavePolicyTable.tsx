"use client";

import { useEffect, useState } from "react";
import { PortalTooltip } from "../components/PortalTooltip";



import { LeavePolicy } from "@/lib/types/organization";
import { fetchLeavePolicies, upsertLeavePolicy, deleteLeavePolicy } from "@/lib/api/employment";
import { SortableTable, Column } from "../components/SortableTable";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Pencil, Trash2, Plus, AlertTriangle, X, Heart, Plane, AlertCircle, Info } from "lucide-react";

export default function LeavePolicyTable() {
    const [policies, setPolicies] = useState<LeavePolicy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
    const [policyToDelete, setPolicyToDelete] = useState<LeavePolicy | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<LeavePolicy>>({
        name: "",
        annual_leave_quota: 12,
        sick_leave_quota: 0,
        permission_quota: 0,
        accrual_type: "Per Year",
        carry_over_allowed: false,
        max_carry_over_days: 0,
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
        const data = await fetchLeavePolicies();
        setPolicies(data);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingPolicy(null);
        setFormData({
            name: "",
            annual_leave_quota: 12,
            sick_leave_quota: 0,
            permission_quota: 0,
            accrual_type: "Per Year",
            carry_over_allowed: false,
            max_carry_over_days: 0,
            status: "Active"
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item: LeavePolicy) => {
        setEditingPolicy(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: LeavePolicy) => {
        setPolicyToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!policyToDelete) return;
        await deleteLeavePolicy(policyToDelete.id);
        setIsDeleteModalOpen(false);
        setPolicyToDelete(null);
        loadData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            const payload = { ...formData };
            if (editingPolicy) {
                payload.id = editingPolicy.id;
            }

            const result = await upsertLeavePolicy(payload);
            if (result) {
                setIsModalOpen(false);
                loadData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const columns: Column<LeavePolicy>[] = [
        {
            key: "name",
            header: "Policy Name",
            sortable: true,
            render: (item) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900">{item.name}</span>
                        {item.description && (
                            <PortalTooltip content={item.description}>
                                <AlertCircle className="w-3.5 h-3.5 text-neutral-400" />
                            </PortalTooltip>
                        )}
                    </div>
                    <span className="text-xs text-neutral-500">{item.accrual_type}</span>
                </div>
            )
        },
        {
            key: "annual_leave_quota",
            header: "Annual",
            render: (item) => (
                <div className="flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-semibold text-neutral-700">{item.annual_leave_quota} days</span>
                </div>
            )
        },
        {
            key: "sick_leave_quota",
            header: "Sick",
            render: (item) => (
                <div className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-semibold text-neutral-700">
                        {item.sick_leave_quota > 300 ? 'Unlimited' : `${item.sick_leave_quota} days`}
                    </span>
                </div>
            )
        },
        {
            key: "carry_over_allowed",
            header: "Carry Over",
            render: (item) => (
                <span className={`text-xs ${item.carry_over_allowed ? 'text-green-600' : 'text-neutral-400'}`}>
                    {item.carry_over_allowed ? `Allowed (Max ${item.max_carry_over_days})` : 'Not Allowed'}
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

    const MobileCard = ({ item }: { item: LeavePolicy }) => (
        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-neutral-900 text-sm truncate">{item.name}</h4>
                    {item.description && (
                        <PortalTooltip content={item.description}>
                            <div className="p-1 h-5 w-5 hover:bg-neutral-100 bg-neutral-50 rounded-full flex items-center justify-center transition-colors">
                                <Info className="w-3 h-3 text-neutral-400" />
                            </div>
                        </PortalTooltip>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-600">
                    <div className="flex items-center gap-1">
                        <Plane className="w-3.5 h-3.5 text-blue-500" />
                        <span>{item.annual_leave_quota}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-500" />
                        <span>{item.sick_leave_quota}</span>
                    </div>
                    <span className="text-neutral-400">| {item.accrual_type}</span>
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

    const accrualOptions = [
        { label: "Per Year (Reset Annually)", value: "Per Year" },
        { label: "Monthly Accrual", value: "Monthly" },
        { label: "Pro-rated (Year-based)", value: "Pro-rated (Year-based)" },
        { label: "Pro-rated (Quadratic)", value: "Pro-rated (Quadratic)" },
        { label: "None (Manual / Unlimited)", value: "None" }
    ];

    // CSS snippet to hide spinners
    const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Leave Policies</h2>
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                >
                    Add Policy
                </Button>
            </div>

            <div className="hidden md:block">
                <SortableTable
                    data={policies}
                    columns={columns}
                    isLoading={isLoading}
                />
            </div>

            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : policies.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No policies found</div>
                ) : (
                    policies.map(s => <MobileCard key={s.id} item={s} />)
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-black/5 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl shrink-0">
                            <h3 className="font-bold text-lg text-neutral-900">{editingPolicy ? 'Edit Policy' : 'Add Policy'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Policy Name</label>
                                    <input
                                        className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                        placeholder="e.g. Full Time, Contract..."
                                        value={formData.name || ""}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Description / Rules</label>
                                    <textarea
                                        className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none min-h-[80px]"
                                        placeholder="e.g. Missed working day must be replaced..."
                                        value={formData.description || ""}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-neutral-700">Annual Quota</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className={`w-full pl-3 pr-10 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none disabled:bg-neutral-100 disabled:text-neutral-400 ${noSpinnerClass}`}
                                                value={formData.annual_leave_quota}
                                                onChange={e => setFormData({ ...formData, annual_leave_quota: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                                disabled={formData.accrual_type?.includes('Quadratic')}
                                            />
                                            <span className="absolute right-3 top-2.5 text-sm text-neutral-500 pointer-events-none">days</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-neutral-700">Sick Quota</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className={`w-full pl-3 pr-10 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none ${noSpinnerClass}`}
                                                value={formData.sick_leave_quota}
                                                onChange={e => setFormData({ ...formData, sick_leave_quota: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                            />
                                            <span className="absolute right-3 top-2.5 text-sm text-neutral-500 pointer-events-none">days</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Permission Quota</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className={`w-full pl-3 pr-10 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none ${noSpinnerClass}`}
                                            value={formData.permission_quota}
                                            onChange={e => setFormData({ ...formData, permission_quota: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                        />
                                        <span className="absolute right-3 top-2.5 text-sm text-neutral-500 pointer-events-none">days</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-neutral-700">Allocation Method</label>
                                    <Select
                                        variant="filled"
                                        options={accrualOptions}
                                        value={formData.accrual_type}
                                        onChange={(val) => setFormData({ ...formData, accrual_type: val as any })}
                                        placeholder="Select Method"
                                        accentColor="blue"
                                    />
                                    {formData.accrual_type?.includes('Quadratic') && (
                                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                                            Auto-calculated based on service length (x²/12).
                                        </p>
                                    )}
                                </div>

                                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                                            checked={formData.carry_over_allowed}
                                            onChange={e => setFormData({ ...formData, carry_over_allowed: e.target.checked })}
                                        />
                                        <label className="text-sm font-medium text-neutral-700">Allow Carry Over</label>
                                    </div>

                                    {formData.carry_over_allowed && (
                                        <div className="relative w-32">
                                            <input
                                                type="number"
                                                className={`w-full pl-3 pr-10 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none ${noSpinnerClass}`}
                                                value={formData.max_carry_over_days}
                                                onChange={e => setFormData({ ...formData, max_carry_over_days: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-neutral-500 pointer-events-none">max</span>
                                        </div>
                                    )}
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

                                <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white/50 backdrop-blur-sm -mx-6 -mb-6 p-6 border-t border-neutral-100">
                                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button
                                        type="submit"
                                        loading={isSaving}
                                        disabled={isSaving}
                                        className="bg-blue-600 text-white min-w-[140px]"
                                    >
                                        {editingPolicy ? "Update" : "Save"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && policyToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Archive Policy?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to archive <span className="font-bold">{policyToDelete.name}</span>?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmDelete}>Archive</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
