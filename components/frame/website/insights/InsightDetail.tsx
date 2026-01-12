"use client";

import { Insight, INSIGHT_STATUS_COLORS } from "./types";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, Pencil, Trash2, Send, CheckCircle, AlertCircle, Globe, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";
import clsx from "clsx";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
    ssr: false,
});

type Props = {
    insight: Insight;
    onEdit: () => void;
    onDelete: () => void;
    onBack: () => void;
    onSubmit?: () => void;
    onApprove?: () => void;
    onNeedRevision?: () => void;
    onPublish?: () => void;
    onUnpublish?: () => void;
};

export default function InsightDetail({ insight, onEdit, onDelete, onBack, onSubmit, onApprove, onNeedRevision, onPublish, onUnpublish }: Props) {
    const isPublished = insight.status === "PUBLISHED";
    const canSubmit = ["NOT_STARTED", "TODO", "WRITING", "NEED_REVISION"].includes(insight.status);
    const isInReview = insight.status === "IN_REVIEW";
    const isApproved = insight.status === "APPROVED";

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* HEADER */}
            <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-sm">Back to Insights</span>
                </button>

                <div className="flex items-center gap-2">
                    {/* Workflow Actions */}
                    {canSubmit && onSubmit && (
                        <Button variant="outline" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={onSubmit}>
                            Submit for Review
                        </Button>
                    )}

                    {isInReview && onNeedRevision && (
                        <Button variant="outline" size="sm" icon={<AlertCircle className="w-3.5 h-3.5" />} onClick={onNeedRevision} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                            Need Revision
                        </Button>
                    )}

                    {isInReview && onApprove && (
                        <Button variant="outline" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={onApprove} className="text-green-600 border-green-200 hover:bg-green-50">
                            Approve
                        </Button>
                    )}

                    {isApproved && onPublish && (
                        <Button variant="primary" size="sm" icon={<Globe className="w-3.5 h-3.5" />} onClick={onPublish}>
                            Publish
                        </Button>
                    )}

                    {isPublished && onUnpublish && (
                        <Button variant="outline" size="sm" icon={<EyeOff className="w-3.5 h-3.5" />} onClick={onUnpublish} className="text-neutral-600 border-neutral-300">
                            Unpublish
                        </Button>
                    )}

                    {/* Delete */}
                    <Button variant="outline" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete} className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">
                        Delete
                    </Button>

                    {/* Edit - Disabled when Published */}
                    <Button
                        variant="primary"
                        size="sm"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={onEdit}
                        disabled={isPublished}
                        className={isPublished ? "opacity-50 cursor-not-allowed" : ""}
                    >
                        {isPublished ? "Edit (Unpublish First)" : "Edit Insight"}
                    </Button>
                </div>
            </div>

            {/* CONTENT CARD */}
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
                {/* HERO IMAGE */}
                <div className="aspect-[21/9] w-full bg-neutral-100 relative group overflow-hidden">
                    {insight.image ? (
                        <img src={insight.image} alt={insight.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
                            No Image
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    <div className="absolute bottom-8 left-8 right-8 text-white">
                        {/* Category and Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {/* Category - Red badge */}
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[#E23528] text-white">
                                {insight.category}
                            </span>

                            {/* Tags - Gray badges */}
                            {insight.tags?.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-neutral-500/80 text-white"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Insight Title */}
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">{insight.title}</h1>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-3 text-sm text-neutral-200 font-medium">
                            <span className="flex items-center gap-2">
                                By {insight.author}
                            </span>

                            {insight.readTime && (
                                <>
                                    <span>•</span>
                                    <span>{insight.readTime} min read</span>
                                </>
                            )}

                            {insight.publishDate && (
                                <>
                                    <span>•</span>
                                    <span>{new Date(insight.publishDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </>
                            )}

                            {insight.scheduledDate && (
                                <>
                                    <span>•</span>
                                    <span className="text-orange-200">Deadline: {new Date(insight.scheduledDate).toLocaleDateString('en-GB')}</span>
                                </>
                            )}

                            {insight.status !== "PUBLISHED" && (
                                <>
                                    <span>•</span>
                                    <span className={clsx(
                                        "uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded",
                                        INSIGHT_STATUS_COLORS[insight.status]
                                    )}>
                                        {insight.status.replace("_", " ")}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="max-w-3xl mx-auto px-6 py-12">

                    {/* EXCERPT */}
                    {insight.excerpt && (
                        <div className="text-xl md:text-2xl font-medium text-neutral-900 leading-relaxed mb-12 text-center font-serif italic text-balance">
                            "{insight.excerpt}"
                        </div>
                    )}

                    {/* CONTENT BODY */}
                    <div className="prose prose-neutral prose-lg max-w-none 
                        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-neutral-900
                        prose-p:text-neutral-600 prose-p:leading-loose
                        prose-img:rounded-xl prose-img:shadow-lg
                        prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline
                        mb-20">
                        {/* We use RichTextEditor in read-only mode to render content consistently */}
                        <RichTextEditor
                            value={insight.content || ""}
                            onChange={() => { }}
                            readOnly
                        />
                    </div>

                    {/* GALLERY */}
                    {insight.gallery && insight.gallery.length > 0 && (
                        <div className="border-t border-neutral-200 pt-16">
                            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-6 text-center">Gallery</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {insight.gallery.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => window.open(item.url, '_blank')}
                                        className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 group hover:shadow-lg hover:border-neutral-300 transition-all cursor-zoom-in"
                                    >
                                        <img
                                            src={item.url}
                                            alt={item.caption || "Gallery image"}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
