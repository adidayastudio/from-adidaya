"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
    Insight,
    InsightCategory,
    INSIGHT_CATEGORIES,
    INSIGHT_TAGS,
    GalleryItem,
    RECOMMENDED_TAGS
} from "./types";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { ArrowLeft, Save, Plus, Trash2, Upload, X, Link as LinkIcon, Image as ImageIcon, Wand2 } from "lucide-react";
import clsx from "clsx";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
    ssr: false,
});

type Props = {
    initialData?: Insight;
    onSave: (insight: Insight) => void;
    onCancel: () => void;
};

const slugify = (str: string) => str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

const calculateReadingTime = (html: string): number => {
    const cleanText = html.replace(/<[^>]+>/g, " ").trim();
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    if (words === 0) return 0;
    return Math.max(1, Math.ceil(words / 200));
};

export default function InsightForm({ initialData, onSave, onCancel }: Props) {
    const [formData, setFormData] = useState<Partial<Insight>>({
        title: "",
        slug: "",
        category: "Studio Stories",
        tags: [],
        image: "",
        gallery: [],
        excerpt: "",
        content: "",
        author: "",
        readTime: 0,
        isFeatured: false,
        orderIndex: 0,
        ...initialData
    });

    const [slugEdited, setSlugEdited] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageModalType, setImageModalType] = useState<"hero" | "gallery">("hero");
    const [customTag, setCustomTag] = useState("");

    const handleCustomTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (customTag.trim()) {
                toggleTag(customTag.trim());
                setCustomTag("");
            }
        }
    };

    // Auto-slug
    useEffect(() => {
        if (!slugEdited && formData.title) {
            setFormData(prev => ({ ...prev, slug: slugify(prev.title || "") }));
        }
    }, [formData.title, slugEdited]);

    // Auto-calculate read time
    useEffect(() => {
        if (formData.content) {
            const time = calculateReadingTime(formData.content);
            setFormData(prev => ({ ...prev, readTime: time }));
        }
    }, [formData.content]);

    const handleChange = (field: keyof Insight, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            const tags = prev.tags || [];
            if (tags.includes(tag)) return { ...prev, tags: tags.filter(t => t !== tag) };
            return { ...prev, tags: [...tags, tag] };
        });
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
        onSave(formData as Insight);
    };

    // Dropdown options
    const categoryOptions = INSIGHT_CATEGORIES.map(c => ({ value: c, label: c }));

    // Get recommended tags for current category
    const recommendedTags = formData.category && RECOMMENDED_TAGS[formData.category]
        ? RECOMMENDED_TAGS[formData.category]
        : [];

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
                            <span className="font-medium text-sm">Back to Insights</span>
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
                                Save Insight
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
                                label="Article Title"
                                value={formData.title}
                                onChange={(e) => handleChange("title", e.target.value)}
                                placeholder="The Future of Sustainable Architecture"
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
                                placeholder="future-sustainable-architecture"
                                inputSize="md"
                                helperText="Auto-generated from title"
                                className="font-mono"
                            />
                        </div>

                        {/* CATEGORY & AUTHOR */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.category || ""}
                                    options={categoryOptions}
                                    onChange={(value) => handleChange("category", value)}
                                    selectSize="md"
                                />
                            </div>

                            <Input
                                label="Author"
                                value={formData.author}
                                onChange={(e) => handleChange("author", e.target.value)}
                                placeholder="Dian Suryani"
                                inputSize="md"
                                helperText="* Required"
                            />
                        </div>

                        {/* TAGS */}
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-3">
                                Tags {formData.category && <span className="text-neutral-400 font-normal normal-case ml-1">(Recommended for {formData.category})</span>}
                            </label>

                            {/* Selected Tags */}
                            {formData.tags && formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {formData.tags.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all border bg-brand-red text-white border-brand-red hover:bg-red-700 flex items-center gap-1.5"
                                        >
                                            {tag}
                                            <X className="w-3 h-3" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Recommended Tags */}
                            <div className="space-y-3">
                                {recommendedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {recommendedTags.map((tag) => {
                                            if ((formData.tags || []).includes(tag)) return null;
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => toggleTag(tag)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all border bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
                                                >
                                                    + {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Custom Tag Input */}
                                <div className="relative max-w-xs">
                                    <input
                                        type="text"
                                        value={customTag}
                                        onChange={(e) => setCustomTag(e.target.value)}
                                        onKeyDown={handleCustomTagKeyDown}
                                        placeholder="+ Add other tag..."
                                        className="w-full px-3 py-1.5 text-xs border border-transparent hover:border-neutral-200 focus:border-brand-red bg-transparent focus:bg-white rounded-lg transition-all placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* EXCERPT */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                Excerpt
                            </label>
                            <textarea
                                value={formData.excerpt || ""}
                                onChange={(e) => handleChange("excerpt", e.target.value)}
                                placeholder="A brief summary of the article (2-3 sentences)"
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                            />
                            <p className="text-xs text-neutral-400">Short summary for previews and SEO</p>
                        </div>

                        {/* CONTENT */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                                Content
                                <span className="text-[10px] font-normal text-neutral-400 normal-case bg-neutral-100 px-2 py-0.5 rounded">
                                    {calculateReadingTime(formData.content || "")} min read (auto-calculated)
                                </span>
                            </label>
                            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <RichTextEditor
                                    value={formData.content || ""}
                                    onChange={(value) => handleChange("content", value)}
                                />
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
                                    label="Read Time (minutes)"
                                    type="number"
                                    value={formData.readTime?.toString() || ""}
                                    onChange={(e) => handleChange("readTime", parseInt(e.target.value) || undefined)}
                                    inputSize="md"
                                    placeholder="Auto"
                                    helperText="Auto-calculated, can override"
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
                            </div>

                            <div className="mt-6">
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
                                    <span>Featured article</span>
                                </label>
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
