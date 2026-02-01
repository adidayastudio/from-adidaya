"use client";

import { useEffect, useState } from "react";
import { Skill, SkillCategory } from "./skills-types";
import { Edit, Archive, Plus, Search, AlertTriangle, Trash2, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import SkillFormModal from "./SkillFormModal";

export default function SkillLibraryTable({ isLocked }: { isLocked?: boolean }) {
    const supabase = createClient();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | undefined>(undefined);

    // Archive Modal
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [skillToArchive, setSkillToArchive] = useState<Skill | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const { data: catData } = await supabase.from("skill_categories").select("*").order("name");
        if (catData) setCategories(catData as any);

        const { data, error } = await supabase
            .from("skill_library")
            .select(`
                *,
                skill_categories(id, name),
                skill_related_departments(department_name),
                skill_related_positions(position_name)
            `)
            .order("name");

        if (error) {
            console.error("Failed to load skills error details:", JSON.stringify(error, null, 2));
            console.error("Error message:", error.message);
        } else {
            const mapped = data.map((s: any) => ({
                ...s,
                category_name: s.skill_categories?.name,
                related_departments: s.skill_related_departments?.map((d: any) => d.department_name) || [],
                related_positions: s.skill_related_positions?.map((p: any) => p.position_name) || []
            }));
            setSkills(mapped);
        }
        setIsLoading(false);
    };

    const handleEdit = (skill: Skill) => {
        setEditingSkill(skill);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingSkill(undefined);
        setIsModalOpen(true);
    };

    const handleArchiveClick = (skill: Skill) => {
        setSkillToArchive(skill);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = async () => {
        if (!skillToArchive) return;
        try {
            const { error } = await supabase
                .from("skill_library")
                .update({ status: 'archived' })
                .eq("id", skillToArchive.id);

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
    const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);

    const handleDeleteClick = (skill: Skill) => {
        setSkillToDelete(skill);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!skillToDelete) return;
        try {
            const { error } = await supabase
                .from("skill_library")
                .delete()
                .eq("id", skillToDelete.id);

            if (error) throw error;
            loadData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to delete skill");
        } finally {
            setIsDeleteModalOpen(false);
        }
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

    // Filter by search
    const filteredSkills = skills.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply Sorting
    const sortedSkills = [...filteredSkills].sort((a, b) => {
        if (!sortConfig) return 0;

        const { key, direction } = sortConfig;

        let aValue: any = a[key as keyof Skill];
        let bValue: any = b[key as keyof Skill];

        // Handle nested or special cases if any (e.g. category_name is top level prop in our mapped object? Yes)
        if (key === 'category_name') {
            aValue = a.category_name || '';
            bValue = b.category_name || '';
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
                        placeholder="Search skills..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleAdd} icon={<Plus className="w-4 h-4" />} disabled={isLocked}>
                    Add Skill
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
                                    Skill Name <SortIcon column="name" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:bg-neutral-100 group transition-colors"
                                onClick={() => handleSort('category_name')}
                            >
                                <div className="flex items-center">
                                    Category <SortIcon column="category_name" />
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
                            <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap select-none w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Loading...</td></tr>
                        ) : sortedSkills.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-neutral-500">No skills found</td></tr>
                        ) : (
                            sortedSkills.map((skill: any) => (
                                <tr key={skill.id} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-neutral-900">{skill.name}</td>
                                    <td className="px-4 py-3 text-neutral-600">
                                        <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-xs">
                                            {skill.category_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${skill.status === "active" ? "bg-green-50 text-green-700 border border-green-100" :
                                            skill.status === "draft" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                            }`}>
                                            {skill.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(skill)}
                                                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                                title="Edit"
                                                disabled={isLocked}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchiveClick(skill)}
                                                className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                                                title="Archive"
                                                disabled={isLocked || skill.status === 'archived'}
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(skill)}
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
                </table >
            </div >

            <SkillFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                skill={editingSkill}
                categories={categories}
                isLocked={isLocked}
            />

            {/* Archive Confirmation */}
            {
                isArchiveModalOpen && skillToArchive && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900">Archive Skill?</h3>
                                <p className="text-sm text-neutral-600 mt-2">
                                    Are you sure you want to archive <strong>{skillToArchive.name}</strong>?
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
                                <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmArchive}>Archive</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation */}
            {
                isDeleteModalOpen && skillToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900">Delete Skill?</h3>
                                <p className="text-sm text-neutral-600 mt-2">
                                    Are you sure you want to permanently delete <strong>{skillToDelete.name}</strong>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                                <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmDelete}>Delete</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
