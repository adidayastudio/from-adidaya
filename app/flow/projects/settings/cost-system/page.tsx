"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Search, FileCog, Building2, MoreHorizontal, ArrowLeft, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { fetchCostTemplates, deleteCostTemplate, CostTemplate } from "@/lib/api/cost-system";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

export default function CostSystemPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [templates, setTemplates] = useState<CostTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Click outside handler
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) {
                const data = await fetchCostTemplates(wsId);
                setTemplates(data);
            }
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(null);

        if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
            return;
        }

        const success = await deleteCostTemplate(id);
        if (success) {
            await loadData(); // Reload list
        } else {
            alert("Failed to delete template");
        }
    };

    const handleEdit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/flow/projects/settings/cost-system/${id}`);
    };

    const toggleMenu = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Cost System" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/flow/projects/settings">
                                <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                    Back
                                </Button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                    <FileCog className="w-5 h-5 text-neutral-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-neutral-900">Cost System Templates</h1>
                                    <p className="text-sm text-neutral-500">Manage cost structure rules and calculation methods</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/flow/projects/settings/cost-system/new">
                            <Button
                                icon={<Plus className="w-4 h-4" />}
                                className="bg-brand-red hover:bg-red-700 text-white"
                            >
                                New Template
                            </Button>
                        </Link>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Input
                                iconLeft={<Search size={18} />}
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table / List */}
                    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-visible">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-20">
                                <GlobalLoading />
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
                                <p>No templates found.</p>
                                <Link href="/flow/projects/settings/cost-system/new" className="text-brand-red hover:underline mt-2">
                                    Create your first template
                                </Link>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50 border-b border-neutral-200">
                                        <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Template Name</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Updated</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200">
                                    {filteredTemplates.map((template) => (
                                        <tr
                                            key={template.id}
                                            className="hover:bg-neutral-50 cursor-pointer transition-colors"
                                            onClick={() => router.push(`/flow/projects/settings/cost-system/${template.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${template.type === 'general' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {template.type === 'general' ? <FileCog size={18} /> : <Building2 size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-neutral-900">{template.name}</div>
                                                        {template.typologyId && (
                                                            <div className="text-xs text-neutral-400 mt-0.5">{template.typologyId}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${template.type === 'general' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {template.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500">
                                                {template.description || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500">
                                                {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <button
                                                    className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                                                    onClick={(e) => toggleMenu(template.id, e)}
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeMenuId === template.id && (
                                                    <div
                                                        ref={menuRef}
                                                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-100 z-50 animate-in fade-in zoom-in-95 duration-200"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="py-1">
                                                            <button
                                                                onClick={(e) => handleEdit(template.id, e)}
                                                                className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                                            >
                                                                <Pencil size={14} />
                                                                Edit Template
                                                            </button>

                                                            {template.type === 'general' ? (
                                                                <div className="px-4 py-2 text-xs text-neutral-400 italic flex items-start gap-2 border-t border-neutral-100 bg-neutral-50/50">
                                                                    <AlertTriangle size={12} className="mt-0.5" />
                                                                    General template cannot be deleted
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => handleDelete(template.id, e)}
                                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-neutral-100"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Delete Template
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
