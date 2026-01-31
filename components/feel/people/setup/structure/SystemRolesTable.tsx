"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    ShieldCheck,
    Loader2,
    X,
    AlertCircle
} from 'lucide-react';
import {
    fetchSystemRoles,
    upsertSystemRole,
    deleteSystemRole,
    updateSystemRoleOrder
} from '@/lib/api/organization';
import { OrganizationSystemRole } from '@/lib/types/organization';
import { SortableTable } from '../components/SortableTable';
import { Button } from '@/shared/ui/primitives/button/button';

export default function SystemRolesTable() {
    const [roles, setRoles] = useState<OrganizationSystemRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Partial<OrganizationSystemRole> | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<OrganizationSystemRole | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadRoles();

        // Mobile FAB listener
        const handleFabAction = (e: CustomEvent) => {
            if (e.detail?.id === 'STRUCTURE_ADD') {
                handleAdd();
            }
        };

        window.addEventListener('fab-action', handleFabAction as EventListener);
        return () => window.removeEventListener('fab-action', handleFabAction as EventListener);
    }, [roles.length]); // Dependencies to ensure roles.length is accessible in handleAdd

    const loadRoles = async () => {
        setIsLoading(true);
        const data = await fetchSystemRoles();
        setRoles(data);
        setIsLoading(false);
    };

    const handleAdd = () => {
        setEditingRole({
            status: 'Active',
            order_index: roles.length > 0 ? Math.max(...roles.map(r => r.order_index)) + 1 : 1
        });
        setIsModalOpen(true);
    };

    const handleEdit = (role: OrganizationSystemRole) => {
        setEditingRole({ ...role });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (role: OrganizationSystemRole) => {
        setRoleToDelete(role);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;
        const success = await deleteSystemRole(roleToDelete.id);
        if (success) {
            setRoles(roles.filter(r => r.id !== roleToDelete.id));
            setIsDeleteModalOpen(false);
            setRoleToDelete(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole?.code || !editingRole?.name) return;

        setIsSaving(true);
        const savedRole = await upsertSystemRole(editingRole);
        if (savedRole) {
            if (editingRole.id) {
                setRoles(roles.map(r => r.id === savedRole.id ? savedRole : r));
            } else {
                setRoles([...roles, savedRole]);
            }
            setIsModalOpen(false);
            setEditingRole(null);
        }
        setIsSaving(false);
    };

    const handleReorder = async (newItems: OrganizationSystemRole[]) => {
        const itemsWithIndex = newItems.map((item, index) => ({
            ...item,
            order_index: index + 1
        }));
        setRoles(itemsWithIndex);
        await updateSystemRoleOrder(itemsWithIndex);
    };

    const columns = [
        {
            header: "Code",
            key: "code" as keyof OrganizationSystemRole,
            render: (role: OrganizationSystemRole) => (
                <span className="font-mono font-bold text-neutral-400 text-xs tracking-wider uppercase">
                    {role.code}
                </span>
            )
        },
        {
            header: "Role Name",
            key: "name" as keyof OrganizationSystemRole,
            render: (role: OrganizationSystemRole) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold text-neutral-900">{role.name}</span>
                </div>
            )
        },
        {
            header: "Description",
            key: "description" as keyof OrganizationSystemRole,
            render: (role: OrganizationSystemRole) => (
                <span className="text-neutral-500 text-sm line-clamp-1 max-w-[300px]">
                    {role.description || '-'}
                </span>
            )
        },
        {
            header: "Status",
            key: "status" as keyof OrganizationSystemRole,
            render: (role: OrganizationSystemRole) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${role.status === 'Active'
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                    }`}>
                    {role.status}
                </span>
            )
        },
        {
            header: "Actions",
            key: "id" as keyof OrganizationSystemRole,
            render: (role: OrganizationSystemRole) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="text"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(role); }}
                        className="h-8 w-8 p-0 rounded-full hover:bg-neutral-100"
                    >
                        <Pencil className="w-4 h-4 text-neutral-400 hover:text-blue-600" />
                    </Button>
                    <Button
                        variant="text"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(role); }}
                        className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    const MobileCard = ({ role }: { role: OrganizationSystemRole }) => (
        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex items-center gap-5">
            {/* Left: Icon Circle */}
            <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-neutral-700" />
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono font-bold text-neutral-400 mb-0.5 tracking-wider uppercase truncate">
                    {role.code}
                </div>
                <h4 className="font-semibold text-neutral-900 text-sm leading-snug truncate">
                    {role.name}
                </h4>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${role.status === 'Active'
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}>
                    {role.status}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="text"
                        size="sm"
                        iconOnly={<Pencil className="w-4 h-4 text-blue-600" />}
                        className="!p-1.5 h-8 w-8 hover:bg-blue-50 bg-blue-50/50 rounded-full"
                        onClick={() => handleEdit(role)}
                    />
                    <Button
                        variant="text"
                        size="sm"
                        iconOnly={<Trash2 className="w-4 h-4 text-red-600" />}
                        className="!p-1.5 h-8 w-8 hover:bg-red-50 bg-red-50/50 rounded-full"
                        onClick={() => handleDeleteClick(role)}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">System Roles</h2>
                <Button
                    className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 !rounded-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAdd}
                >
                    Add Role
                </Button>
            </div>

            <div className="hidden md:block">
                <SortableTable<OrganizationSystemRole>
                    data={roles}
                    columns={columns}
                    isLoading={isLoading}
                    onReorder={handleReorder}
                />
            </div>

            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading...</div>
                ) : roles.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No roles found</div>
                ) : (
                    roles.map(role => (
                        <MobileCard key={role.id} role={role} />
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-black/5">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50">
                            <h3 className="font-bold text-lg text-neutral-900">{editingRole?.id ? 'Edit Role' : 'Add Role'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Role Code (e.g. SUPERADMIN)</label>
                                <input
                                    required
                                    placeholder="e.g. SUPERADMIN"
                                    value={editingRole?.code || ''}
                                    onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Role Name</label>
                                <input
                                    required
                                    placeholder="e.g. Superadmin"
                                    value={editingRole?.name || ''}
                                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Description</label>
                                <textarea
                                    placeholder="Briefly describe this role..."
                                    value={editingRole?.description || ''}
                                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                                    className="w-full min-h-[100px] px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-neutral-700">Status</label>
                                <div className="flex bg-neutral-100 p-1 rounded-xl">
                                    {['Active', 'Inactive'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setEditingRole({ ...editingRole, status: status as any })}
                                            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${editingRole?.status === status
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
                                    {editingRole?.id ? "Update Role" : "Save Role"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Delete Role?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to delete <span className="font-bold text-neutral-900">"{roleToDelete?.name}"</span>?
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
