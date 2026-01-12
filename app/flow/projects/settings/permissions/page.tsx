"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, Plus, Shield, Users, Eye, Pencil, Trash2, Check } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// Mock roles data
const ROLES = [
    {
        id: "owner",
        name: "Owner",
        description: "Full access to all features",
        permissions: ["create", "read", "update", "delete", "manage"],
        color: "bg-red-500",
    },
    {
        id: "admin",
        name: "Admin",
        description: "Manage projects and team members",
        permissions: ["create", "read", "update", "delete"],
        color: "bg-orange-500",
    },
    {
        id: "manager",
        name: "Project Manager",
        description: "Manage assigned projects",
        permissions: ["create", "read", "update"],
        color: "bg-blue-500",
    },
    {
        id: "member",
        name: "Team Member",
        description: "View and update tasks",
        permissions: ["read", "update"],
        color: "bg-green-500",
    },
    {
        id: "viewer",
        name: "Viewer",
        description: "View-only access",
        permissions: ["read"],
        color: "bg-neutral-500",
    },
];

const PERMISSION_LABELS: Record<string, string> = {
    create: "Create",
    read: "View",
    update: "Edit",
    delete: "Delete",
    manage: "Manage",
};

function RoleCard({ role }: { role: typeof ROLES[0] }) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-red-200 transition-all group">
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center text-white`}>
                    <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900">{role.name}</h3>
                    <p className="text-sm text-neutral-500 mt-0.5">{role.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {role.permissions.map((perm) => (
                            <span key={perm} className="px-2 py-0.5 bg-neutral-100 rounded text-xs text-neutral-600">
                                {PERMISSION_LABELS[perm]}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500">
                        <Pencil className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPermissionsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Permissions" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/flow/projects/settings">
                                <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Permissions</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure role-based access control.</p>
                            </div>
                        </div>
                        <Button icon={<Plus className="w-4 h-4" />} className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white">
                            Add Role
                        </Button>
                    </div>

                    {/* Role Cards */}
                    <div className="grid gap-4">
                        {ROLES.map((role) => (
                            <RoleCard key={role.id} role={role} />
                        ))}
                    </div>

                    {/* Info Note */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                        <strong>Note:</strong> Permissions apply to all projects in this workspace. Per-project permissions can be set in project settings.
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
