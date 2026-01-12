"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { SocialPost, PostStatus, ContentType, SocialAccount, Platform } from "./types/social.types";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import { Button } from "@/shared/ui/primitives/button/button";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: string;
    postToEdit?: SocialPost;
    accounts: SocialAccount[];
    onSave: (post: SocialPost) => void;
    onDelete?: (postId: string) => void;
};

type Slide = { id: string; heading: string; content: string };
type Scene = { id: string; scene: number; duration: string; heading: string; description: string };

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
    { value: "NOT_STARTED", label: "Not Started" },
    { value: "TODO", label: "To Do" },
    { value: "WRITING", label: "Writing" },
    { value: "DESIGNING", label: "Designing" },
    { value: "IN_REVIEW", label: "In Review" },
    { value: "NEED_APPROVAL", label: "Need Approval" },
    { value: "APPROVED", label: "Approved" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "PUBLISHED", label: "Published" },
];

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
    { value: "FEED", label: "Feed Post (LinkedIn)" },
    { value: "CAROUSEL", label: "Carousel (Instagram)" },
    { value: "REEL", label: "Reel (Instagram)" },
    { value: "VIDEO", label: "Video (TikTok)" },
    { value: "STORY", label: "Story (All)" },
    { value: "TEXT", label: "Text Only" },
];

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

const PILLAR_OPTIONS = [
    { value: "", label: "No Pillar" },
    { value: "Showcase", label: "Showcase" },
    { value: "Educational", label: "Educational" },
    { value: "Culture", label: "Culture" },
    { value: "Thought Leadership", label: "Thought Leadership" },
    { value: "Social Proof", label: "Social Proof" },
    { value: "Entertainment", label: "Entertainment" },
];

