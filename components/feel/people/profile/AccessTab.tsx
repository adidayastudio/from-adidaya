"use client";

import { useState, useEffect } from "react";
import { Person } from "../types";
import { Shield, Lock, Fingerprint, Loader2, Save } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { fetchSystemRoles, fetchRolePermissions } from "@/lib/api/organization";
import { updateUserRole } from "@/lib/api/people";
import { OrganizationSystemRole, OrganizationRolePermission } from "@/lib/types/organization";
import useUserProfile from "@/hooks/useUserProfile";
import RoleAccessPreview from "./RoleAccessPreview";
import { toast } from "react-hot-toast";

export default function AccessTab({ person, isMe }: { person: Person, isMe: boolean }) {
    const { profile: currentUser } = useUserProfile();
    const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

    const [roles, setRoles] = useState<OrganizationSystemRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationRolePermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // The role currently assigned to the person (database state)
    const [currentRoleCode, setCurrentRoleCode] = useState<string>(person.role);
    // The role selected in the dropdown for preview/assignment (UI state)
    const [selectedRoleCode, setSelectedRoleCode] = useState<string>(person.role);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [roleData, permData] = await Promise.all([
                fetchSystemRoles(),
                fetchRolePermissions()
            ]);
            setRoles(roleData);
            setPermissions(permData);

            // Normalize selected role code to match role definitions if possible
            const matchingRole = roleData.find(r => r.code.toLowerCase() === person.role.toLowerCase());
            if (matchingRole) {
                setCurrentRoleCode(matchingRole.code);
                setSelectedRoleCode(matchingRole.code);
            }
        } catch (error) {
            console.error("Error loading access data:", error);
            toast.error("Failed to load access configuration");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRoleCode(e.target.value);
    };

    const handleSave = async () => {
        if (!isAdmin) return;

        setIsSaving(true);
        try {
            const success = await updateUserRole(person.id, selectedRoleCode);
            if (success) {
                setCurrentRoleCode(selectedRoleCode);
                toast.success("System role updated successfully");
            } else {
                toast.error("Failed to update system role");
            }
        } catch (error) {
            console.error("Error saving role:", error);
            toast.error("An error occurred while saving");
        } finally {
            setIsSaving(false);
        }
    };

    const currentSelectedRole = roles.find(r => r.code === selectedRoleCode);
    const currentPerm = permissions.find(p => p.role_id === currentSelectedRole?.id);
    const hasChanges = selectedRoleCode.toLowerCase() !== currentRoleCode.toLowerCase();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* LEFT SIDE: Role Selection */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">System Role</h3>
                            <p className="text-xs text-neutral-500">Determines base permissions</p>
                        </div>
                    </div>

                    <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Assignment</label>
                            {isAdmin ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select
                                            value={selectedRoleCode}
                                            onChange={handleRoleChange}
                                            className="w-full h-11 bg-white border border-purple-200 rounded-xl px-4 text-sm font-bold text-purple-900 outline-none focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 appearance-none transition-all shadow-sm"
                                            disabled={isLoading || isSaving}
                                        >
                                            {roles.map(role => (
                                                <option key={role.id} value={role.code}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {hasChanges && (
                                        <Button
                                            variant="primary"
                                            className="w-full bg-purple-600 border-purple-600 hover:bg-purple-700 h-11 rounded-xl shadow-lg shadow-purple-100 font-bold transition-all active:scale-[0.98]"
                                            onClick={handleSave}
                                            loading={isSaving}
                                            icon={!isSaving ? <Save className="w-4 h-4 shrink-0" /> : undefined}
                                        >
                                            {isSaving ? "Saving..." : "Save Assignment"}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="h-11 flex items-center px-4 bg-white border border-purple-100 rounded-xl text-sm font-bold text-purple-900">
                                    {currentSelectedRole?.name || person.role}
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <p className="text-[10px] text-purple-600/70 italic leading-relaxed">
                                {isAdmin
                                    ? "Select a role to preview its effective access profile on the right. Changes are only applied after clicking Save."
                                    : "Your system role is managed by administrators. It defines the maximum data visibility and authority level."
                                }
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* RIGHT SIDE: Effective Access Preview */}
            <div className="lg:col-span-8">
                <RoleAccessPreview
                    role={currentSelectedRole!}
                    permission={currentPerm || null}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
