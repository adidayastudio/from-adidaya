"use client";

import React, { useState, useEffect } from "react";

import { X, Upload, FileText as FileIcon, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import { Department, DEPARTMENT_OPTIONS, QuickView, KnowledgeType } from "./types";

interface KnowledgeDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: "add" | "edit";
    initialData?: any;
    onSuccess?: (data: any) => void;
}

export default function KnowledgeDrawer({
    isOpen,
    onClose,
    mode = "add",
    initialData,
    onSuccess
}: KnowledgeDrawerProps) {
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const supabase = createClient();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "documentation" as "documentation" | "templates" | "references",
        type: "" as string,
        department: "" as string,
        files: [] as { file: File | null; file_url: string; name: string }[],
        chapters: [] as { title: string; content: string }[],
        checklistItems: [] as { text: string; required: boolean }[],
        workflowSteps: [] as { title: string; description: string; decision?: { yes: string; no: string } }[]
    });

    useEffect(() => {
        if (isOpen && mode === "edit" && initialData) {
            setFormData({
                title: initialData.title || "",
                description: initialData.content || initialData.description || "",
                category: initialData.category || "documentation",
                type: initialData.type || "",
                department: initialData.department || "",
                files: initialData.metadata?.files || (initialData.fileUrl || initialData.file_url ? [{ file: null, file_url: initialData.fileUrl || initialData.file_url, name: "Asset Document" }] : []),
                chapters: initialData.chapters || [],
                checklistItems: initialData.checklistItems || [],
                workflowSteps: initialData.workflowSteps || []
            });
        } else if (isOpen && mode === "add") {
            setFormData({
                title: "",
                description: "",
                category: "documentation",
                type: "",
                department: "",
                files: [],
                chapters: [],
                checklistItems: [],
                workflowSteps: []
            });
        }
    }, [isOpen, mode, initialData]);

    const knowledgeTypeOptions = React.useMemo(() => {
        if (formData.category === "documentation") return [
            { value: "SOP", label: "SOP" },
            { value: "WORKFLOW", label: "Workflow" },
            { value: "GUIDELINE", label: "Guideline" },
            { value: "POLICY", label: "Policy" },
            { value: "STANDARD", label: "Standard" },
            { value: "CHECKLIST", label: "Checklist" },
        ];
        if (formData.category === "templates") return [
            { value: "TEMPLATE_PPT", label: "PPT Template" },
            { value: "TEMPLATE_RAB", label: "RAB Template" },
            { value: "TEMPLATE_DRAWING", label: "Drawing Template" },
            { value: "TEMPLATE_CONTRACT", label: "Contract Template" },
            { value: "TEMPLATE_REPORT", label: "Report Template" },
        ];
        return [
            { value: "VIDEO", label: "Video" },
            { value: "PHOTO", label: "Photo" },
            { value: "DESIGN_REF", label: "Design Ref" },
            { value: "MATERIAL_CATALOG", label: "Material Catalog" },
            { value: "VENDOR_LIST", label: "Vendor List" },
            { value: "PRICE_REF", label: "Price Ref" },
        ];
    }, [formData.category]);

    const handleSubmit = async () => {
        if (!formData.title || !formData.category || !formData.type || !formData.department) {
            alert("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("You must be logged in.");
                setSubmitting(false);
                return;
            }

            let uploadedFiles = [...formData.files];

            for (let i = 0; i < uploadedFiles.length; i++) {
                if (uploadedFiles[i].file) {
                    const fileExt = uploadedFiles[i].file!.name.split('.').pop();
                    const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('knowledge-assets')
                        .upload(fileName, uploadedFiles[i].file!);

                    if (uploadError) {
                        console.error("Upload Error:", uploadError);
                        if (!confirm(`File ${uploadedFiles[i].file!.name} upload failed. Continue?`)) {
                            setSubmitting(false);
                            return;
                        }
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('knowledge-assets')
                            .getPublicUrl(fileName);
                        uploadedFiles[i] = { ...uploadedFiles[i], file_url: publicUrl, file: null };
                    }
                }
            }

            const primary_url = uploadedFiles.length > 0 ? uploadedFiles[0].file_url : "";

            const payload: any = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                type: formData.type,
                department: formData.department,
                user_id: user.id,
                file_url: primary_url,
                metadata: {
                    files: uploadedFiles.map(f => ({ file_url: f.file_url, name: f.name })),
                    chapters: formData.chapters,
                    checklistItems: formData.checklistItems,
                    workflowSteps: formData.workflowSteps
                }
            };

            if (mode === "add") {
                const { data, error } = await supabase.from('knowledge_items').insert(payload).select().single();
                if (error) throw error;
                if (onSuccess) onSuccess(data);
            } else {
                const { data, error } = await supabase
                    .from('knowledge_items')
                    .update(payload)
                    .eq('id', initialData.id)
                    .select()
                    .single();
                if (error) throw error;
                if (onSuccess) onSuccess(data);
            }

            onClose();
        } catch (error: any) {
            console.error("Error saving knowledge:", error);
            alert("Error saving knowledge: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('knowledge_items')
                .delete()
                .eq('id', initialData.id);

            if (error) throw error;

            if (onSuccess) onSuccess({ deleted: true, id: initialData.id });
            onClose();
        } catch (error: any) {
            console.error("Error deleting knowledge:", error);
            alert("Error deleting knowledge: " + error.message);
        } finally {
            setSubmitting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:justify-end">
            <div
                className="absolute inset-0 bg-black/5 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />
            <div className={clsx(
                "relative bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[56px] shadow-2xl overflow-hidden border border-white/40 p-8 flex flex-col gap-8 transition-all duration-500",
                "w-[calc(100%-16px)] mx-2 mb-2 max-h-[92dvh] animate-in slide-in-from-bottom",
                "sm:w-[500px] sm:mr-6 sm:mb-6 sm:mx-0 sm:max-h-[calc(100vh-48px)]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                        {mode === "add" ? "Add Knowledge" : "Edit Knowledge"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/50 backdrop-blur-xl border border-black/5 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={20} className="text-neutral-500" strokeWidth={1.5} />
                    </button>
                </div>

                <div className="flex flex-col gap-8 overflow-y-auto pb-24 pr-1 scrollbar-hide">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Basic Information</h4>
                        <div className="space-y-3 px-1">
                            <input
                                type="text"
                                placeholder="Knowledge Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/40 backdrop-blur-md border border-black/[0.04] rounded-[24px] px-6 py-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-neutral-400"
                            />
                            <textarea
                                placeholder="Description"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white/40 backdrop-blur-md border border-black/[0.04] rounded-[24px] px-6 py-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-neutral-400 resize-none"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Category</h4>
                        <div className="flex flex-wrap gap-2.5 px-1">
                            {[
                                { value: "documentation", label: "Documentation" },
                                { value: "templates", label: "Templates" },
                                { value: "references", label: "References" }
                            ].map((cat) => {
                                const isSelected = formData.category === cat.value;
                                return (
                                    <button
                                        key={cat.value}
                                        onClick={() => setFormData({ ...formData, category: cat.value as any, type: "" })}
                                        className={clsx(
                                            "px-6 py-3 rounded-full text-[14px] transition-all border",
                                            isSelected
                                                ? "bg-blue-600 backdrop-blur-md text-white border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-white/10 font-medium"
                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                        )}
                                    >
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Knowledge Type */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Knowledge Type</h4>
                        <div className="flex flex-wrap gap-2.5 px-1">
                            {knowledgeTypeOptions.map((opt) => {
                                const isSelected = formData.type === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFormData({ ...formData, type: opt.value })}
                                        className={clsx(
                                            "px-5 py-2.5 rounded-full text-[13px] transition-all border",
                                            isSelected
                                                ? "bg-blue-600 backdrop-blur-md text-white border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-white/10 font-medium"
                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Department */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Department</h4>
                        <div className="flex flex-wrap gap-2.5 px-1">
                            {DEPARTMENT_OPTIONS.filter(opt => opt.value !== "ALL").map((opt: any) => {
                                const isSelected = formData.department === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFormData({ ...formData, department: opt.value })}
                                        className={clsx(
                                            "px-5 py-2.5 rounded-full text-[13px] transition-all border",
                                            isSelected
                                                ? "bg-blue-600 backdrop-blur-md text-white border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-white/10 font-medium"
                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-white/50"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Media */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                            <div>
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Knowledge Assets</h4>
                                <div className="text-[11px] text-neutral-400 italic mt-1">Upload up to 10 files. Drag arrows to reorder.</div>
                            </div>
                        </div>
                        <div className="px-1 space-y-3">
                            <input
                                type="file"
                                id="knowledge-file-multi"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const newFiles = Array.from(e.target.files).map(f => ({ file: f, file_url: "", name: f.name }));
                                        const combined = [...formData.files, ...newFiles].slice(0, 10);
                                        setFormData({ ...formData, files: combined });
                                    }
                                }}
                            />
                            {formData.files.map((asset: any, idx: number) => (
                                <div key={idx} className="flex gap-2 items-center bg-white/40 p-2 pl-3 rounded-2xl border border-black/[0.04] shadow-sm">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-black/5 shrink-0">
                                        <FileIcon size={14} className="text-blue-600/60" />
                                    </div>
                                    <input
                                        type="text"
                                        value={asset.name}
                                        onChange={(e) => {
                                            const newArr = [...formData.files];
                                            newArr[idx].name = e.target.value;
                                            setFormData({ ...formData, files: newArr });
                                        }}
                                        className="flex-1 bg-transparent border-none text-[13px] font-medium text-neutral-700 focus:outline-none focus:ring-0 truncate"
                                        placeholder="File name"
                                    />
                                    <div className="flex items-center gap-1 shrink-0 px-1">
                                        <button disabled={idx === 0} onClick={() => {
                                            const newArr = [...formData.files];
                                            [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
                                            setFormData({ ...formData, files: newArr });
                                        }} className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"><ChevronUp size={16} /></button>
                                        <button disabled={idx === formData.files.length - 1} onClick={() => {
                                            const newArr = [...formData.files];
                                            [newArr[idx + 1], newArr[idx]] = [newArr[idx], newArr[idx + 1]];
                                            setFormData({ ...formData, files: newArr });
                                        }} className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"><ChevronDown size={16} /></button>
                                        <button onClick={() => {
                                            const newArr = formData.files.filter((_: any, i: number) => i !== idx);
                                            setFormData({ ...formData, files: newArr });
                                        }} className="w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-100 transition-colors ml-1"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            {formData.files.length < 10 && (
                                <button
                                    onClick={() => document.getElementById('knowledge-file-multi')?.click()}
                                    className="w-full py-4 bg-white/30 backdrop-blur-md border border-dashed border-black/10 hover:border-blue-500/30 hover:bg-blue-500/[0.03] rounded-[20px] flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition-all"
                                >
                                    <Upload size={18} className="text-neutral-400" />
                                    <span className="text-[12px] font-medium text-neutral-500">
                                        + Add File ({formData.files.length}/10)
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Contextual Fields */}
                    {formData.type === "CHECKLIST" && (
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Checklist Items</h4>
                            <div className="space-y-3 px-1">
                                {formData.checklistItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Item text"
                                            value={item.text}
                                            onChange={(e) => {
                                                const newItems = [...formData.checklistItems];
                                                newItems[idx].text = e.target.value;
                                                setFormData({ ...formData, checklistItems: newItems });
                                            }}
                                            className="flex-1 bg-white/40 border border-black/[0.04] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                        />
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    if (idx === 0) return;
                                                    const newItems = [...formData.checklistItems];
                                                    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
                                                    setFormData({ ...formData, checklistItems: newItems });
                                                }}
                                                className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                                                disabled={idx === 0}
                                            >
                                                <ChevronUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (idx === formData.checklistItems.length - 1) return;
                                                    const newItems = [...formData.checklistItems];
                                                    [newItems[idx + 1], newItems[idx]] = [newItems[idx], newItems[idx + 1]];
                                                    setFormData({ ...formData, checklistItems: newItems });
                                                }}
                                                className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                                                disabled={idx === formData.checklistItems.length - 1}
                                            >
                                                <ChevronDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newItems = formData.checklistItems.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, checklistItems: newItems });
                                                }}
                                                className="w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-100 transition-colors ml-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => setFormData({ ...formData, checklistItems: [...formData.checklistItems, { text: "", required: false }] })}
                                        className="w-fit px-4 py-1.5 border border-dashed border-neutral-300 rounded-full text-xs font-bold text-neutral-500 hover:bg-neutral-50 transition-colors"
                                    >
                                        + Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {formData.type === "WORKFLOW" && (
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Workflow Steps</h4>
                            <div className="space-y-3 px-1">
                                {formData.workflowSteps.map((step, idx) => (
                                    <div key={idx} className="p-4 bg-white/40 rounded-2xl border border-black/[0.04] space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Step {idx + 1}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        if (idx === 0) return;
                                                        const newSteps = [...formData.workflowSteps];
                                                        [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
                                                        setFormData({ ...formData, workflowSteps: newSteps });
                                                    }}
                                                    className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                                                    disabled={idx === 0}
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (idx === formData.workflowSteps.length - 1) return;
                                                        const newSteps = [...formData.workflowSteps];
                                                        [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]];
                                                        setFormData({ ...formData, workflowSteps: newSteps });
                                                    }}
                                                    className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                                                    disabled={idx === formData.workflowSteps.length - 1}
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newSteps = formData.workflowSteps.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, workflowSteps: newSteps });
                                                    }}
                                                    className="w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-100 transition-colors ml-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Step Title"
                                            value={step.title}
                                            onChange={(e) => {
                                                const newSteps = [...formData.workflowSteps];
                                                newSteps[idx].title = e.target.value;
                                                setFormData({ ...formData, workflowSteps: newSteps });
                                            }}
                                            className="w-full bg-transparent border-b border-black/5 pb-1 text-sm focus:outline-none"
                                        />
                                        <textarea
                                            placeholder="Description"
                                            value={step.description}
                                            onChange={(e) => {
                                                const newSteps = [...formData.workflowSteps];
                                                newSteps[idx].description = e.target.value;
                                                setFormData({ ...formData, workflowSteps: newSteps });
                                            }}
                                            className="w-full bg-transparent text-xs text-neutral-500 focus:outline-none resize-none"
                                        />
                                    </div>
                                ))}
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => setFormData({ ...formData, workflowSteps: [...formData.workflowSteps, { title: "", description: "" }] })}
                                        className="w-fit px-4 py-1.5 border border-dashed border-neutral-300 rounded-full text-xs font-bold text-neutral-500 hover:bg-neutral-50 transition-colors"
                                    >
                                        + Add Step
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {formData.type === "SOP" && (
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">SOP Chapters</h4>
                            <div className="space-y-3 px-1">
                                {formData.chapters.map((chap, idx) => (
                                    <div key={idx} className="p-4 bg-white/40 rounded-2xl border border-black/[0.04] space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-neutral-400 uppercase">Chapter {idx + 1}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        if (idx === 0) return;
                                                        const newChaps = [...formData.chapters];
                                                        [newChaps[idx - 1], newChaps[idx]] = [newChaps[idx], newChaps[idx - 1]];
                                                        setFormData({ ...formData, chapters: newChaps });
                                                    }}
                                                    className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                                                    disabled={idx === 0}
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (idx === formData.chapters.length - 1) return;
                                                        const newChaps = [...formData.chapters];
                                                        [newChaps[idx + 1], newChaps[idx]] = [newChaps[idx], newChaps[idx + 1]];
                                                        setFormData({ ...formData, chapters: newChaps });
                                                    }}
                                                    className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                                                    disabled={idx === formData.chapters.length - 1}
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newChaps = formData.chapters.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, chapters: newChaps });
                                                    }}
                                                    className="w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-100 transition-colors ml-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Chapter Title"
                                            value={chap.title}
                                            onChange={(e) => {
                                                const newChaps = [...formData.chapters];
                                                newChaps[idx].title = e.target.value;
                                                setFormData({ ...formData, chapters: newChaps });
                                            }}
                                            className="w-full bg-transparent border-b border-black/5 pb-1 text-sm focus:outline-none"
                                        />
                                        <textarea
                                            placeholder="Content"
                                            value={chap.content}
                                            onChange={(e) => {
                                                const newChaps = [...formData.chapters];
                                                newChaps[idx].content = e.target.value;
                                                setFormData({ ...formData, chapters: newChaps });
                                            }}
                                            className="w-full bg-transparent text-xs text-neutral-500 focus:outline-none resize-none"
                                        />
                                    </div>
                                ))}
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => setFormData({ ...formData, chapters: [...formData.chapters, { title: "", content: "" }] })}
                                        className="w-fit px-4 py-1.5 border border-dashed border-neutral-300 rounded-full text-xs font-bold text-neutral-500 hover:bg-neutral-50 transition-colors"
                                    >
                                        + Add Chapter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 bg-transparent flex flex-col gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={clsx(
                            "w-full bg-blue-600/90 dark:bg-blue-500/90 backdrop-blur-xl backdrop-saturate-[1.5] text-white py-4 rounded-full font-bold text-[17px] active:scale-[0.98] transition-all border border-white/20 ring-1 ring-inset ring-white/10 flex items-center justify-center gap-2",
                            submitting && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {submitting ? "Saving..." : (mode === "add" ? "Create Knowledge" : "Update Knowledge")}
                    </button>

                    {mode === "edit" && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={submitting}
                            className="w-full bg-rose-500/10 text-rose-600 py-3 rounded-full font-bold text-[14px] active:scale-[0.98] transition-all border border-rose-200/50 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} />
                            Delete Knowledge
                        </button>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-white/40 animate-in zoom-in-95 duration-200">
                        <h4 className="text-xl font-bold text-neutral-900 mb-2">Delete Knowledge?</h4>
                        <p className="text-neutral-500 text-[15px] mb-8 leading-relaxed">
                            This action cannot be undone. All data associated with this item will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-neutral-100 text-neutral-600 rounded-full font-bold text-[15px] active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 bg-rose-600 text-white rounded-full font-bold text-[15px] active:scale-95 transition-all shadow-lg shadow-rose-600/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
