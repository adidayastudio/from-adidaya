"use client";

import { useEffect, useState } from "react";
import { SkillCategory } from "./skills-types";
import { Edit, Archive, Plus, AlertTriangle, Trash2, ChevronDown, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import CategoryFormModal from "./CategoryFormModal";

export default function SkillCategoriesTable({ isLocked }: { isLocked?: boolean }) {
    const supabase = createClient();
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<SkillCategory | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");

    // Archive Modal
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [categoryToArchive, setCategoryToArchive] = useState<SkillCategory | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("skill_categories")
                .select("*, skill_library(count)")
                .order("name");

            if (error) throw error;

            const mapped = data.map((d: any) => ({
                ...d,
                skill_count: d.skill_library?.[0]?.count || 0
            }));
            setCategories(mapped);
        } catch (err: any) {
            console.error("Failed to load categories:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (cat: SkillCategory) => {
        setEditingCategory(cat);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingCategory(undefined);
        setIsModalOpen(true);
    };

    const handleArchiveClick = (cat: SkillCategory) => {
        setCategoryToArchive(cat);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = async () => {
        if (!categoryToArchive) return;

        try {
            const { error } = await supabase
                .from("skill_categories")
                .update({ status: 'archived' })
                .eq("id", categoryToArchive.id);

            if (error) throw error;
            loadData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to archive");
        } finally {
            setIsArchiveModalOpen(false);
        }
    };

    // Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<SkillCategory | null>(null);

    const handleDeleteClick = (cat: SkillCategory) => {
        setCategoryToDelete(cat);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            const { error } = await supabase
                .from("skill_categories")
                .delete()
                .eq("id", categoryToDelete.id);

            if (error) throw error;
            loadData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to delete category. Ensure no skills are linked to it.");
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    // View Skills Modal
    const [viewingCategoryForSkills, setViewingCategoryForSkills] = useState<SkillCategory | null>(null);
    const [categorySkills, setCategorySkills] = useState<any[]>([]);
    const [isLoadingSkills, setIsLoadingSkills] = useState(false);

    const handleViewSkills = async (cat: SkillCategory) => {
        setViewingCategoryForSkills(cat);
        setIsLoadingSkills(true);
        const { data, error } = await supabase
            .from("skill_library")
            .select("name, status")
            .eq("category_id", cat.id)
            .order("name");

        if (!error && data) {
            setCategorySkills(data);
        }
        setIsLoadingSkills(false);
    };

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCategories = [...filteredCategories].sort((a, b) => {
        if (!sortConfig) return 0;

        const { key, direction } = sortConfig;

        let aValue: any = a[key as keyof SkillCategory];
        let bValue: any = b[key as keyof SkillCategory];

        // Handle skill_count which is manually added
        if (key === 'skill_count') {
            aValue = (a as any).skill_count || 0;
            bValue = (b as any).skill_count || 0;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ChevronDown className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
        return sortConfig.direction === 'asc'
            ? <ChevronDown className="w-4 h-4 text-blue-600 ml-1" />
            : <ChevronDown className="w-4 h-4 text-blue-600 rotate-180 ml-1" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search categories..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleAdd} icon={<Plus className="w-4 h-4" />} disabled={isLocked}>
                    Add Category
                </Button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:bg-neutral-100 group transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    Category Name <SortIcon column="name" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:bg-neutral-100 group transition-colors"
                                onClick={() => handleSort('description')}
                            >
                                <div className="flex items-center">
                                    Description <SortIcon column="description" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:bg-neutral-100 group transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center">
                                    Status <SortIcon column="status" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none text-right cursor-pointer hover:bg-neutral-100 group transition-colors"
                                onClick={() => handleSort('skill_count')}
                            >
                                <div className="flex items-center justify-end">
                                    Skills <SortIcon column="skill_count" />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Loading...</td></tr>
                        ) : sortedCategories.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No categories found</td></tr>
                        ) : (
                            sortedCategories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-neutral-900">{cat.name}</td>
                                    <td className="px-4 py-3 text-neutral-500 max-w-xs truncate" title={cat.description || ""}>{cat.description}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.status === "active"
                                            ? "bg-green-50 text-green-700 border border-green-100"
                                            : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                            }`}>
                                            {cat.status === "active" ? "Active" : "Archived"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleViewSkills(cat)}
                                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded"
                                        >
                                            {cat.skill_count}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(cat)}
                                                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                                title="Edit"
                                                disabled={isLocked}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchiveClick(cat)}
                                                className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                                                title="Archive"
                                                disabled={isLocked || cat.status === 'archived'}
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(cat)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                title="Delete"
                                                disabled={isLocked}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                category={editingCategory}
                isLocked={isLocked}
            />

            {/* Archive Confirmation (Manual Modal) */}
            {isArchiveModalOpen && categoryToArchive && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Archive Category?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to archive <strong>{categoryToArchive.name}</strong>?
                                <br />
                                Archiving will hide it from active selections.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmArchive}>Archive</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {isDeleteModalOpen && categoryToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Delete Category?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to permanently delete <strong>{categoryToDelete.name}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmDelete}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Skills Modal */}
            {viewingCategoryForSkills && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-black/5 flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl shrink-0">
                            <h3 className="font-bold text-lg text-neutral-900">{viewingCategoryForSkills.name} - Skills</h3>
                            <button onClick={() => setViewingCategoryForSkills(null)} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                                {/* Close Icon (X) needs to be imported or inline */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2">
                            {isLoadingSkills ? (
                                <div className="p-6 text-center text-neutral-500">Loading skills...</div>
                            ) : categorySkills.length === 0 ? (
                                <div className="p-6 text-center text-neutral-500">No skills found in this category.</div>
                            ) : (
                                <ul className="divide-y divide-neutral-100">
                                    {categorySkills.map((skill, idx) => (
                                        <li key={idx} className="px-4 py-3 flex justify-between items-center hover:bg-neutral-50 rounded-lg">
                                            <span className="font-medium text-neutral-700">{skill.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${skill.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                                                {skill.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