export default function SocialPostCreator({ isOpen, onClose, initialDate, postToEdit, accounts, onSave, onDelete }: Props) {

    const [formData, setFormData] = useState<Partial<SocialPost>>({
        accountId: accounts?.[0]?.id || "",
        platform: accounts?.[0]?.platform || "INSTAGRAM",
        status: "NOT_STARTED",
        contentType: "FEED",
        contentPillar: "",
        scheduledDate: initialDate || new Date().toISOString().split('T')[0],
        scheduledTime: "",
        title: "",
        caption: "",
        assignee: "",
        publishedUrl: ""
    });

    const [slides, setSlides] = useState<Slide[]>([{ id: "slide-1", heading: "", content: "" }]);
    const [scenes, setScenes] = useState<Scene[]>([{ id: "scene-1", scene: 1, duration: "", heading: "", description: "" }]);
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [hashtagInput, setHashtagInput] = useState("");
    const [expandedSlides, setExpandedSlides] = useState<string[]>(["slide-1"]);

    useEffect(() => {
        if (isOpen) {
            if (postToEdit) {
                setFormData(postToEdit);
                setSlides([{ id: "slide-1", heading: "", content: "" }]);
                setScenes([{ id: "scene-1", scene: 1, duration: "", heading: "", description: "" }]);
                setHashtags([]);
            } else {
                setFormData({
                    accountId: accounts?.[0]?.id || "",
                    platform: accounts?.[0]?.platform || "INSTAGRAM",
                    status: "NOT_STARTED",
                    contentType: "FEED",
                    contentPillar: "",
                    scheduledDate: initialDate || new Date().toISOString().split('T')[0],
                    scheduledTime: "",
                    title: "",
                    caption: "",
                    assignee: "",
                    publishedUrl: ""
                });
                setSlides([{ id: "slide-1", heading: "", content: "" }]);
                setScenes([{ id: "scene-1", scene: 1, duration: "", heading: "", description: "" }]);
                setHashtags([]);
            }
        }
    }, [isOpen, postToEdit, initialDate, accounts]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!formData.title || !formData.scheduledDate) return;
        const newPost: SocialPost = {
            ...formData as SocialPost,
            id: postToEdit?.id || `post-${Date.now()}`
        };
        onSave(newPost);
        onClose();
    };

    const isSlideType = ["FEED", "CAROUSEL", "STORY"].includes(formData.contentType || "");
    const isVideoType = ["VIDEO", "REEL"].includes(formData.contentType || "");

    const addSlide = () => {
        const newId = `slide-${slides.length + 1}`;
        setSlides([...slides, { id: newId, heading: "", content: "" }]);
        setExpandedSlides([...expandedSlides, newId]);
    };

    const removeSlide = (id: string) => {
        if (slides.length <= 1) return;
        setSlides(slides.filter(s => s.id !== id));
    };

    const addScene = () => {
        setScenes([...scenes, { id: `scene-${scenes.length + 1}`, scene: scenes.length + 1, duration: "", heading: "", description: "" }]);
    };

    const removeScene = (id: string) => {
        if (scenes.length <= 1) return;
        setScenes(scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, scene: i + 1 })));
    };

    const toggleSlide = (id: string) => {
        setExpandedSlides(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const addHashtag = () => {
        if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
            setHashtags([...hashtags, hashtagInput.trim().replace(/^#/, '')]);
            setHashtagInput("");
        }
    };

    const removeHashtag = (tag: string) => {
        setHashtags(hashtags.filter(h => h !== tag));
    };

    const accountOptions = accounts?.map(a => ({ value: a.id, label: a.name })) || [];

    // Sync platform when account changes
    const handleAccountChange = (accountId: string) => {
        const acc = accounts?.find(a => a.id === accountId);
        setFormData(f => ({ ...f, accountId, platform: acc?.platform || f.platform }));
    };

    return (
        <>
            <div className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />

            <div className="fixed inset-y-0 right-0 w-[560px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                    <h2 className="text-sm font-semibold text-neutral-900">{postToEdit ? "Edit Post" : "New Post"}</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* TITLE */}
                    <Input
                        placeholder="Post Title"
                        value={formData.title || ""}
                        onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                        inputSize="lg"
                        className="font-semibold"
                    />

                    {/* INLINE FIELDS ROW 1: Account + Platform */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Account</label>
                            <Select
                                value={formData.accountId || ""}
                                options={accountOptions}
                                onChange={handleAccountChange}
                                selectSize="sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Platform</label>
                            <Select
                                value={formData.platform || "INSTAGRAM"}
                                options={PLATFORM_OPTIONS}
                                onChange={(v) => setFormData(f => ({ ...f, platform: v as Platform }))}
                                selectSize="sm"
                            />
                        </div>
                    </div>

                    {/* INLINE FIELDS ROW 2: Type + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Content Type</label>
                            <Select
                                value={formData.contentType || "FEED"}
                                options={CONTENT_TYPE_OPTIONS}
                                onChange={(v) => setFormData(f => ({ ...f, contentType: v as ContentType }))}
                                selectSize="sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Status</label>
                            <Select
                                value={formData.status || "NOT_STARTED"}
                                options={STATUS_OPTIONS}
                                onChange={(v) => setFormData(f => ({ ...f, status: v as PostStatus }))}
                                selectSize="sm"
                            />
                        </div>
                    </div>

                    {/* INLINE FIELDS ROW 3: Pillar + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Content Pillar</label>
                            <Select
                                value={formData.contentPillar || ""}
                                options={PILLAR_OPTIONS}
                                onChange={(v) => setFormData(f => ({ ...f, contentPillar: v }))}
                                selectSize="sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Due Date</label>
                            <Input
                                type="date"
                                value={formData.scheduledDate || ""}
                                onChange={e => setFormData(f => ({ ...f, scheduledDate: e.target.value }))}
                                inputSize="sm"
                            />
                        </div>
                    </div>

                    {/* INLINE FIELDS ROW 4: Time + Assignee */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Time</label>
                            <Input
                                type="time"
                                value={formData.scheduledTime || ""}
                                onChange={e => setFormData(f => ({ ...f, scheduledTime: e.target.value }))}
                                inputSize="sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400">Assignee</label>
                            <Input
                                placeholder="Name"
                                value={formData.assignee || ""}
                                onChange={e => setFormData(f => ({ ...f, assignee: e.target.value }))}
                                inputSize="sm"
                            />
                        </div>
                    </div>

                    <hr className="border-neutral-100" />

                    {/* SLIDES */}
                    {isSlideType && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Slides</h3>
                                <Button variant="secondary" size="sm" onClick={addSlide} icon={<Plus className="w-3 h-3" />}>
                                    Add
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {slides.map((slide, idx) => (
                                    <div key={slide.id} className="border border-neutral-100 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggleSlide(slide.id)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                {expandedSlides.includes(slide.id) ? <ChevronDown className="w-3 h-3 text-neutral-400" /> : <ChevronRight className="w-3 h-3 text-neutral-400" />}
                                                <span className="text-xs font-medium text-neutral-700">{idx === 0 ? "Cover" : `Slide ${idx + 1}`}</span>
                                            </div>
                                            {slides.length > 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                                                    className="text-neutral-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </button>
                                        {expandedSlides.includes(slide.id) && (
                                            <div className="p-3 space-y-2">
                                                <Input
                                                    placeholder="Heading"
                                                    value={slide.heading}
                                                    onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, heading: e.target.value } : s))}
                                                    inputSize="sm"
                                                />
                                                <textarea
                                                    className="w-full text-sm border border-neutral-200 rounded-lg p-2 min-h-[60px] resize-none focus:ring-1 focus:ring-neutral-300"
                                                    placeholder="Content text..."
                                                    value={slide.content}
                                                    onChange={e => setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, content: e.target.value } : s))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SCENES */}
                    {isVideoType && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Scenes</h3>
                                <Button variant="secondary" size="sm" onClick={addScene} icon={<Plus className="w-3 h-3" />}>
                                    Add
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {scenes.map((scene) => (
                                    <div key={scene.id} className="border border-neutral-100 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-neutral-700">Scene {scene.scene}</span>
                                            {scenes.length > 1 && (
                                                <button onClick={() => removeScene(scene.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <Input
                                                placeholder="Duration"
                                                value={scene.duration}
                                                onChange={e => setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, duration: e.target.value } : s))}
                                                inputSize="sm"
                                            />
                                            <div className="col-span-3">
                                                <Input
                                                    placeholder="Scene heading"
                                                    value={scene.heading}
                                                    onChange={e => setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, heading: e.target.value } : s))}
                                                    inputSize="sm"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            className="w-full text-sm border border-neutral-200 rounded-lg p-2 min-h-[50px] resize-none focus:ring-1 focus:ring-neutral-300"
                                            placeholder="Scene description..."
                                            value={scene.description}
                                            onChange={e => setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, description: e.target.value } : s))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <hr className="border-neutral-100" />

                    {/* HASHTAGS */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Hashtags</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {hashtags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-xs px-2 py-1 rounded-full">
                                    #{tag}
                                    <button onClick={() => removeHashtag(tag)} className="hover:text-red-500">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add hashtag..."
                                value={hashtagInput}
                                onChange={e => setHashtagInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                                inputSize="sm"
                                className="flex-1"
                            />
                            <Button variant="secondary" size="sm" onClick={addHashtag}>Add</Button>
                        </div>
                    </div>

                    <hr className="border-neutral-100" />

                    {/* CAPTION */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Caption</label>
                        <textarea
                            className="w-full min-h-[100px] text-sm leading-relaxed text-neutral-700 placeholder:text-neutral-300 border border-neutral-200 rounded-lg focus:ring-1 focus:ring-neutral-400 resize-none p-3"
                            placeholder="Write your caption here..."
                            value={formData.caption || ""}
                            onChange={e => setFormData(f => ({ ...f, caption: e.target.value }))}
                        />
                    </div>

                    {/* URL */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-neutral-400">Published URL</label>
                        <Input
                            placeholder="https://..."
                            value={formData.publishedUrl || ""}
                            onChange={e => setFormData(f => ({ ...f, publishedUrl: e.target.value }))}
                            inputSize="sm"
                        />
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
                    {postToEdit && onDelete ? (
                        <Button variant="secondary" size="sm" onClick={() => { onDelete(postToEdit.id); onClose(); }}>
                            Delete
                        </Button>
                    ) : <span />}

                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={handleSave}>
                            {postToEdit ? "Save" : "Create"}
                        </Button>
                    </div>
                </div>

            </div>
        </>
    );
}
