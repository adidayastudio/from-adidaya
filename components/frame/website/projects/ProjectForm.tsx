"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
    Project,
    ProjectCategory,
    PROJECT_CATEGORIES,
    PROJECT_SUBCATEGORIES,
    ProjectPhase,
    PROJECT_PHASES,
    TeamMember,
    GalleryItem
} from "./types";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Upload, X, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import clsx from "clsx";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
    ssr: false,
});

type Props = {
    initialData?: Project;
    onSave: (project: Project) => void;
    onCancel: () => void;
};

const slugify = (str: string) => str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export default function ProjectForm({ initialData, onSave, onCancel }: Props) {
    const [formData, setFormData] = useState<Partial<Project>>({
        name: "",
        slug: "",
        categories: [],
        subcategories: [],
        phase: "Conceptual",
        yearStart: new Date().getFullYear(),
        yearEnd: undefined,
        isOngoing: false,
        city: "",
        country: "",
        isConfidential: false,
        image: "",
        gallery: [],
        description: "",
        teamMembers: [],
        author: "",
        isFeatured: false,
        orderIndex: 0,
        ...initialData
    });

    const [slugEdited, setSlugEdited] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageModalType, setImageModalType] = useState<"hero" | "gallery">("hero");

    useEffect(() => {
        if (!slugEdited && formData.name) {
            setFormData(prev => ({ ...prev, slug: slugify(prev.name || "") }));
        }
    }, [formData.name, slugEdited]);

    const handleChange = (field: keyof Project, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleCategory = (cat: ProjectCategory) => {
        setFormData(prev => {
            const cats = prev.categories || [];
            if (cats.includes(cat)) return { ...prev, categories: cats.filter(c => c !== cat) };
            return { ...prev, categories: [...cats, cat] };
        });
    };

    const toggleSubcategory = (sub: string) => {
        setFormData(prev => {
            const subs = prev.subcategories || [];
            if (subs.includes(sub)) return { ...prev, subcategories: subs.filter(s => s !== sub) };
            return { ...prev, subcategories: [...subs, sub] };
        });
    };

    const addTeamMember = () => {
        setFormData(prev => ({
            ...prev,
            teamMembers: [...(prev.teamMembers || []), { name: "", role: "" }]
        }));
    };

    const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
        setFormData(prev => {
            const updated = [...(prev.teamMembers || [])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, teamMembers: updated };
        });
    };

    const removeTeamMember = (index: number) => {
        setFormData(prev => ({
            ...prev,
            teamMembers: (prev.teamMembers || []).filter((_, i) => i !== index)
        }));
    };

    const openImageModal = (type: "hero" | "gallery") => {
        setImageModalType(type);
        setShowImageModal(true);
    };

    const handleImageSubmit = (url: string) => {
        if (imageModalType === "hero") {
            handleChange("image", url);
        } else {
            const newImage: GalleryItem = {
                id: Math.random().toString(),
                url,
                caption: "",
                orientation: "landscape"
            };
            setFormData(prev => ({
                ...prev,
                gallery: [...(prev.gallery || []), newImage]
            }));
        }
        setShowImageModal(false);
    };

    const removeGalleryItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            gallery: (prev.gallery || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Project);
    };

    // Dropdown options
    const phaseOptions = PROJECT_PHASES.map(p => ({ value: p, label: p }));
    const yearOptions = Array.from({ length: 50 }, (_, i) => {
        const year = new Date().getFullYear() - i + 5;
        return { value: year.toString(), label: year.toString() };
    });

    return (
        <>
            <div className="min-h-screen bg-white">
                <div className="max-w-5xl mx-auto space-y-6 pb-20">
                    {/* HEADER */}
                    <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
                        <button
                            onClick={onCancel}
                            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium text-sm">Back to Projects</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                icon={<Save className="w-3.5 h-3.5" />}
                                onClick={handleSubmit}
                            >
                                Save Project
                            </Button>
                        </div>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-10">

                        {/* HERO IMAGE */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                Hero Image
                            </label>
                            {formData.image ? (
                                <div className="relative group aspect-[21/9] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                                    <img src={formData.image} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => openImageModal("hero")}
                                            className="px-4 py-2 bg-white text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-100 shadow-lg"
                                        >
                                            Change Image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange("image", "")}
                                            className="px-4 py-2 bg-white/90 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 shadow-lg"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openImageModal("hero")}
                                    className="w-full aspect-[21/9] border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 hover:bg-neutral-50/50 transition-colors"
                                >
                                    <ImageIcon className="w-12 h-12 mb-3" />
                                    <span className="text-sm font-medium">Upload Hero Image</span>
                                    <span className="text-xs text-neutral-400 mt-1">or paste image URL</span>
                                </button>
                            )}
                        </div>

                        {/* TITLE & SLUG */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Project Name"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Villa Ubud Serenity"
                                inputSize="md"
                                helperText="* Required"
                            />

                            <Input
                                label="Slug"
                                value={formData.slug}
                                onChange={(e) => {
                                    handleChange("slug", e.target.value);
                                    setSlugEdited(true);
                                }}
                                placeholder="villa-ubud-serenity"
                                inputSize="md"
                                helperText="Auto-generated from name"
                                className="font-mono"
                            />
                        </div>

                        {/* STATUS, LOCATION, YEAR */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.phase || ""}
                                    options={phaseOptions}
                                    onChange={(value) => handleChange("phase", value)}
                                    selectSize="md"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                                    Location <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    <input
                                        value={formData.city}
                                        onChange={(e) => handleChange("city", e.target.value)}
                                        placeholder="Bandung"
                                        className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    />
                                    <input
                                        value={formData.country}
                                        onChange={(e) => handleChange("country", e.target.value)}
                                        placeholder="Indonesia"
                                        className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    />
                                    <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isConfidential}
                                            onChange={(e) => handleChange("isConfidential", e.target.checked)}
                                            className="rounded border-neutral-300 text-brand-red focus:ring-brand-red"
                                        />
                                        Private location
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                                    Year <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={formData.yearStart?.toString() || ""}
                                            options={yearOptions}
                                            onChange={(value) => handleChange("yearStart", parseInt(value))}
                                            selectSize="md"
                                            className="flex-1"
                                        />
                                        <span className="text-neutral-400 text-sm">—</span>
                                        <Select
                                            value={formData.isOngoing ? "" : (formData.yearEnd?.toString() || "")}
                                            options={[{ value: "", label: formData.isOngoing ? "Now" : "Select" }, ...yearOptions]}
                                            onChange={(value) => {
                                                if (value) {
                                                    handleChange("yearEnd", parseInt(value));
                                                    handleChange("isOngoing", false);
                                                }
                                            }}
                                            selectSize="md"
                                            className="flex-1"
                                            disabled={formData.isOngoing}
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isOngoing}
                                            onChange={(e) => {
                                                handleChange("isOngoing", e.target.checked);
                                                if (e.target.checked) handleChange("yearEnd", undefined);
                                            }}
                                            className="rounded border-neutral-300 text-brand-red focus:ring-brand-red"
                                        />
                                        On-going
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* CATEGORIES */}
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-3">
                                Categories <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PROJECT_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => toggleCategory(cat)}
                                        className={clsx(
                                            "px-4 py-2 text-sm font-medium rounded-lg transition-all border",
                                            (formData.categories || []).includes(cat)
                                                ? "bg-brand-red text-white border-brand-red hover:bg-red-700"
                                                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SUBCATEGORIES */}
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-3">
                                Subcategories <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PROJECT_SUBCATEGORIES.map((sub) => (
                                    <button
                                        key={sub}
                                        type="button"
                                        onClick={() => toggleSubcategory(sub)}
                                        className={clsx(
                                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all border",
                                            (formData.subcategories || []).includes(sub)
                                                ? "bg-brand-red text-white border-brand-red hover:bg-red-700"
                                                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                                        )}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TEAM MEMBERS */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                Team Members
                            </label>
                            <div className="space-y-3">
                                {(formData.teamMembers || []).map((member, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <GripVertical className="w-4 h-4 text-neutral-300 cursor-move flex-shrink-0" />
                                        <Input
                                            value={member.name}
                                            onChange={(e) => updateTeamMember(i, "name", e.target.value)}
                                            placeholder="Full Name"
                                            inputSize="md"
                                            className="flex-1"
                                        />
                                        <Input
                                            value={member.role}
                                            onChange={(e) => updateTeamMember(i, "role", e.target.value)}
                                            placeholder="Role (e.g. Lead Architect)"
                                            inputSize="md"
                                            className="flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeTeamMember(i)}
                                            className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addTeamMember}
                                    className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Team Member
                                </button>
                            </div>
                        </div>

                        {/* GALLERY */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                Gallery Images
                            </label>
                            {(!formData.gallery || formData.gallery.length === 0) ? (
                                <button
                                    type="button"
                                    onClick={() => openImageModal("gallery")}
                                    className="w-full h-48 border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 hover:bg-neutral-50/50 transition-colors"
                                >
                                    <Upload className="w-10 h-10 mb-3" />
                                    <span className="text-sm font-medium">Upload Gallery Images</span>
                                    <span className="text-xs text-neutral-400 mt-1">or paste image URLs</span>
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        {formData.gallery.map((img, i) => (
                                            <div key={img.id} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeGalleryItem(i)}
                                                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                                >
                                                    <X className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openImageModal("gallery")}
                                        icon={<Plus className="w-3.5 h-3.5" />}
                                    >
                                        Add More Images
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* DESCRIPTION */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                Description
                            </label>
                            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <RichTextEditor
                                    value={formData.description || ""}
                                    onChange={(value) => handleChange("description", value)}
                                />
                            </div>
                        </div>

                        {/* SETTINGS */}
                        <div className="border-t border-neutral-200 pt-8">
                            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                                Settings
                            </h3>
                            <div className="grid grid-cols-3 gap-6">
                                <Input
                                    label="Scheduled Date (Deadline)"
                                    type="date"
                                    value={formData.scheduledDate || ""}
                                    onChange={(e) => handleChange("scheduledDate", e.target.value)}
                                    inputSize="md"
                                    helperText="Target publish date"
                                />

                                <Input
                                    label="Display Order"
                                    type="number"
                                    value={formData.orderIndex?.toString()}
                                    onChange={(e) => handleChange("orderIndex", parseInt(e.target.value) || 0)}
                                    inputSize="md"
                                    placeholder="0"
                                    helperText="Lower numbers appear first"
                                />

                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 block">
                                        Options
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFeatured}
                                            onChange={(e) => handleChange("isFeatured", e.target.checked)}
                                            className="rounded border-neutral-300 text-brand-red focus:ring-brand-red"
                                        />
                                        <span>Featured project</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            {/* IMAGE UPLOAD MODAL */}
            {showImageModal && (
                <ImageUploadModal
                    onSubmit={handleImageSubmit}
                    onClose={() => setShowImageModal(false)}
                    title={imageModalType === "hero" ? "Add Hero Image" : "Add Gallery Image"}
                />
            )}
        </>
    );
}

// IMAGE UPLOAD MODAL
function ImageUploadModal({ onSubmit, onClose, title }: { onSubmit: (url: string) => void; onClose: () => void; title: string }) {
    const [url, setUrl] = useState("");
    const [method, setMethod] = useState<"url" | "upload">("url");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onSubmit(url.trim());
            setUrl("");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setMethod("url")}
                        className={clsx(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                            method === "url"
                                ? "bg-white text-neutral-900 shadow-sm"
                                : "text-neutral-600 hover:text-neutral-900"
                        )}
                    >
                        <LinkIcon className="w-4 h-4 inline mr-2" />
                        Image URL
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod("upload")}
                        className={clsx(
                            "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                            method === "upload"
                                ? "bg-white text-neutral-900 shadow-sm"
                                : "text-neutral-600 hover:text-neutral-900"
                        )}
                    >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload File
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {method === "url" ? (
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
                                Image URL
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                                className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center">
                            <Upload className="w-10 h-10 mx-auto mb-3 text-neutral-400" />
                            <p className="text-sm text-neutral-500 mb-2">Click to upload or drag and drop</p>
                            <p className="text-xs text-neutral-400">PNG, JPG, WEBP up to 10MB</p>
                            <input type="file" className="hidden" accept="image/*" />
                            <p className="text-xs text-neutral-400 mt-4 italic">File upload coming soon - use URL for now</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            className="flex-1"
                            disabled={!url.trim() && method === "url"}
                        >
                            Add Image
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
