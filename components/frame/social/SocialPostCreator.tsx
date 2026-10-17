"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { SocialPost, PostStatus, ContentType, SocialAccount } from "./types/social.types";

type Slide = { id: string; heading: string; content: string };
type Scene = { id: string; scene: number; duration: string; heading: string; description: string };

type Props = {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: string;
    postToEdit?: SocialPost;
    accounts: SocialAccount[];
    onSave: (post: SocialPost) => void;
    onDelete?: (postId: string) => void;
};

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
    { value: "NOT_STARTED", label: "Not Started" },
    { value: "TODO", label: "To Do" },
    { value: "WRITING", label: "Writing" },
    { value: "DESIGNING", label: "Designing" },
    { value: "IN_REVIEW", label: "In Review" },
    { value: "NEED_REVISION", label: "Need Revision" },
    { value: "NEED_APPROVAL", label: "Need Approval" },
    { value: "APPROVED", label: "Approved" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "PUBLISHED", label: "Published" },
];

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
    { value: "FEED", label: "Feed Post" },
    { value: "CAROUSEL", label: "Carousel" },
    { value: "REEL", label: "Reel" },
    { value: "VIDEO", label: "Video" },
    { value: "STORY", label: "Story" },
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

const PRIORITY_OPTIONS = [
    { value: "LOW", label: "Low" },
    { value: "MID", label: "Mid" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
];

export default function SocialPostCreator({ isOpen, onClose, initialDate, postToEdit, accounts, onSave, onDelete }: Props) {
    const [formData, setFormData] = useState<Partial<SocialPost>>({
        accountId: accounts?.[0]?.id || "",
        platform: accounts?.[0]?.platform || "INSTAGRAM",
        status: "NOT_STARTED",
        contentType: "FEED",
        contentPillar: "",
        scheduledDate: initialDate || new Date().toISOString().split("T")[0],
        scheduledTime: "10:00",
        title: "",
        caption: "",
        assignee: "",
        priority: "MID",
    });

    const [hashtags, setHashtags] = useState<string[]>([]);
    const [hashtagInput, setHashtagInput] = useState("");
    const [slides, setSlides] = useState<Slide[]>([{ id: "slide-1", heading: "", content: "" }]);
    const [scenes, setScenes] = useState<Scene[]>([{ id: "scene-1", scene: 1, duration: "", heading: "", description: "" }]);

    useEffect(() => {
        if (isOpen) {
            if (postToEdit) {
                setFormData(postToEdit);
                setHashtags(postToEdit.hashtags || []);
                if (postToEdit.storyboard) {
                    if (["CAROUSEL", "STORY"].includes(postToEdit.contentType)) {
                        setSlides(postToEdit.storyboard);
                    } else if (["VIDEO", "REEL"].includes(postToEdit.contentType)) {
                        setScenes(postToEdit.storyboard);
                    }
                }
            } else {
                setFormData({
                    accountId: accounts?.[0]?.id || "",
                    platform: accounts?.[0]?.platform || "INSTAGRAM",
                    status: "NOT_STARTED",
                    contentType: "FEED",
                    contentPillar: "",
                    scheduledDate: initialDate || new Date().toISOString().split("T")[0],
                    scheduledTime: "10:00",
                    title: "",
                    caption: "",
                    assignee: "",
                    priority: "MID",
                });
                setHashtags([]);
                setSlides([{ id: "slide-1", heading: "", content: "" }]);
                setScenes([{ id: "scene-1", scene: 1, duration: "", heading: "", description: "" }]);
            }
        }
    }, [isOpen, postToEdit, initialDate, accounts]);

    if (!isOpen) return null;

    const isSlideType = ["CAROUSEL", "STORY"].includes(formData.contentType || "");
    const isVideoType = ["VIDEO", "REEL"].includes(formData.contentType || "");

    const handleSave = () => {
        if (!formData.title || !formData.scheduledDate || !formData.accountId) return;
        const newPost: SocialPost = {
            ...formData as SocialPost,
            id: postToEdit?.id || "",
            hashtags,
            storyboard: isSlideType ? slides : (isVideoType ? scenes : null)
        };
        onSave(newPost);
        onClose();
    };

    const addSlide = () => setSlides([...slides, { id: `slide-${Date.now()}`, heading: "", content: "" }]);
    const removeSlide = (id: string) => slides.length > 1 && setSlides(slides.filter(s => s.id !== id));

    const addScene = () => setScenes([...scenes, { id: `scene-${Date.now()}`, scene: scenes.length + 1, duration: "", heading: "", description: "" }]);
    const removeScene = (id: string) => scenes.length > 1 && setScenes(scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, scene: i + 1 })));

    const addHashtag = () => {
        const tag = hashtagInput.trim().replace(/^#/, "");
        if (tag && !hashtags.includes(tag)) {
            setHashtags([...hashtags, tag]);
            setHashtagInput("");
        }
    };

    const removeHashtag = (tag: string) => setHashtags(hashtags.filter(h => h !== tag));

    const handleAccountChange = (accountId: string) => {
        const acc = accounts?.find(a => a.id === accountId);
        setFormData(f => ({ ...f, accountId, platform: acc?.platform || f.platform }));
    };

    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5 font-sans">
            {children}
        </label>
    );

    const InputStyles = "w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-orange-200 outline-none transition-all shadow-sm shadow-black/[0.02] placeholder:text-neutral-300 font-sans appearance-none";

    return (
        <>
            <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[90] transition-all duration-500" onClick={onClose} />

            <div className="fixed bottom-2 left-2 right-2 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/40 rounded-[56px] shadow-2xl z-[100] animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col max-h-[92vh]">

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-400/10 blur-[120px] pointer-events-none" />

                <div className="flex-shrink-0 pt-3 flex justify-center relative z-10">
                    <div className="w-10 h-1 rounded-full bg-neutral-200/50" />
                </div>

                <div className="flex items-center justify-between px-10 py-6 relative z-10">
                    <div>
                        <h3 className="text-[20px] font-bold text-neutral-900 tracking-tight font-sans">
                            {postToEdit ? "Update Post" : "Add New Post"}
                        </h3>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1 font-sans">Social Content Planner</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
                        <X size={20} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-10 pt-2 pb-12 space-y-8 relative z-10">

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label>Account</Label>
                                <div className="relative">
                                    <select
                                        value={formData.accountId}
                                        onChange={(e) => handleAccountChange(e.target.value)}
                                        className={InputStyles}
                                    >
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                                        <ChevronDown size={18} strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>Post Title</Label>
                                <input
                                    placeholder="Brief internal title..."
                                    value={formData.title}
                                    onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                                    className={InputStyles}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label>Format</Label>
                                <div className="relative">
                                    <select
                                        value={formData.contentType}
                                        onChange={(e) => setFormData(f => ({ ...f, contentType: e.target.value as ContentType }))}
                                        className={InputStyles}
                                    >
                                        {CONTENT_TYPE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                                        <ChevronDown size={18} strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>Status</Label>
                                <div className="relative">
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(f => ({ ...f, status: e.target.value as PostStatus }))}
                                        className={InputStyles}
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                                        <ChevronDown size={18} strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Label>Content Pillar</Label>
                                <div className="relative">
                                    <select
                                        value={formData.contentPillar}
                                        onChange={(e) => setFormData(f => ({ ...f, contentPillar: e.target.value }))}
                                        className={InputStyles}
                                    >
                                        {PILLAR_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                                        <ChevronDown size={18} strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>Priority</Label>
                                <div className="relative">
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData(f => ({ ...f, priority: e.target.value as any }))}
                                        className={clsx(InputStyles, "font-bold text-orange-500")}
                                    >
                                        {PRIORITY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                                        <ChevronDown size={18} strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>Assignee</Label>
                                <input
                                    placeholder="Who is responsible?"
                                    value={formData.assignee}
                                    onChange={(e) => setFormData(f => ({ ...f, assignee: e.target.value }))}
                                    className={InputStyles}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Date</Label>
                                    <input
                                        type="date"
                                        value={formData.scheduledDate}
                                        onChange={(e) => setFormData(f => ({ ...f, scheduledDate: e.target.value }))}
                                        className={InputStyles}
                                    />
                                </div>
                                <div>
                                    <Label>Time</Label>
                                    <input
                                        type="time"
                                        value={formData.scheduledTime}
                                        onChange={(e) => setFormData(f => ({ ...f, scheduledTime: e.target.value }))}
                                        className={InputStyles}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Storyboard / Carousel Section */}
                    {(isSlideType || isVideoType) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <Label>{isSlideType ? "Carousel Slides" : "Video Storyboard"}</Label>
                                <button
                                    onClick={isSlideType ? addSlide : addScene}
                                    className="h-8 px-4 rounded-full bg-neutral-900 text-white font-bold text-[10px] flex items-center gap-2 active:scale-95 transition-all shadow-lg font-sans"
                                >
                                    <Plus size={14} />
                                    <span>Add {isSlideType ? "Slide" : "Scene"}</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {(isSlideType ? slides : scenes).map((item: any, idx) => (
                                    <div key={item.id} className="bg-white/40 backdrop-blur-md rounded-[32px] border border-black/5 overflow-hidden">
                                        <div className="px-6 py-3 flex items-center justify-between border-b border-black/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-[13px] font-bold text-neutral-800 font-sans">{isSlideType ? (idx === 0 ? "Cover Slide" : `Slide ${idx + 1}`) : `Scene ${idx + 1}`}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isSlideType && <span className="text-[9px] font-bold text-neutral-400 bg-neutral-100/50 px-2 py-0.5 rounded-full font-sans uppercase">{item.duration || "5s"}</span>}
                                                <button onClick={() => isSlideType ? removeSlide(item.id) : removeScene(item.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <input
                                                placeholder={isSlideType ? "Slide Heading" : "Scene Title"}
                                                value={item.heading}
                                                className={clsx(InputStyles, "h-9 px-4 text-[13px]")}
                                                onChange={e => isSlideType ?
                                                    setSlides(s => s.map(x => x.id === item.id ? { ...x, heading: e.target.value } : x)) :
                                                    setScenes(s => s.map(x => x.id === item.id ? { ...x, heading: e.target.value } : x))
                                                }
                                            />
                                            <textarea
                                                placeholder={isSlideType ? "Slide content..." : "Script / Action description..."}
                                                className="w-full bg-white/40 border border-black/5 rounded-[24px] p-4 text-[13px] min-h-[80px] outline-none font-sans leading-relaxed"
                                                value={isSlideType ? item.content : item.description}
                                                onChange={e => isSlideType ?
                                                    setSlides(s => s.map(x => x.id === item.id ? { ...x, content: e.target.value } : x)) :
                                                    setScenes(s => s.map(x => x.id === item.id ? { ...x, description: e.target.value } : x))
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <Label>Main Caption</Label>
                            <textarea
                                placeholder="What's this post about?"
                                value={formData.caption}
                                onChange={(e) => setFormData(f => ({ ...f, caption: e.target.value }))}
                                className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-[32px] p-5 text-[14px] min-h-[140px] focus:bg-white focus:border-orange-200 outline-none transition-all shadow-sm shadow-black/[0.02] placeholder:text-neutral-300 font-sans leading-relaxed"
                            />
                        </div>

                        <div>
                            <Label>Hashtags</Label>
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-2 min-h-12 p-1">
                                    {hashtags.map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/5 text-[13px] font-bold text-neutral-800 shadow-sm font-sans">
                                            <span className="text-orange-500">#</span>{tag}
                                            <button onClick={() => removeHashtag(tag)} className="text-neutral-300 hover:text-red-500 transition-colors">×</button>
                                        </span>
                                    ))}
                                    {hashtags.length === 0 && <span className="text-neutral-300 text-[13px] font-medium p-2 font-sans">No tags added yet</span>}
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        placeholder="Add target tag..."
                                        value={hashtagInput}
                                        onChange={(e) => setHashtagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                                        className={InputStyles}
                                    />
                                    <button
                                        onClick={addHashtag}
                                        className="h-11 px-8 bg-neutral-900 text-white rounded-full font-bold text-[13px] active:scale-95 transition-all shadow-lg font-sans"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-10 pb-12 pt-4 flex gap-4 relative z-10 border-t border-black/5">
                    {postToEdit && onDelete && (
                        <button
                            onClick={() => { if (confirm("Delete this content?")) { onDelete(postToEdit.id); onClose(); } }}
                            className="bg-red-50 text-red-500 h-[56px] w-[56px] rounded-full flex items-center justify-center active:scale-95 transition-all border border-red-100/50"
                        >
                            <Trash2 size={22} />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-orange-500 text-white h-[56px] rounded-full font-bold text-[16px] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/30 border border-white/20 ring-1 ring-inset ring-white/10 font-sans"
                    >
                        {postToEdit ? "Update Content" : "Create Content"}
                    </button>
                </div>
            </div>
        </>
    );
}
