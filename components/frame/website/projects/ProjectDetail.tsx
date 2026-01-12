"use client";

import { Project, PROJECT_STATUS_COLORS } from "./types";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, Pencil, Trash2, Send, CheckCircle, AlertCircle, Globe, EyeOff } from "lucide-react";
import clsx from "clsx";

type Props = {
    project: Project;
    onEdit: () => void;
    onDelete: () => void;
    onBack: () => void;
    onSubmit?: () => void;
    onApprove?: () => void;
    onNeedRevision?: () => void;
    onPublish?: () => void;
    onUnpublish?: () => void;
};

export default function ProjectDetail({ project, onEdit, onDelete, onBack, onSubmit, onApprove, onNeedRevision, onPublish, onUnpublish }: Props) {
    const isPublished = project.status === "PUBLISHED";
    const canSubmit = ["NOT_STARTED", "TODO", "WRITING", "NEED_REVISION"].includes(project.status);
    const isInReview = project.status === "IN_REVIEW";
    const isApproved = project.status === "APPROVED";
    const needsRevision = project.status === "NEED_REVISION";

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* HEADER */}
            <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-sm">Back to Projects</span>
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
                        {isPublished ? "Edit (Unpublish First)" : "Edit Project"}
                    </Button>
                </div>
            </div>

            {/* CONTENT CARD */}
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
                {/* HERO IMAGE */}
                <div className="aspect-[21/9] w-full bg-neutral-100 relative group overflow-hidden">
                    <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    <div className="absolute bottom-8 left-8 right-8 text-white">
                        {/* Category and Subcategory Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {/* Categories - Red badges */}
                            {project.categories?.map((cat) => (
                                <span
                                    key={cat}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[#E23528] text-white"
                                >
                                    {cat}
                                </span>
                            ))}
                            {/* Subcategories - Gray badges */}
                            {project.subcategories?.map((sub) => (
                                <span
                                    key={sub}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-neutral-500/80 text-white"
                                >
                                    {sub}
                                </span>
                            ))}
                        </div>

                        {/* Project Title - Title Case (as inputted) */}
                        <h1 className="text-5xl font-bold tracking-tight mb-3">{project.name}</h1>

                        {/* Metadata Row - Phase • Location • Year */}
                        <div className="flex items-center gap-3 text-sm text-neutral-200">
                            <span className="font-medium">{project.phase}</span>
                            <span>•</span>
                            <span>{project.isConfidential ? "Private Location" : `${project.city}, ${project.country}`}</span>
                            <span>•</span>
                            <span>{project.isOngoing ? `${project.yearStart} - Present` : (project.yearEnd ? `${project.yearStart} - ${project.yearEnd}` : project.yearStart)}</span>
                            {project.scheduledDate && (
                                <>
                                    <span>•</span>
                                    <span className="text-orange-200 font-medium">Deadline: {project.scheduledDate}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="max-w-4xl mx-auto px-8 py-12 space-y-10">
                    {/* Team Members Section */}
                    {project.teamMembers && project.teamMembers.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Team</h3>
                            <div className="space-y-2">
                                {project.teamMembers.map((member, idx) => (
                                    <p key={idx} className="text-base text-neutral-700">
                                        <span className="font-semibold">{member.name}</span>
                                        {member.role && <span className="text-neutral-500"> • {member.role}</span>}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Author Section */}
                    {project.author && (
                        <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Author</h3>
                            <p className="text-base font-semibold text-neutral-700">{project.author}</p>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-neutral-200" />

                    {/* Description Section */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Description</h3>
                        <div className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed">
                            {project.description ? (
                                <div dangerouslySetInnerHTML={{ __html: project.description }} />
                            ) : (
                                <p className="text-neutral-400 italic">This project's story is still being written. Check back soon for updates.</p>
                            )}
                        </div>
                    </div>

                    {/* Gallery Section - Square format with click to preview */}
                    {project.gallery && project.gallery.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Gallery</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {project.gallery.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => window.open(item.url, '_blank')}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 group hover:shadow-lg hover:border-neutral-300 transition-all cursor-pointer"
                                    >
                                        <img
                                            src={item.url}
                                            alt={item.caption || "Gallery image"}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        {item.caption && (
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white text-xs font-medium line-clamp-2">{item.caption}</p>
                                            </div>
                                        )}
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

